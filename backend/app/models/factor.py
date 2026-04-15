"""Factor data model."""
from sqlalchemy import Column, String, Float, Integer, DateTime, Index
from sqlalchemy.sql import func

from app.models import Base


class Factor(Base):
    """Trading factor model."""

    __tablename__ = "factors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True, index=True)
    description = Column(String(255), nullable=True)
    category = Column(String(30), nullable=True)  # momentum, volatility, trend
    parameters = Column(String(500), nullable=True)  # JSON string

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class FactorValue(Base):
    """Factor values over time."""

    __tablename__ = "factor_values"

    id = Column(Integer, primary_key=True, index=True)
    factor_id = Column(Integer, nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    value = Column(Float, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_factor_values_factor_timestamp", "factor_id", "timestamp"),
    )
