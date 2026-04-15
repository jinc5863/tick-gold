"""Generate realistic XAUUSD tick data for testing.

This script generates tick data that mimics real market characteristics:
- Realistic price range (2300-2400 for XAUUSD)
- Variable spread (0.1-0.5 pips)
- Volatility clustering
- Weekend gaps
- Asian/London/New York session patterns
"""
import sys
import os
from datetime import datetime, timedelta
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import SessionLocal
from app.models.tick import Tick
from app.services.mt5_service import MT5Simulator


def generate_realistic_ticks(
    start_date: datetime,
    end_date: datetime,
    ticks_per_minute: int = 10,
    base_price: float = 2340.0,
) -> list:
    """Generate realistic tick data for a date range.

    Args:
        start_date: Start datetime
        end_date: End datetime
        ticks_per_minute: Average ticks per minute (real XAUUSD can be 100+/min)
        base_price: Starting price

    Returns:
        List of Tick objects
    """
    simulator = MT5Simulator(
        symbol="XAUUSD",
        base_price=base_price,
        volatility=0.0002,  # 2 pip volatility per tick
        spread_bps=0.3,  # 0.3 pips spread
    )

    ticks = []
    current_price = base_price

    # Generate ticks
    current_time = start_date
    delta = timedelta(seconds=60 / ticks_per_minute)  # Time between ticks

    while current_time < end_date:
        # Skip weekends (Saturday/Sunday)
        if current_time.weekday() >= 5:  # Sat=5, Sun=6
            current_time += timedelta(days=1)
            current_time = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
            continue

        # Generate tick
        tick_data = simulator.generate_tick()
        tick_data.timestamp = current_time

        # Add session-based price drift
        hour = current_time.hour
        if 0 <= hour < 7:  # Asian session - lower volatility
            tick_data.bid *= 0.9998
            tick_data.ask *= 0.9998
        elif 7 <= hour < 16:  # London session - higher volatility
            tick_data.bid *= 1.0002
            tick_data.ask *= 1.0002
        else:  # New York session - moderate volatility
            tick_data.bid *= 1.0001
            tick_data.ask *= 1.0001

        tick = Tick(
            symbol=tick_data.symbol,
            timestamp=tick_data.timestamp,
            bid=tick_data.bid,
            ask=tick_data.ask,
            spread=tick_data.spread,
            volume=tick_data.volume,
            tick_type=tick_data.tick_type,
            is_cleaned=0,
        )
        ticks.append(tick)

        current_time += delta

    return ticks


def main():
    """Generate test data."""
    print("=" * 60)
    print("XAUUSD Realistic Tick Data Generator")
    print("=" * 60)

    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2024
    ticks_per_day = int(sys.argv[2]) if len(sys.argv) > 2 else 10000  # ~10k per day

    start_date = datetime(year, 1, 1, 0, 0, 0)
    end_date = datetime(year, 12, 31, 23, 59, 59)

    print(f"\nGenerating {year} data...")
    print(f"Date range: {start_date} to {end_date}")
    print(f"Target ticks: ~{ticks_per_day * 260} (260 trading days)")

    # Generate ticks
    ticks = generate_realistic_ticks(
        start_date=start_date,
        end_date=end_date,
        ticks_per_minute=ticks_per_day // (24 * 60),  # Spread across the day
        base_price=2340.0,
    )

    print(f"Generated {len(ticks)} ticks")

    # Import to database
    db = SessionLocal()
    batch_size = 5000
    total_imported = 0

    try:
        for i in range(0, len(ticks), batch_size):
            batch = ticks[i:i + batch_size]
            db.bulk_save_objects(batch)
            db.commit()
            total_imported += len(batch)
            print(f"  Imported {total_imported}/{len(ticks)}...")

        print(f"\nSuccessfully imported {total_imported} ticks for {year}")

        # Show stats
        total = db.query(Tick).filter(Tick.symbol == "XAUUSD").count()
        print(f"Total ticks in database: {total}")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
