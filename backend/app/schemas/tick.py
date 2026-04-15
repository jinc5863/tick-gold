"""Tick data schemas."""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class TickBase(BaseModel):
    """Base tick schema."""
    symbol: str = Field(default="XAUUSD")
    bid: float
    ask: float
    bid_size: int = 0
    ask_size: int = 0
    volume: float = 0.0


class TickCreate(TickBase):
    """Schema for creating a tick."""
    timestamp: datetime


class TickResponse(TickBase):
    """Schema for tick response."""
    id: int
    timestamp: datetime
    is_valid: int
    session: Optional[str] = None
    volatility_bucket: Optional[str] = None

    class Config:
        from_attributes = True


class TickListResponse(BaseModel):
    """Schema for tick list response."""
    total: int
    ticks: List[TickResponse]


class DataImportRequest(BaseModel):
    """Schema for data import request."""
    file_path: str
    symbol: str = "XAUUSD"


class DataCleanRequest(BaseModel):
    """Schema for data clean request."""
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    symbol: str = "XAUUSD"
