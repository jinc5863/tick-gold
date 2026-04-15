"""Strategy API endpoints."""
import logging
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.db_service import StrategyService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=List[dict])
async def get_strategies(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db)
):
    """Get all strategies from the database."""
    strategies = StrategyService.get_all_strategies(db, is_active=is_active)
    return [
        {
            "id": s.id,
            "uuid": str(s.uuid),
            "name": s.name,
            "description": s.description,
            "strategy_type": s.strategy_type,
            "timeframe": s.timeframe,
            "parameters": s.parameters,
            "factors": s.factors,
            "entry_conditions": s.entry_conditions,
            "exit_conditions": s.exit_conditions,
            "is_active": s.is_active,
            "is_running": s.is_running,
            "total_trades": s.total_trades,
            "win_rate": s.win_rate,
            "avg_profit": s.avg_profit,
            "max_drawdown": s.max_drawdown,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in strategies
    ]


@router.get("/{strategy_id}", response_model=dict)
async def get_strategy(strategy_id: int, db: Session = Depends(get_db)):
    """Get strategy by ID."""
    strategy = StrategyService.get_strategy_by_id(db, strategy_id)
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    return {
        "id": strategy.id,
        "uuid": str(strategy.uuid),
        "name": strategy.name,
        "description": strategy.description,
        "strategy_type": strategy.strategy_type,
        "timeframe": strategy.timeframe,
        "parameters": strategy.parameters,
        "factors": strategy.factors,
        "entry_conditions": strategy.entry_conditions,
        "exit_conditions": strategy.exit_conditions,
        "is_active": strategy.is_active,
        "is_running": strategy.is_running,
        "total_trades": strategy.total_trades,
        "win_rate": strategy.win_rate,
        "avg_profit": strategy.avg_profit,
        "max_drawdown": strategy.max_drawdown,
        "created_at": strategy.created_at.isoformat() if strategy.created_at else None,
        "updated_at": strategy.updated_at.isoformat() if strategy.updated_at else None,
    }


@router.get("/types/", response_model=List[str])
async def get_strategy_types():
    """Get all unique strategy types."""
    return ["trend_following", "mean_reversion", "breakout", "momentum", "arbitrage"]


@router.get("/timeframes/", response_model=List[str])
async def get_timeframes():
    """Get all available timeframes."""
    return ["M1", "M5", "M15", "M30", "H1", "H4", "D1"]
