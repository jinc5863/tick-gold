"""
Tick data cleaning engine.

Integrates:
- VolatilityTracker: Tracks volatility anomalies
- SessionDetector: Detects trading sessions (asian, london, newyork)
- TickCleaner: Cleans individual tick data
- BatchCleaner: Batch cleans tick data
"""
from dataclasses import dataclass, field
from datetime import datetime, time
from typing import Optional, List
import pandas as pd
import numpy as np


@dataclass
class VolatilityTracker:
    """Tracks volatility and detects anomalies."""

    window_size: int = 100
    volatility_threshold: float = 2.5
    spread_threshold: float = 0.5  # times normal spread

    _prices: List[float] = field(default_factory=list)
    _spreads: List[float] = field(default_factory=list)

    def update(self, bid: float, ask: float, timestamp: datetime) -> bool:
        """
        Update tracker with new tick.
        Returns True if tick is within normal volatility.
        """
        spread = ask - bid
        mid_price = (bid + ask) / 2

        self._prices.append(mid_price)
        self._spreads.append(spread)

        # Keep window size
        if len(self._prices) > self.window_size:
            self._prices.pop(0)
            self._spreads.pop(0)

        return self.is_normal(mid_price, spread)

    def is_normal(self, price: float, spread: float) -> bool:
        """Check if price and spread are within normal range."""
        if len(self._prices) < 10:
            return True

        prices_array = np.array(self._prices)
        spreads_array = np.array(self._spreads)

        # Check price volatility
        mean_price = np.mean(prices_array)
        std_price = np.std(prices_array)
        if std_price > 0:
            z_score = abs(price - mean_price) / std_price
            if z_score > self.volatility_threshold:
                return False

        # Check spread
        mean_spread = np.mean(spreads_array)
        if spread > mean_spread * self.spread_threshold:
            return False

        return True

    def reset(self):
        """Reset tracker state."""
        self._prices.clear()
        self._spreads.clear()


@dataclass
class SessionDetector:
    """Detects trading sessions."""

    # Session times (UTC)
    ASIAN_START: time = field(default_factory=lambda: time(0, 0))
    ASIAN_END: time = field(default_factory=lambda: time(8, 0))
    LONDON_START: time = field(default_factory=lambda: time(8, 0))
    LONDON_END: time = field(default_factory=lambda: time(16, 0))
    NEWYORK_START: time = field(default_factory=lambda: time(13, 0))
    NEWYORK_END: time = field(default_factory=lambda: time(21, 0))

    def detect(self, timestamp: datetime) -> str:
        """Detect session for given timestamp."""
        t = timestamp.time()

        if self.ASIAN_START <= t < self.ASIAN_END:
            return "asian"
        elif self.LONDON_START <= t < self.LONDON_END:
            return "london"
        elif self.NEWYORK_START <= t < self.NEWYORK_END:
            return "newyork"
        else:
            return "offhours"

    def get_volatility_bucket(self, timestamp: datetime) -> str:
        """Get volatility bucket based on time of day."""
        session = self.detect(timestamp)
        if session == "asian":
            return "low"
        elif session == "london":
            return "high"
        elif session == "newyork":
            return "high"
        else:
            return "very_low"


@dataclass
class TickCleaner:
    """Cleans individual tick data."""

    volatility_tracker: VolatilityTracker
    session_detector: SessionDetector

    # Price bounds (for XAUUSD)
    min_price: float = 0.0
    max_price: float = 10000.0
    max_spread: float = 100.0

    def clean(
        self,
        timestamp: datetime,
        bid: float,
        ask: float,
        bid_size: int = 0,
        ask_size: int = 0,
        volume: float = 0.0,
    ) -> Optional[dict]:
        """
        Clean a single tick.
        Returns cleaned tick dict or None if invalid.
        """
        # Check price bounds
        if bid < self.min_price or ask > self.max_price:
            return None

        # Check spread
        spread = ask - bid
        if spread > self.max_spread or spread < 0:
            return None

        # Check volatility
        if not self.volatility_tracker.update(bid, ask, timestamp):
            return None

        # Detect session
        session = self.session_detector.detect(timestamp)
        volatility_bucket = self.session_detector.get_volatility_bucket(timestamp)

        return {
            "timestamp": timestamp,
            "bid": bid,
            "ask": ask,
            "bid_size": bid_size,
            "ask_size": ask_size,
            "volume": volume,
            "is_valid": 1,
            "session": session,
            "volatility_bucket": volatility_bucket,
        }


