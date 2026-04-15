"""Strategy API endpoints."""
import logging
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.exc import SQLAlchemyError
import pandas as pd
import numpy as np

from app.config import get_settings
from app.models.tick import Tick
from app.schemas.strategy import (
    BacktestRequest,
    BacktestResponse,
    BacktestTrade,
    StrategyParameter,
)
from app.core.factors.library import FactorLibrary

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


@router.post("/backtest", response_model=BacktestResponse)
async def backtest_strategy(request: BacktestRequest):
    """Run a simple backtest using historical tick data."""
    session = get_db_session()

    if session is None:
        # Demo mode - return simulated backtest
        return BacktestResponse(
            strategy_name=request.strategy_name,
            total_trades=10,
            winning_trades=6,
            losing_trades=4,
            win_rate=0.6,
            total_pnl=1250.0,
            total_pnl_pct=1.25,
            max_drawdown=0.5,
            sharpe_ratio=1.5,
            trades=[
                BacktestTrade(
                    entry_time=datetime.utcnow(),
                    exit_time=datetime.utcnow(),
                    entry_price=2344.50,
                    exit_price=2345.00,
                    position_size=1.0,
                    pnl=50.0,
                    pnl_pct=0.5,
                )
            ],
        )

    try:
        # Build query for tick data
        query = select(Tick).where(Tick.symbol == "XAUUSD")
        query = query.where(Tick.timestamp >= request.start_time)
        query = query.where(Tick.timestamp <= request.end_time)
        query = query.order_by(Tick.timestamp.asc())

        result = session.execute(query)
        ticks = result.scalars().all()

        if len(ticks) < 100:
            return BacktestResponse(
                strategy_name=request.strategy_name,
                total_trades=0,
                winning_trades=0,
                losing_trades=0,
                win_rate=0.0,
                total_pnl=0.0,
                total_pnl_pct=0.0,
                max_drawdown=0.0,
                sharpe_ratio=0.0,
                trades=[],
            )

        # Create DataFrame
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
        df["returns"] = df["mid"].pct_change()

        # Extract strategy parameters
        param_dict = {p.name: p.value for p in request.parameters}
        fast_ma = int(param_dict.get("fast_ma", 10))
        slow_ma = int(param_dict.get("slow_ma", 30))

        # Calculate moving averages
        df["fast_ma"] = df["mid"].rolling(fast_ma).mean()
        df["slow_ma"] = df["mid"].rolling(slow_ma).mean()

        # Generate signals
        df["signal"] = 0
        df.loc[df["fast_ma"] > df["slow_ma"], "signal"] = 1  # Long
        df.loc[df["fast_ma"] < df["slow_ma"], "signal"] = -1  # Short

        # Detect signal changes (entry/exit points)
        df["position"] = df["signal"].shift(1).fillna(0)

        # Find trades
        trades: List[BacktestTrade] = []
        entry_price = 0.0
        entry_time = None
        position_size = param_dict.get("position_size", 1.0)
        position_value = request.initial_capital * (position_size / 100)

        equity = request.initial_capital
        equity_curve = [equity]
        peak_equity = equity

        for i in range(1, len(df)):
            if df["position"].iloc[i] != 0 and df["position"].iloc[i-1] == 0:
                # Entry
                entry_price = df["mid"].iloc[i]
                entry_time = df.index[i]
            elif df["position"].iloc[i] == 0 and df["position"].iloc[i-1] != 0:
                # Exit
                if entry_price > 0:
                    exit_price = df["mid"].iloc[i]
                    exit_time = df.index[i]
                    direction = 1 if df["position"].iloc[i-1] > 0 else -1

                    if direction > 0:  # Long
                        pnl_pct = (exit_price - entry_price) / entry_price
                    else:  # Short
                        pnl_pct = (entry_price - exit_price) / entry_price

                    pnl = position_value * pnl_pct
                    equity += pnl
                    equity_curve.append(equity)

                    if equity > peak_equity:
                        peak_equity = equity

                    trades.append(BacktestTrade(
                        entry_time=entry_time,
                        exit_time=exit_time,
                        entry_price=entry_price,
                        exit_price=exit_price,
                        position_size=position_size,
                        pnl=pnl,
                        pnl_pct=pnl_pct * 100,
                    ))

                    entry_price = 0.0

        # Calculate statistics
        total_trades = len(trades)
        if total_trades == 0:
            return BacktestResponse(
                strategy_name=request.strategy_name,
                total_trades=0,
                winning_trades=0,
                losing_trades=0,
                win_rate=0.0,
                total_pnl=0.0,
                total_pnl_pct=0.0,
                max_drawdown=0.0,
                sharpe_ratio=0.0,
                trades=[],
            )

        winning_trades = sum(1 for t in trades if t.pnl > 0)
        losing_trades = sum(1 for t in trades if t.pnl <= 0)
        win_rate = winning_trades / total_trades

        total_pnl = sum(t.pnl for t in trades)
        total_pnl_pct = (total_pnl / request.initial_capital) * 100

        # Calculate max drawdown
        running_max = 0.0
        max_drawdown = 0.0
        for eq in equity_curve:
            if eq > running_max:
                running_max = eq
            drawdown = (running_max - eq) / running_max if running_max > 0 else 0
            if drawdown > max_drawdown:
                max_drawdown = drawdown

        # Calculate Sharpe ratio
        if len(trades) > 1:
            returns = [t.pnl_pct / 100 for t in trades]
            mean_return = np.mean(returns)
            std_return = np.std(returns)
            if std_return > 0:
                sharpe_ratio = (mean_return / std_return) * np.sqrt(252)  # Annualized
            else:
                sharpe_ratio = 0.0
        else:
            sharpe_ratio = 0.0

        return BacktestResponse(
            strategy_name=request.strategy_name,
            total_trades=total_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            win_rate=win_rate,
            total_pnl=total_pnl,
            total_pnl_pct=total_pnl_pct,
            max_drawdown=max_drawdown * 100,
            sharpe_ratio=sharpe_ratio,
            trades=trades[:100],  # Limit to 100 trades
        )

    except SQLAlchemyError as e:
        logger.error(f"Database error during backtest: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    except Exception as e:
        logger.error(f"Error running backtest: {e}")
        raise HTTPException(status_code=500, detail=f"Backtest failed: {str(e)}")
    finally:
        session.close()
