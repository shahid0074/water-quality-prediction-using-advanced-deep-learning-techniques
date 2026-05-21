import pandas as pd
import numpy as np
import os

def generate_synthetic_data(num_days=365):
    """
    Generate synthetic water quality time series data.
    """
    np.random.seed(42)
    dates = pd.date_range(start="2022-01-01", periods=num_days, freq="D")
    
    # Base values
    base_ph = 7.0
    base_do = 8.0 # Dissolved oxygen
    base_turb = 15.0 # Turbidity
    base_temp = 20.0
    
    # Generate random walks
    ph = base_ph + np.cumsum(np.random.normal(0, 0.05, num_days))
    # Ensure physical limits
    ph = np.clip(ph, 0, 14)
    
    do = base_do + np.cumsum(np.random.normal(0, 0.1, num_days)) + np.sin(np.linspace(0, 10, num_days)) * 2
    do = np.clip(do, 0, 20)
    
    turb = base_turb + np.cumsum(np.random.normal(0, 0.5, num_days)) + np.random.exponential(1, num_days) * 2
    turb = np.clip(turb, 0, 100)
    
    temp = base_temp + np.sin(np.linspace(0, 2 * np.pi, num_days)) * 10 + np.random.normal(0, 1, num_days)
    
    df = pd.DataFrame({
        "Date": dates,
        "ph": ph,
        "do": do,
        "turbidity": turb,
        "temp": temp
    })
    
    # Optional: add typical noise / missing data to mimic real scenarios
    for col in ["ph", "do", "turbidity", "temp"]:
        noise = np.random.normal(0, np.std(df[col])*0.05, num_days)
        df[col] = df[col] + noise
        
    return df

if __name__ == "__main__":
    df = generate_synthetic_data(1000)
    os.makedirs("data", exist_ok=True)
    df.to_csv("data/water_quality.csv", index=False)
    print("Synthetic data generated and saved to data/water_quality.csv")
