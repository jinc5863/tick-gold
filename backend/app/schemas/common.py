"""Common Pydantic schemas."""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TimestampMixin(BaseModel):
    """Mixin for timestamp fields."""
    created_at: Optional[datetime] = None


class APIResponse(BaseModel):
    """Standard API response."""
    success: bool
    message: str
    data: Optional[dict] = None
