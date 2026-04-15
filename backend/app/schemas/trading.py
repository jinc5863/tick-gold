"""Trading schemas."""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class OrderType(str, Enum):
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"


class OrderStatus(str, Enum):
    PENDING = "PENDING"
    FILLED = "FILLED"
    CANCELLED = "CANCELLED"
    REJECTED = "REJECTED"


class OrderRequest(BaseModel):
    symbol: str = Field(..., example="XAUUSD")
    direction: str = Field(..., pattern="^(BUY|SELL)$")
    order_type: OrderType = OrderType.MARKET
    volume: float = Field(..., gt=0)
    price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None


class OrderResponse(BaseModel):
    order_id: str
    status: OrderStatus
    filled_price: Optional[float] = None
    filled_volume: Optional[float] = None
    timestamp: datetime
    pnl: Optional[float] = None
