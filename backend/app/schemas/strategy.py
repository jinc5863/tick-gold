"""Strategy schemas."""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict


class StrategyParameter(BaseModel):
    """Strategy parameter schema."""
    name: str
    value: float
    min_value: Optional[float] = None
    max_value: Optional[float] = None


class BacktestRequest(BaseModel):
    """Schema for backtest request."""
    strategy_name: str
    start_time: datetime
    end_time: datetime
    parameters: List[StrategyParameter] = []
    initial_capital: float = 100000.0


class BacktestTrade(BaseModel):
    """Schema for a single trade."""
    entry_time: datetime
    exit_time: datetime
    entry_price: float
    exit_price: float
    position_size: float
    pnl: float
    pnl_pct: float


class BacktestResponse(BaseModel):
    """Schema for backtest response."""
    strategy_name: str
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    total_pnl: float
    total_pnl_pct: float
    max_drawdown: float
    sharpe_ratio: float
    trades: List[BacktestTrade]
