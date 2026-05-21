import torch
import torch.nn as nn
import torch.nn.functional as F

class Attention(nn.Module):
    def __init__(self, hidden_dim):
        super(Attention, self).__init__()
        self.attention = nn.Linear(hidden_dim, 1)

    def forward(self, x):
        # x is (batch, seq_len, hidden_dim)
        scores = self.attention(x).squeeze(-1) # (batch, seq_len)
        alpha = F.softmax(scores, dim=-1) # (batch, seq_len)
        
        # apply weights
        out = torch.bmm(alpha.unsqueeze(1), x).squeeze(1) # (batch, hidden_dim)
        return out, alpha
        
class WaterQualityModel(nn.Module):
    def __init__(self, input_dim=4, seq_len=15, hidden_dim=64, num_layers=2, output_dim=4):
        """
        Model combining CNN, LSTM, and Attention.
        - input_dim: number of features (e.g., pH, DO, turb, temp = 4)
        - seq_len: lookback window length
        - output_dim: features to predict
        """
        super(WaterQualityModel, self).__init__()
        
        # 1. Signal Feature Extraction (Spatial features across parameters)
        # Input shape expected by Conv1d: (batch_size, channels, length)
        # So we permute before feeding to CNN
        self.conv1 = nn.Conv1d(in_channels=input_dim, out_channels=32, kernel_size=3, padding=1)
        self.relu = nn.ReLU()
        
        # 2. Temporal Learning (LSTM)
        # Input to LSTM: (batch, seq, features)
        self.lstm = nn.LSTM(input_size=32, hidden_size=hidden_dim, num_layers=num_layers, batch_first=True)
        
        # 3. Attention Mechanism
        self.attention = Attention(hidden_dim)
        
        # Final fully connected layer for prediction
        self.fc = nn.Linear(hidden_dim, output_dim)
        
    def forward(self, x):
        # x shape: (batch_size, seq_len, input_dim)
        
        # Permute for CNN: (batch_size, input_dim, seq_len)
        x_cnn = x.permute(0, 2, 1)
        
        # CNN layer
        c = self.conv1(x_cnn)
        c = self.relu(c)
        
        # Permute back for LSTM: (batch_size, seq_len, 32)
        c = c.permute(0, 2, 1)
        
        # LSTM layer
        lstm_out, (h_n, c_n) = self.lstm(c) # lstm_out: (batch, seq_len, hidden_dim)
        
        # Attention
        context, attn_weights = self.attention(lstm_out)
        
        # Prediction
        out = self.fc(context) # (batch, output_dim)
        return out

# Simple dummy training logic to ensure file execution
if __name__ == "__main__":
    # Test model shape
    model = WaterQualityModel(input_dim=4, seq_len=15, output_dim=4)
    dummy_input = torch.randn(8, 15, 4) # batch=8, seq=15, features=4
    output = model(dummy_input)
    print("Dummy Forward pass output shape:", output.shape)
    print("Model Architecture generated successfully.")