@dataclass
class BatchCleaner:
    """Batch cleans tick data."""

    tick_cleaner: TickCleaner

    def clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean a DataFrame of tick data using vectorized operations.

        Expected columns: timestamp, bid, ask, bid_size, ask_size, volume
        """
        if df.empty:
            return pd.DataFrame()

        # Vectorized price bounds check
        valid_mask = (
            (df["bid"] >= self.tick_cleaner.min_price) &
            (df["ask"] <= self.tick_cleaner.max_price)
        )

        # Vectorized spread check
        spread = df["ask"] - df["bid"]
        valid_mask &= (spread <= self.tick_cleaner.max_spread) & (spread >= 0)

        # Apply volatility tracking (still needs iteration but with numpy arrays)
        prices = ((df["bid"] + df["ask"]) / 2).values
        spreads = spread.values

        volatility_ok = self._vectorized_volatility_check(prices, spreads)

        valid_mask &= volatility_ok

        # Filter valid rows
        valid_df = df[valid_mask].copy()

        if valid_df.empty:
            return pd.DataFrame()

        # Add session and volatility_bucket
        timestamps = pd.to_datetime(valid_df["timestamp"])
        valid_df["session"] = timestamps.apply(self.tick_cleaner.session_detector.detect)
        valid_df["volatility_bucket"] = timestamps.apply(
            self.tick_cleaner.session_detector.get_volatility_bucket
        )
        valid_df["is_valid"] = 1

        return valid_df

    def _vectorized_volatility_check(
        self, prices: np.ndarray, spreads: np.ndarray
    ) -> np.ndarray:
        """
        Vectorized volatility check using numpy operations.
        Returns boolean array indicating which ticks pass volatility check.
        """
        n = len(prices)
        result = np.ones(n, dtype=bool)

        price_window = np.zeros(self.tick_cleaner.volatility_tracker.window_size)
        spread_window = np.zeros(self.tick_cleaner.volatility_tracker.window_size)
        window_idx = 0
        window_count = 0

        for i in range(n):
            if window_count >= self.tick_cleaner.volatility_tracker.window_size:
                window_count = self.tick_cleaner.volatility_tracker.window_size

            if window_count >= 10:
                mean_price = np.mean(price_window[:window_count])
                std_price = np.std(price_window[:window_count])
                if std_price > 0:
                    z_score = abs(prices[i] - mean_price) / std_price
                    if z_score > self.tick_cleaner.volatility_tracker.volatility_threshold:
                        result[i] = False

                mean_spread = np.mean(spread_window[:window_count])
                if spreads[i] > mean_spread * self.tick_cleaner.volatility_tracker.spread_threshold:
                    result[i] = False

            # Update rolling window
            price_window[window_idx] = prices[i]
            spread_window[window_idx] = spreads[i]
            window_idx = (window_idx + 1) % self.tick_cleaner.volatility_tracker.window_size
            window_count = min(window_count + 1, self.tick_cleaner.volatility_tracker.window_size)

        return result

    def clean_dict_list(self, ticks: List[dict]) -> List[dict]:
        """Clean a list of tick dictionaries."""
        if not ticks:
            return []

        # Convert to DataFrame for vectorized processing
        df = pd.DataFrame(ticks)
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"])

        # Use vectorized clean_dataframe
        cleaned_df = self.clean_dataframe(df)

        # Convert back to dict list
        if cleaned_df.empty:
            return []

        return cleaned_df.to_dict(orient="records")


# Convenience factory function
def create_cleaner() -> BatchCleaner:
    """Create a configured BatchCleaner instance."""
    tracker = VolatilityTracker()
    session_detector = SessionDetector()
    tick_cleaner = TickCleaner(volatility_tracker=tracker, session_detector=session_detector)
    return BatchCleaner(tick_cleaner=tick_cleaner)
