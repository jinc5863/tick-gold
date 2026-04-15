"""Database initialization script for Tick Gold."""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.config import get_settings
from app.models import Base
from app.models.database import (
    Factor,
    Strategy,
    SystemStatus,
)


def init_database():
    """Initialize the database with tables and initial data."""
    settings = get_settings()

    # Create engine
    engine = create_engine(
        settings.DATABASE_URL,
        echo=True,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )

    # Create all tables
    print("Creating database tables...")
    Base.metadata.create_all(engine)
    print("Tables created successfully!")

    # Create session
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Check if we already have data
        existing_factors = session.query(Factor).count()
        if existing_factors > 0:
            print(f"Database already has {existing_factors} factors. Skipping seed data.")
        else:
            # Seed initial factors
            print("Seeding initial factors...")
            seed_factors = [
                Factor(
                    name="rsi_14",
                    display_name="RSI (14)",
                    category="momentum",
                    description="Relative Strength Index with 14 periods",
                    formula="RSI = 100 - (100 / (1 + RS))",
                    parameters={"period": 14, "overbought": 70, "oversold": 30},
                    is_active=True,
                    effectiveness_score=0.75,
                ),
                Factor(
                    name="macd_12_26_9",
                    display_name="MACD (12,26,9)",
                    category="trend",
                    description="Moving Average Convergence Divergence",
                    formula="MACD = EMA12 - EMA26, Signal = EMA9(MACD)",
                    parameters={"fast": 12, "slow": 26, "signal": 9},
                    is_active=True,
                    effectiveness_score=0.72,
                ),
                Factor(
                    name="bollinger_20_2",
                    display_name="Bollinger Bands (20,2)",
                    category="volatility",
                    description="Bollinger Bands with 20 period and 2 standard deviations",
                    formula="Middle = SMA20, Upper = Middle + 2*STD, Lower = Middle - 2*STD",
                    parameters={"period": 20, "std_dev": 2},
                    is_active=True,
                    effectiveness_score=0.68,
                ),
                Factor(
                    name="atr_14",
                    display_name="ATR (14)",
                    category="volatility",
                    description="Average True Range with 14 periods",
                    formula="ATR = SMA(14) of True Range",
                    parameters={"period": 14},
                    is_active=True,
                    effectiveness_score=0.65,
                ),
                Factor(
                    name="adx_14",
                    display_name="ADX (14)",
                    category="trend",
                    description="Average Directional Index",
                    formula="ADX = 100 * EMA(|DI+ - DI-| / (DI+ + DI-|))",
                    parameters={"period": 14, "trend_threshold": 25},
                    is_active=True,
                    effectiveness_score=0.70,
                ),
                Factor(
                    name="volume_profile",
                    display_name="Volume Profile",
                    category="volume",
                    description="Volume weighted price levels",
                    formula="VP = Price * Volume at each level",
                    parameters={"bins": 50},
                    is_active=True,
                    effectiveness_score=0.62,
                ),
                Factor(
                    name="vwap",
                    display_name="VWAP",
                    category="volume",
                    description="Volume Weighted Average Price",
                    formula="VWAP = Sum(Price * Volume) / Sum(Volume)",
                    parameters={"reset": "session"},
                    is_active=True,
                    effectiveness_score=0.78,
                ),
                Factor(
                    name="stoch_14_3",
                    display_name="Stochastic (14,3)",
                    category="momentum",
                    description="Stochastic Oscillator",
                    formula="%K = 100 * (C - L14) / (H14 - L14), %D = SMA3(%K)",
                    parameters={"k_period": 14, "d_period": 3, "overbought": 80, "oversold": 20},
                    is_active=True,
                    effectiveness_score=0.66,
                ),
            ]

            for factor in seed_factors:
                session.add(factor)

            # Seed initial strategies
            print("Seeding initial strategies...")
            seed_strategies = [
                Strategy(
                    name="趋势跟踪 M1",
                    description="基于MACD和ADX的趋势跟踪策略",
                    strategy_type="trend_following",
                    timeframe="M1",
                    parameters={
                        "macd_fast": 12,
                        "macd_slow": 26,
                        "macd_signal": 9,
                        "adx_threshold": 25,
                    },
                    factors=[],
                    entry_conditions={
                        "macd_cross": "bullish",
                        "adx_above": 25,
                    },
                    exit_conditions={
                        "macd_cross": "bearish",
                        "stop_loss_pct": 0.5,
                        "take_profit_pct": 1.0,
                    },
                    is_active=True,
                    is_running=False,
                ),
                Strategy(
                    name="均值回归 M5",
                    description="基于布林带的均值回归策略",
                    strategy_type="mean_reversion",
                    timeframe="M5",
                    parameters={
                        "bollinger_period": 20,
                        "bollinger_std": 2,
                        "rsi_oversold": 30,
                        "rsi_overbought": 70,
                    },
                    factors=[],
                    entry_conditions={
                        "price_lower_band": True,
                        "rsi_oversold": True,
                    },
                    exit_conditions={
                        "price_middle_band": True,
                        "rsi_overbought": True,
                    },
                    is_active=True,
                    is_running=False,
                ),
            ]

            for strategy in seed_strategies:
                session.add(strategy)

            # Seed system status
            print("Seeding system status...")
            system_components = [
                SystemStatus(component="database", status="healthy", latency_ms=0),
                SystemStatus(component="redis", status="healthy", latency_ms=0),
                SystemStatus(component="mt4", status="disconnected", latency_ms=0),
                SystemStatus(component="mt5", status="disconnected", latency_ms=0),
                SystemStatus(component="ibkr", status="disconnected", latency_ms=0),
            ]

            for component in system_components:
                session.add(component)

            session.commit()
            print("Seed data inserted successfully!")

    except Exception as e:
        session.rollback()
        print(f"Error seeding data: {e}")
        raise
    finally:
        session.close()

    print("\nDatabase initialization complete!")
    print(f"Database URL: {settings.DATABASE_URL}")


if __name__ == "__main__":
    init_database()
