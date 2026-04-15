"""Factor schemas."""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class FactorBase(BaseModel):
    """Base factor schema."""
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    parameters: Optional[str] = None


class FactorCreate(FactorBase):
    """Schema for creating a factor."""
    pass


class FactorResponse(FactorBase):
    """Schema for factor response."""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class FactorValueResponse(BaseModel):
    """Schema for factor value response."""
    factor_id: int
    timestamp: datetime
    value: float


class FactorAnalyzeRequest(BaseModel):
    """Schema for factor analysis request."""
    factor_name: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    parameters: Optional[dict] = None


class FactorAnalyzeResponse(BaseModel):
    """Schema for factor analysis response."""
    factor_name: str
    stats: dict
    values: List[FactorValueResponse]
