"""Factors API endpoints."""
import logging
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.exc import SQLAlchemyError
import pandas as pd

from app.config import get_settings
from app.models.factor import Factor, FactorValue
from app.models.tick import Tick
from app.schemas.factor import (
    FactorResponse,
    FactorAnalyzeRequest,
    FactorAnalyzeResponse,
    FactorValueResponse,
)
from app.schemas.common import APIResponse
from app.core.factors.library import FactorLibrary, get_factor_by_name
from app.core.factors.analyzer import FactorAnalyzer

router = APIRouter()
logger = logging.getLogger(__name__)

settings = get_settings()


def get_db_session() -> Optional[Session]:
    """Get database session if connection is available."""
    if not settings.DATABASE_URL:
        return None
    try:
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        return SessionLocal()
    except Exception as e:
        logger.warning(f"Database connection failed: {e}")
        return None


# Predefined factor catalog
FACTOR_CATALOG = [
    {"name": "momentum", "category": "price", "description": "Price momentum over period"},
    {"name": "reversal", "category": "price", "description": "Short-term reversal"},
    {"name": "log_return", "category": "price", "description": "Logarithmic returns"},
    {"name": "volatility", "category": "volatility", "description": "Historical volatility"},
    {"name": "atr", "category": "volatility", "description": "Average True Range"},
    {"name": "rsi", "category": "momentum", "description": "Relative Strength Index"},
    {"name": "macd", "category": "momentum", "description": "MACD indicator"},
    {"name": "sma", "category": "trend", "description": "Simple Moving Average"},
    {"name": "ema", "category": "trend", "description": "Exponential Moving Average"},
    {"name": "price_vs_sma", "category": "trend", "description": "Price relative to SMA"},
    {"name": "stochastic", "category": "momentum", "description": "Stochastic Oscillator"},
    {"name": "cci", "category": "momentum", "description": "Commodity Channel Index"},
    {"name": "williams_r", "category": "momentum", "description": "Williams %R"},
    {"name": "bollinger_position", "category": "volatility", "description": "Bollinger Band position"},
    {"name": "z_score", "category": "statistical", "description": "Z-Score standardized price"},
    {"name": "percentile_rank", "category": "statistical", "description": "Percentile rank"},
    {"name": "spread_normalized", "category": "liquidity", "description": "Normalized spread in bps"},
    {"name": "bid_ask_imbalance", "category": "liquidity", "description": "Order book imbalance"},
    {"name": "volume_ratio", "category": "volume", "description": "Volume ratio to average"},
    {"name": "vwap", "category": "volume", "description": "Volume Weighted Average Price"},
]


@router.get("", response_model=list[FactorResponse])
async def get_factors():
    """Get all available factors from the catalog."""
    # Return factor catalog as response
    factors = []
    for i, factor in enumerate(FACTOR_CATALOG, 1):
        factors.append(FactorResponse(
            id=i,
            name=factor["name"],
            description=factor["description"],
            category=factor["category"],
            parameters=None,
            created_at=datetime.utcnow(),
        ))
    return factors


@router.get("/{factor_id}", response_model=FactorResponse)
async def get_factor(factor_id: int):
    """Get factor by ID."""
    if factor_id < 1 or factor_id > len(FACTOR_CATALOG):
        raise HTTPException(status_code=404, detail="Factor not found")

    factor = FACTOR_CATALOG[factor_id - 1]
    return FactorResponse(
        id=factor_id,
        name=factor["name"],
        description=factor["description"],
        category=factor["category"],
        parameters=None,
        created_at=datetime.utcnow(),
    )


@router.post("/analyze", response_model=FactorAnalyzeResponse)
async def analyze_factor(request: FactorAnalyzeRequest):
    """Analyze a factor using FactorLibrary and FactorAnalyzer."""
    try:
        # Get factor function
        factor_func = get_factor_by_name(request.factor_name)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown factor: {request.factor_name}")

    session = get_db_session()

    if session is None:
        # Demo mode - return simulated analysis
        return FactorAnalyzeResponse(
            factor_name=request.factor_name,
            stats={
                "ic": 0.05,
                "rank_ic": 0.06,
                "ic_ir": 0.8,
                "mean_ic": 0.05,
                "positive_ic_ratio": 0.65,
                "n_observations": 1000,
            },
            values=[
                FactorValueResponse(
                    factor_id=1,
                    timestamp=datetime.utcnow(),
                    value=0.5,
                )
            ],
        )

    try:
        # Build query for tick data
        query = select(Tick).where(Tick.symbol == "XAUUSD")
        if request.start_time:
            query = query.where(Tick.timestamp >= request.start_time)
        if request.end_time:
            query = query.where(Tick.timestamp <= request.end_time)
        query = query.order_by(Tick.timestamp.asc()).limit(5000)

        result = session.execute(query)
        ticks = result.scalars().all()

        if len(ticks) < 30:
            return FactorAnalyzeResponse(
                factor_name=request.factor_name,
                stats={"error": "Insufficient data for analysis (minimum 30 ticks required)"},
                values=[],
            )

        # Create price series
        df = pd.DataFrame([
            {
                "timestamp": t.timestamp,
                "bid": t.bid,
                "ask": t.ask,
            }
            for t in ticks
        ])
        df.set_index("timestamp", inplace=True)
        df["mid"] = (df["bid"] + df["ask"]) / 2
        prices = df["mid"]

        # Calculate factor values
        try:
            if request.factor_name == "macd":
                macd_line, signal_line, histogram = factor_func(prices)
                factor_values = macd_line
            elif request.factor_name == "stochastic":
                # For stochastic, we need high/low/close - approximate with bid/ask/mid
                k, d = factor_func(prices, prices, prices)
                factor_values = k
            elif request.factor_name in ["atr", "garman_klass_volatility", "parkinson_volatility"]:
                # These need high/low/close - approximate
                factor_values = factor_func(prices, prices, prices)
            else:
                factor_values = factor_func(prices)
        except Exception as e:
            logger.error(f"Error calculating factor {request.factor_name}: {e}")
            raise HTTPException(status_code=400, detail=f"Factor calculation failed: {str(e)}")

        # Calculate forward returns for IC analysis
        forward_returns = prices.pct_change().shift(-1)

        # Run factor analysis
        analyzer = FactorAnalyzer(min_periods=30)
        ic = analyzer.calculate_ic(factor_values, forward_returns)
        rank_ic = analyzer.calculate_rank_ic(factor_values, forward_returns)
        ic_analysis = analyzer.analyze_ic_series(factor_values, forward_returns)

        # Prepare values for response
        valid_mask = ~(factor_values.isna() | forward_returns.isna())
        factor_values_clean = factor_values[valid_mask]
        timestamps = factor_values_clean.index

        values = [
            FactorValueResponse(
                factor_id=1,
                timestamp=ts,
                value=float(factor_values_clean.loc[ts]),
            )
            for ts in timestamps[:100]  # Limit to 100 values
        ]

        return FactorAnalyzeResponse(
            factor_name=request.factor_name,
            stats={
                "ic": float(ic),
                "rank_ic": float(rank_ic),
                "ic_ir": float(ic_analysis.get("ic_ir", 0)),
                "mean_ic": float(ic_analysis.get("mean_ic", 0)),
                "positive_ic_ratio": float(ic_analysis.get("positive_ic_ratio", 0)),
                "n_observations": len(factor_values_clean),
            },
            values=values,
        )

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error during factor analysis: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        logger.error(f"Error analyzing factor: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
    finally:
        session.close()
