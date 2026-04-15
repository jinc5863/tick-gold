"""Database models for Tick Gold trading system."""
from datetime import datetime
from sqlalchemy import Column, Integer, BigInteger, Float, String, DateTime, Boolean, Text, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid

from app.models import Base


class TickData(Base):
    """Tick data model for storing price ticks."""
    __tablename__ = "tick_data"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True)
    symbol = Column(String(20), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    bid = Column(Float, nullable=False)
    ask = Column(Float, nullable=False)
    spread = Column(Float)
    volume = Column(Float, default=0)
    tick_type = Column(String(10), default="normal")  # normal, gap, spike
    is_cleaned = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('ix_tick_data_symbol_timestamp', 'symbol', 'timestamp'),
        Index('ix_tick_data_timestamp_desc', timestamp.desc()),
    )


class Factor(Base):
    """Trading factors model."""
    __tablename__ = "factors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True)
    name = Column(String(100), nullable=False, unique=True)
    display_name = Column(String(200))
    category = Column(String(50), index=True)  # trend, momentum, volatility, volume
    description = Column(Text)
    formula = Column(Text)
    parameters = Column(JSONB, default={})
    is_active = Column(Boolean, default=True)
    effectiveness_score = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Strategy(Base):
    """Trading strategy model."""
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    strategy_type = Column(String(50))  # trend_following, mean_reversion, breakout
    timeframe = Column(String(10))  # M1, M5, M15, M30
    parameters = Column(JSONB, default={})
    factors = Column(JSONB, default=[])  # List of factor UUIDs used
    entry_conditions = Column(JSONB, default={})
    exit_conditions = Column(JSONB, default={})
    is_active = Column(Boolean, default=False)
    is_running = Column(Boolean, default=False)
    total_trades = Column(Integer, default=0)
    win_rate = Column(Float, default=0.0)
    avg_profit = Column(Float, default=0.0)
    max_drawdown = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Position(Base):
    """Trading position model."""
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True)
    symbol = Column(String(20), nullable=False, index=True)
    direction = Column(String(10), nullable=False)  # long, short
    quantity = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=False)
    current_price = Column(Float)
    stop_loss = Column(Float)
    take_profit = Column(Float)
    status = Column(String(20), default="open")  # open, closed, liquidated
    strategy_id = Column(Integer, index=True)
    opened_at = Column(DateTime(timezone=True), nullable=False)
    closed_at = Column(DateTime(timezone=True))
    profit_loss = Column(Float)
    commission = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Trade(Base):
    """Trade history model."""
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True)
    position_id = Column(Integer, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    direction = Column(String(10), nullable=False)
    quantity = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float)
    strategy_id = Column(Integer, index=True)
    entry_time = Column(DateTime(timezone=True), nullable=False)
    exit_time = Column(DateTime(timezone=True))
    profit_loss = Column(Float)
    commission = Column(Float, default=0.0)
    status = Column(String(20), default="open")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RiskEvent(Base):
    """Risk event log model."""
    __tablename__ = "risk_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True)
    event_type = Column(String(50), nullable=False)  # gap_risk, overnight_risk, drawdown
    severity = Column(String(20))  # low, medium, high, critical
    symbol = Column(String(20))
    description = Column(Text)
    details = Column(JSONB, default={})
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SystemStatus(Base):
    """System status model."""
    __tablename__ = "system_status"

    id = Column(Integer, primary_key=True, autoincrement=True)
    component = Column(String(100), nullable=False, unique=True)
    status = Column(String(50), default="unknown")  # healthy, degraded, down
    latency_ms = Column(Float)
    last_check = Column(DateTime(timezone=True))
    details = Column(JSONB, default={})
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class CleaningJob(Base):
    """Data cleaning job model."""
    __tablename__ = "cleaning_jobs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True)
    status = Column(String(20), default="pending")  # pending, running, completed, failed
    total_ticks = Column(BigInteger, default=0)
    processed_ticks = Column(BigInteger, default=0)
    cleaned_ticks = Column(BigInteger, default=0)
    removed_ticks = Column(BigInteger, default=0)
    speed_ticks_per_sec = Column(Float, default=0.0)
    error_message = Column(Text)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
