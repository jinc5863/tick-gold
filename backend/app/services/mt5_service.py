"""MT5 Data Service - Handles tick data from MT5 terminals."""
import asyncio
import json
import random
import zlib
from datetime import datetime, timedelta
from typing import Optional, Callable, Dict, Any
from dataclasses import dataclass
import struct

import zmq
import numpy as np


@dataclass
class TickData:
    """Represents a single tick of market data."""
    symbol: str
    timestamp: datetime
    bid: float
    ask: float
    spread: float
    volume: float = 0.0
    tick_type: str = "normal"  # normal, gap, spike


class MT5Simulator:
    """Simulates MT5 tick data for testing and development.

    Generates realistic XAUUSD price movements based on:
    - Random walk with drift
    - Volatility clustering
    - Realistic spread patterns
    """

    def __init__(
        self,
        symbol: str = "XAUUSD",
        base_price: float = 2344.50,
        volatility: float = 0.0003,
        spread_bps: float = 0.5,
    ):
        self.symbol = symbol
        self.base_price = base_price
        self.volatility = volatility
        self.spread_bps = spread_bps
        self._running = False
        self._current_price = base_price
        self._last_timestamp: Optional[datetime] = None

    def generate_tick(self) -> TickData:
        """Generate a single realistic tick."""
        now = datetime.utcnow()

        # Random walk with slight upward drift
        change = np.random.normal(0.00001, self.volatility)
        self._current_price *= (1 + change)

        # Ensure price stays within realistic bounds
        self._current_price = max(2300, min(2400, self._current_price))

        # Calculate bid/ask with spread
        spread = self._current_price * (self.spread_bps / 10000)
        bid = round(self._current_price - spread / 2, 2)
        ask = round(self._current_price + spread / 2, 2)

        # Occasionally generate spikes or gaps
        tick_type = "normal"
        if random.random() < 0.01:  # 1% chance of spike
            spike = np.random.uniform(-0.5, 0.5)
            bid += spike
            ask += spike
            tick_type = "spike"
        elif random.random() < 0.005:  # 0.5% chance of gap
            gap = np.random.uniform(-2, 2)
            bid += gap
            ask += gap
            tick_type = "gap"

        return TickData(
            symbol=self.symbol,
            timestamp=now,
            bid=bid,
            ask=ask,
            spread=round(ask - bid, 2),
            volume=random.uniform(0.1, 5.0),
            tick_type=tick_type,
        )

    def to_dict(self, tick: TickData) -> Dict[str, Any]:
        """Convert tick to dictionary."""
        return {
            "symbol": tick.symbol,
            "timestamp": tick.timestamp.isoformat() + "Z",
            "bid": tick.bid,
            "ask": tick.ask,
            "spread": tick.spread,
            "volume": tick.volume,
            "tick_type": tick.tick_type,
        }


class MT5ZMQListener:
    """Listens for MT5 tick data via ZeroMQ.

    Expected message format from MT5 EA:
    {
        "symbol": "XAUUSD",
        "timestamp": "2024-01-01T12:00:00.000Z",
        "bid": 2344.50,
        "ask": 2344.52,
        "volume": 1.5
    }
    """

    def __init__(self, host: str = "127.0.0.1", port: int = 1611):
        self.host = host
        self.port = port
        self._socket: Optional[zmq.Socket] = None
        self._context: Optional[zmq.Context] = None

    def connect(self) -> bool:
        """Connect to ZeroMQ endpoint."""
        try:
            self._context = zmq.Context()
            self._socket = self._context.socket(zmq.SUB)
            self._socket.setsockopt(zmq.RCVTIMEO, 1000)  # 1 second timeout
            self._socket.connect(f"tcp://{self.host}:{self.port}")
            self._socket.setsockopt(zmq.SUBSCRIBE, b"")  # Subscribe to all
            return True
        except Exception as e:
            print(f"Failed to connect to ZMQ at {self.host}:{self.port}: {e}")
            return False

    def receive_tick(self) -> Optional[TickData]:
        """Receive a single tick from ZeroMQ."""
        if not self._socket:
            return None

        try:
            message = self._socket.recv_string()
            data = json.loads(message)

            return TickData(
                symbol=data.get("symbol", "XAUUSD"),
                timestamp=datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00")),
                bid=float(data["bid"]),
                ask=float(data["ask"]),
                spread=float(data.get("spread", 0)),
                volume=float(data.get("volume", 0)),
                tick_type=data.get("tick_type", "normal"),
            )
        except zmq.Again:
            return None  # Timeout, no data
        except Exception:
            return None

    def close(self):
        """Close the ZeroMQ connection."""
        if self._socket:
            self._socket.close()
        if self._context:
            self._context.term()


