"""Tick data model."""
from sqlalchemy import Column, String, Float, Integer, DateTime, Index, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.models import Base


class Tick(Base):
    """Tick data model for XAUUSD market data.

    Stores raw tick data from MT5 or simulated sources.
    """

    __tablename__ = "ticks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    symbol = Column(String(20), nullable=False, default="XAUUSD", index=True)
    bid = Column(Float, nullable=False)
    ask = Column(Float, nullable=False)
    spread = Column(Float)
    bid_size = Column(Integer, default=0)
    ask_size = Column(Integer, default=0)
    volume = Column(Float, default=0.0)

    # Tick classification
    tick_type = Column(String(10), default="normal")  # normal, gap, spike

    # Data quality
    is_cleaned = Column(Integer, default=0)  # 0=raw, 1=cleaned
    is_valid = Column(Integer, default=1)  # 1=valid, 0=filtered out

    # Session detection
    session = Column(String(20), nullable=True)  # asian, london, newyork
    volatility_bucket = Column(String(10), nullable=True)  # low, medium, high

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_ticks_symbol_timestamp", "symbol", "timestamp"),
        Index("ix_ticks_timestamp_desc", timestamp.desc()),
    )
