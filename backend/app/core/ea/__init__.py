"""EA core package."""
from app.core.ea.strategy_generator import (
    EAStrategyGenerator,
    StrategyConfig,
    Signal,
    MarketData,
    create_default_strategy,
)

__all__ = [
    "EAStrategyGenerator",
    "StrategyConfig",
    "Signal",
    "MarketData",
    "create_default_strategy",
]