class MT5DataService:
    """Main service for managing MT5 data flow.

    Supports:
    - Simulator mode for testing
    - ZMQ listener for real MT5
    - CSV file import
    """

    def __init__(self, mode: str = "simulator"):
        self.mode = mode  # "simulator", "zmq", "csv"
        self.simulator = MT5Simulator() if mode == "simulator" else None
        self.zmq_listener = MT5ZMQListener() if mode == "zmq" else None
        self._running = False
        self._tick_callbacks: list = []

    def add_tick_callback(self, callback: Callable[[TickData], None]):
        """Add a callback to be called on each tick."""
        self._tick_callbacks.append(callback)

    def start(self):
        """Start the data service."""
        self._running = True
        if self.mode == "zmq" and self.zmq_listener:
            self.zmq_listener.connect()

    def stop(self):
        """Stop the data service."""
        self._running = False
        if self.zmq_listener:
            self.zmq_listener.close()

    async def tick_generator(self):
        """Async generator for tick data."""
        self.start()

        while self._running:
            tick = None

            if self.mode == "simulator" and self.simulator:
                tick = self.simulator.generate_tick()
                await asyncio.sleep(0.05)  # 20 ticks/sec for simulator
            elif self.mode == "zmq" and self.zmq_listener:
                tick = self.zmq_listener.receive_tick()

            if tick:
                # Call all callbacks
                for callback in self._tick_callbacks:
                    try:
                        if asyncio.iscoroutinefunction(callback):
                            await callback(tick)
                        else:
                            callback(tick)
                    except Exception as e:
                        print(f"Error in tick callback: {e}")

                yield tick

        self.stop()

    def generate_historical_ticks(
        self,
        count: int = 1000,
        start_time: Optional[datetime] = None,
    ) -> list[TickData]:
        """Generate historical ticks for backtesting."""
        if start_time is None:
            start_time = datetime.utcnow() - timedelta(hours=1)

        ticks = []
        current_time = start_time

        for i in range(count):
            tick = self.simulator.generate_tick()
            tick.timestamp = current_time + timedelta(milliseconds=i * 50)
            ticks.append(tick)

        return ticks


def parse_mt5_csv(filepath: str) -> list[TickData]:
    """Parse MT5 exported CSV file into TickData list.

    Expected CSV format from MT5:
    Date,Time,Symbol,Bid,Ask,Volume
    2024.01.15,09:30:00.000,XAUUSD,2344.50,2344.52,1.5
    """
    ticks = []

    try:
        with open(filepath, 'r') as f:
            lines = f.readlines()

        for line in lines[1:]:  # Skip header
            try:
                parts = line.strip().split(',')
                if len(parts) < 5:
                    continue

                date_str = parts[0]
                time_str = parts[1]
                symbol = parts[2]
                bid = float(parts[3])
                ask = float(parts[4])
                volume = float(parts[5]) if len(parts) > 5 else 0.0

                # Parse datetime
                datetime_str = f"{date_str.replace('.', '-')}T{time_str}"
                timestamp = datetime.fromisoformat(datetime_str)

                ticks.append(TickData(
                    symbol=symbol,
                    timestamp=timestamp,
                    bid=bid,
                    ask=ask,
                    spread=round(ask - bid, 2),
                    volume=volume,
                    tick_type="normal",
                ))
            except Exception:
                continue

    except FileNotFoundError:
        raise FileNotFoundError(f"CSV file not found: {filepath}")
    except Exception as e:
        raise ValueError(f"Error parsing CSV: {e}")

    return ticks
