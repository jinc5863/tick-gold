"""Risk schemas."""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class RiskCheckRequest(BaseModel):
    """Schema for risk check request."""
    symbol: str = Field(default="XAUUSD")
    position_size: float = Field(gt=0, le=1000, description="Position size in lots (0.01-1000)")
    entry_price: float = Field(gt=0, description="Entry price")
    current_price: Optional[float] = Field(default=None, gt=0)
    session: Optional[str] = Field(default=None)


class RiskCheckResponse(BaseModel):
    """Schema for risk check response."""
    allowed: bool
    risk_score: float
    gap_risk: float
    overnight_risk: float
    max_drawdown: float
    position_size: float
    adjusted_position_size: float
    warnings: list[str] = []
