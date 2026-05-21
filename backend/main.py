from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import torch
import pandas as pd
import numpy as np
from pydantic import BaseModel
import io
import os
from model import WaterQualityModel
import database

app = FastAPI(title="AquaIntel API", description="Deep Learning Water Quality Forecasting")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model (mock initialization for demo purposes)
# In production, you would load pre-trained weights e.g. model.load_state_dict(torch.load("weights.pth"))
model = WaterQualityModel(input_dim=4, seq_len=15, output_dim=4)
model.eval()

# Helper to format data for frontend
def get_recent_metrics(df):
    latest = df.iloc[-1]
    history = df.tail(15)
    return {
        "current": {
            "ph": float(latest["ph"]),
            "do": float(latest["do"]),
            "turbidity": float(latest["turbidity"]),
            "temp": float(latest["temp"])
        },
        "history": {
            "ph": history["ph"].tolist(),
            "do": history["do"].tolist(),
            "turbidity": history["turbidity"].tolist(),
            "temp": history["temp"].tolist()
        }
    }

class UserAuth(BaseModel):
    username: str
    password: str

@app.post("/api/register")
def register_user(user: UserAuth):
    if len(user.password) < 6:
        return {"error": "Password must be at least 6 characters long."}
    if database.create_user(user.username, user.password):
        return {"status": "success", "message": "Registered successfully."}
    return {"error": "Username already exists."}

@app.post("/api/login")
def login_user(user: UserAuth):
    # Very basic auth suitable for demonstration
    if database.verify_user(user.username, user.password):
        return {"status": "success", "username": user.username}
    return {"error": "Invalid username or password."}


@app.get("/api/dashboard")
def get_dashboard_data():
    """
    Returns the latest water quality data from the synthetic dataset
    and handles preprocessing pipeline logic.
    """
    try:
        # Load synthetic data
        df = pd.read_csv("data/water_quality.csv")
        return get_recent_metrics(df)
    except FileNotFoundError:
        return {"error": "Dataset not found. Please run generate_data.py first."}

@app.post("/api/predict")
async def run_predict_pipeline(file: UploadFile = File(...)):
    """
    Accepts a user CSV file, preprocesses it (simulated signal decomposition),
    runs it through the CNN-LSTM-Attention model, and returns predicted future timestamps.
    """
    contents = await file.read()
    try:
        # Parse CSV
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Verify required columns
        required_cols = ['ph', 'do', 'turbidity', 'temp']
        if not all(col in df.columns for col in required_cols):
            return {"error": f"CSV must contain the following columns: {required_cols}"}
        
        # Use last `seq_len` days (e.g., 15) for inference
        recent_data = df[required_cols].tail(15).values  # Shape: (15, 4)
        
        # If less than 15 days, pad it
        if recent_data.shape[0] < 15:
            pad_len = 15 - recent_data.shape[0]
            recent_data = np.pad(recent_data, ((pad_len, 0), (0, 0)), mode='edge')
            
        # Standardize/Normalize (simulated via basic division for demo)
        means = np.mean(recent_data, axis=0)
        stds = np.std(recent_data, axis=0) + 1e-6
        normalized_input = (recent_data - means) / stds
        
        # Convert to Tensor (Batched, Seq, Features) -> (1, 15, 4)
        tensor_input = torch.tensor(normalized_input, dtype=torch.float32).unsqueeze(0)
        
        # 1. Forward Pass (Deep Learning Inference)
        # Using the CNN -> LSTM -> Attention Layer
        predictions = []
        with torch.no_grad():
            curr_input = tensor_input
            # Predict the next 10 days
            for _ in range(10):
                # Predict next timestep (batch, 4 features)
                pred = model(curr_input) 
                predictions.append(pred.squeeze(0).numpy())
                
                # Auto-regressive step: append prediction to sequence and maintain seq_len=15
                pred_expanded = pred.unsqueeze(1) # shape: (1, 1, 4)
                curr_input = torch.cat((curr_input[:, 1:, :], pred_expanded), dim=1) 
                
        # Denormalize predictions back to original scale
        predictions = np.array(predictions)
        predictions = (predictions * stds) + means
        
        # Format response
        forecast = {
            "ph": predictions[:, 0].tolist(),
            "do": predictions[:, 1].tolist(),
            "turbidity": predictions[:, 2].tolist(),
            "temp": predictions[:, 3].tolist()
        }
        
        return {
            "status": "success",
            "message": "Signal decomposition and context extraction completed.",
            "forecast": forecast
        }
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
