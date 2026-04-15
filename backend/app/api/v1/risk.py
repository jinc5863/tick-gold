"""Risk API endpoints."""
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
import numpy as np

from app.config import get_settings
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
                "POST /check": "Check risk for a position",
            }
        }
    )


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
