"""Database service for accessing trading data."""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.database import (
    Factor,
    Strategy,
    Position,
    Trade,
    RiskEvent,
    SystemStatus,
    CleaningJob,
    TickData,
)


class FactorService:
    """Service for managing trading factors."""

    @staticmethod
    def get_all_factors(db: Session, category: Optional[str] = None, is_active: Optional[bool] = None) -> List[Factor]:
        """Get all factors with optional filtering."""
        query = db.query(Factor)
        if category:
            query = query.filter(Factor.category == category)
        if is_active is not None:
            query = query.filter(Factor.is_active == is_active)
        return query.order_by(Factor.effectiveness_score.desc()).all()

    @staticmethod
    def get_factor_by_id(db: Session, factor_id: int) -> Optional[Factor]:
        """Get factor by ID."""
        return db.query(Factor).filter(Factor.id == factor_id).first()

    @staticmethod
    def get_factor_by_name(db: Session, name: str) -> Optional[Factor]:
        """Get factor by name."""
        return db.query(Factor).filter(Factor.name == name).first()

    @staticmethod
    def create_factor(db: Session, factor_data: dict) -> Factor:
        """Create a new factor."""
        factor = Factor(**factor_data)
        db.add(factor)
        db.commit()
        db.refresh(factor)
        return factor

    @staticmethod
    def update_factor(db: Session, factor_id: int, factor_data: dict) -> Optional[Factor]:
        """Update an existing factor."""
        factor = db.query(Factor).filter(Factor.id == factor_id).first()
        if factor:
            for key, value in factor_data.items():
                setattr(factor, key, value)
            db.commit()
            db.refresh(factor)
        return factor


class StrategyService:
    """Service for managing trading strategies."""

    @staticmethod
    def get_all_strategies(db: Session, is_active: Optional[bool] = None) -> List[Strategy]:
        """Get all strategies."""
        query = db.query(Strategy)
        if is_active is not None:
            query = query.filter(Strategy.is_active == is_active)
        return query.order_by(Strategy.created_at.desc()).all()

    @staticmethod
    def get_strategy_by_id(db: Session, strategy_id: int) -> Optional[Strategy]:
        """Get strategy by ID."""
        return db.query(Strategy).filter(Strategy.id == strategy_id).first()

    @staticmethod
    def create_strategy(db: Session, strategy_data: dict) -> Strategy:
        """Create a new strategy."""
        strategy = Strategy(**strategy_data)
        db.add(strategy)
        db.commit()
        db.refresh(strategy)
        return strategy

    @staticmethod
    def update_strategy(db: Session, strategy_id: int, strategy_data: dict) -> Optional[Strategy]:
        """Update an existing strategy."""
        strategy = db.query(Strategy).filter(Strategy.id == strategy_id).first()
        if strategy:
            for key, value in strategy_data.items():
                setattr(strategy, key, value)
            db.commit()
            db.refresh(strategy)
        return strategy


class PositionService:
    """Service for managing positions."""

    @staticmethod
    def get_open_positions(db: Session, symbol: Optional[str] = None) -> List[Position]:
        """Get all open positions."""
        query = db.query(Position).filter(Position.status == "open")
        if symbol:
            query = query.filter(Position.symbol == symbol)
        return query.order_by(Position.opened_at.desc()).all()

    @staticmethod
    def get_position_by_id(db: Session, position_id: int) -> Optional[Position]:
        """Get position by ID."""
        return db.query(Position).filter(Position.id == position_id).first()

    @staticmethod
    def create_position(db: Session, position_data: dict) -> Position:
        """Create a new position."""
        position = Position(**position_data)
        db.add(position)
        db.commit()
        db.refresh(position)
        return position

    @staticmethod
    def close_position(db: Session, position_id: int, exit_price: float, profit_loss: float) -> Optional[Position]:
        """Close an existing position."""
        position = db.query(Position).filter(Position.id == position_id).first()
        if position:
            position.status = "closed"
            position.current_price = exit_price
            position.profit_loss = profit_loss
            from datetime import datetime
            position.closed_at = datetime.utcnow()
            db.commit()
            db.refresh(position)
        return position


class SystemStatusService:
    """Service for managing system status."""

    @staticmethod
    def get_all_status(db: Session) -> List[SystemStatus]:
        """Get all system component statuses."""
        return db.query(SystemStatus).all()

    @staticmethod
    def get_status_by_component(db: Session, component: str) -> Optional[SystemStatus]:
        """Get status for a specific component."""
        return db.query(SystemStatus).filter(SystemStatus.component == component).first()

    @staticmethod
    def update_status(db: Session, component: str, status: str, latency_ms: float = None) -> Optional[SystemStatus]:
        """Update status for a component."""
        from datetime import datetime
        component_status = db.query(SystemStatus).filter(SystemStatus.component == component).first()
        if component_status:
            component_status.status = status
            component_status.last_check = datetime.utcnow()
            if latency_ms is not None:
                component_status.latency_ms = latency_ms
            db.commit()
            db.refresh(component_status)
        return component_status


class RiskEventService:
    """Service for managing risk events."""

    @staticmethod
    def get_recent_events(db: Session, limit: int = 50) -> List[RiskEvent]:
        """Get recent risk events."""
        return db.query(RiskEvent).order_by(RiskEvent.created_at.desc()).limit(limit).all()

    @staticmethod
    def get_unacknowledged_events(db: Session) -> List[RiskEvent]:
        """Get unacknowledged risk events."""
        return db.query(RiskEvent).filter(RiskEvent.is_acknowledged == False).order_by(RiskEvent.created_at.desc()).all()

    @staticmethod
    def create_event(db: Session, event_data: dict) -> RiskEvent:
        """Create a new risk event."""
        event = RiskEvent(**event_data)
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    @staticmethod
    def acknowledge_event(db: Session, event_id: int) -> Optional[RiskEvent]:
        """Acknowledge a risk event."""
        from datetime import datetime
        event = db.query(RiskEvent).filter(RiskEvent.id == event_id).first()
        if event:
            event.is_acknowledged = True
            event.acknowledged_at = datetime.utcnow()
            db.commit()
            db.refresh(event)
        return event
