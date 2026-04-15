"""Risk API endpoints."""
import logging
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import get_settings
from app.services.db_service import RiskEventService, SystemStatusService, PositionService
from app.schemas.risk import RiskCheckRequest, RiskCheckResponse
from app.schemas.common import APIResponse
from app.core.risk.risk_manager import RiskManager, RiskParams, RiskCheckResult

router = APIRouter()
logger = logging.getLogger(__name__)

settings = get_settings()

# Initialize risk manager with settings
_risk_manager = RiskManager(
    params=RiskParams(
        gap_risk=settings.GAP_RISK,
        overnight_risk=settings.OVERNIGHT_RISK,
        max_drawdown=settings.MAX_DRAWDOWN,
        position_size=settings.POSITION_SIZE,
    )
)


@router.get("", response_model=APIResponse)
async def get_risk_info():
    """Get risk management information."""
    return APIResponse(
        success=True,
        message="Risk API",
        data={
            "risk_limits": {
                "gap_risk": settings.GAP_RISK,
                "overnight_risk": settings.OVERNIGHT_RISK,
                "max_drawdown": settings.MAX_DRAWDOWN,
                "position_size": settings.POSITION_SIZE,
            },
            "endpoints": {
                "GET /events": "Get recent risk events",
                "GET /positions": "Get open positions",
                "POST /check": "Check risk for a position",
            }
        }
    )


@router.get("/events", response_model=List[dict])
async def get_risk_events(
    limit: int = Query(50, ge=1, le=200),
    unacknowledged_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Get risk events from database."""
    if unacknowledged_only:
        events = RiskEventService.get_unacknowledged_events(db)
    else:
        events = RiskEventService.get_recent_events(db, limit=limit)

    return [
        {
            "id": e.id,
            "uuid": str(e.uuid),
            "event_type": e.event_type,
            "severity": e.severity,
            "symbol": e.symbol,
            "description": e.description,
            "details": e.details,
            "is_acknowledged": e.is_acknowledged,
            "acknowledged_at": e.acknowledged_at.isoformat() if e.acknowledged_at else None,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in events
    ]


@router.get("/positions", response_model=List[dict])
async def get_positions(
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
    db: Session = Depends(get_db)
):
    """Get open positions from database."""
    positions = PositionService.get_open_positions(db, symbol=symbol)
    return [
        {
            "id": p.id,
            "uuid": str(p.uuid),
            "symbol": p.symbol,
            "direction": p.direction,
            "quantity": p.quantity,
            "entry_price": p.entry_price,
            "current_price": p.current_price,
            "stop_loss": p.stop_loss,
            "take_profit": p.take_profit,
            "status": p.status,
            "strategy_id": p.strategy_id,
            "opened_at": p.opened_at.isoformat() if p.opened_at else None,
            "closed_at": p.closed_at.isoformat() if p.closed_at else None,
            "profit_loss": p.profit_loss,
            "commission": p.commission,
        }
        for p in positions
    ]


@router.get("/status", response_model=List[dict])
async def get_system_status(db: Session = Depends(get_db)):
    """Get system component status."""
    statuses = SystemStatusService.get_all_status(db)
    return [
        {
            "component": s.component,
            "status": s.status,
            "latency_ms": s.latency_ms,
            "last_check": s.last_check.isoformat() if s.last_check else None,
            "details": s.details,
        }
        for s in statuses
    ]


@router.post("/check", response_model=RiskCheckResponse)
async def check_risk(request: RiskCheckRequest):
    """Check risk for a position using RiskManager."""
    try:
        # Build order dict for RiskManager
        order = {
            "symbol": request.symbol,
            "direction": "BUY",  # Default direction
            "price": request.entry_price,
            "position_size": request.position_size / 100,  # Convert from % to fraction
            "timestamp": datetime.utcnow(),
        }

        # Get current equity (would come from account in real system)
        current_equity = 1.0  # Normalized to 1.0 (100%)

        # Run pre-trade risk check
        result = _risk_manager.pre_trade_check(
            order=order,
            current_equity=current_equity,
            current_volatility=None,  # Would be calculated from market data
            historical_volatility=None,  # Would be from historical data
        )

        # Map to response
        adjusted_position = (
            result.adjusted_position_size * 100 if result.adjusted_position_size else request.position_size
        )

        return RiskCheckResponse(
            allowed=result.allowed,
            risk_score=result.risk_score,
            gap_risk=settings.GAP_RISK * request.position_size,
            overnight_risk=settings.OVERNIGHT_RISK * request.position_size,
            max_drawdown=settings.MAX_DRAWDOWN * current_equity * 100,  # As percentage
            position_size=request.position_size,
            adjusted_position_size=adjusted_position,
            warnings=result.warnings,
        )

    except Exception as e:
        logger.error(f"Error checking risk: {e}")
        # Return conservative response on error
        return RiskCheckResponse(
            allowed=False,
            risk_score=1.0,
            gap_risk=settings.GAP_RISK * request.position_size,
            overnight_risk=settings.OVERNIGHT_RISK * request.position_size,
            max_drawdown=settings.MAX_DRAWDOWN * 100,
            position_size=request.position_size,
            adjusted_position_size=request.position_size * 0.5,
            warnings=["Risk check error - position rejected"],
        )
