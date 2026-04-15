"""Tick data model."""
from sqlalchemy import Column, String, Float, Integer, DateTime, Index
from sqlalchemy.sql import func

from app.models import Base


class Tick(Base):
    """Tick data model for XAUUSD."""

    __tablename__ = "ticks"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    symbol = Column(String(20), nullable=False, default="XAUUSD")
    bid = Column(Float, nullable=False)
    ask = Column(Float, nullable=False)
    bid_size = Column(Integer, default=0)
    ask_size = Column(Integer, default=0)
    volume = Column(Float, default=0.0)

    # Cleaned data fields
    is_valid = Column(Integer, default=1)  # 1=valid, 0=filtered
    session = Column(String(20), nullable=True)  # asian, london, newyork
    volatility_bucket = Column(String(10), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_ticks_timestamp_symbol", "timestamp", "symbol"),
        {"timescaledb_hypertable": "ticks"},
    )
