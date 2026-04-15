"""Factors API endpoints."""
import logging
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.db_service import FactorService
from app.models.database import Factor

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=List[dict])
async def get_factors(
    category: Optional[str] = Query(None, description="Filter by category"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db)
):
    """Get all factors from the database."""
    factors = FactorService.get_all_factors(db, category=category, is_active=is_active)
    return [
        {
            "id": f.id,
            "uuid": str(f.uuid),
            "name": f.name,
            "display_name": f.display_name,
            "category": f.category,
            "description": f.description,
            "formula": f.formula,
            "parameters": f.parameters,
            "is_active": f.is_active,
            "effectiveness_score": f.effectiveness_score,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "updated_at": f.updated_at.isoformat() if f.updated_at else None,
        }
        for f in factors
    ]


@router.get("/categories", response_model=List[str])
async def get_factor_categories(db: Session = Depends(get_db)):
    """Get all unique factor categories."""
    categories = db.query(Factor.category).distinct().filter(Factor.category.isnot(None)).all()
    return [c[0] for c in categories]


@router.get("/{factor_id}", response_model=dict)
async def get_factor(factor_id: int, db: Session = Depends(get_db)):
    """Get factor by ID."""
    factor = FactorService.get_factor_by_id(db, factor_id)
    if not factor:
        raise HTTPException(status_code=404, detail="Factor not found")

    return {
        "id": factor.id,
        "uuid": str(factor.uuid),
        "name": factor.name,
        "display_name": factor.display_name,
        "category": factor.category,
        "description": factor.description,
        "formula": factor.formula,
        "parameters": factor.parameters,
        "is_active": factor.is_active,
        "effectiveness_score": factor.effectiveness_score,
        "created_at": factor.created_at.isoformat() if factor.created_at else None,
        "updated_at": factor.updated_at.isoformat() if factor.updated_at else None,
    }


@router.get("/name/{factor_name}", response_model=dict)
async def get_factor_by_name(factor_name: str, db: Session = Depends(get_db)):
    """Get factor by name."""
    factor = FactorService.get_factor_by_name(db, factor_name)
    if not factor:
        raise HTTPException(status_code=404, detail=f"Factor '{factor_name}' not found")

    return {
        "id": factor.id,
        "uuid": str(factor.uuid),
        "name": factor.name,
        "display_name": factor.display_name,
        "category": factor.category,
        "description": factor.description,
        "formula": factor.formula,
        "parameters": factor.parameters,
        "is_active": factor.is_active,
        "effectiveness_score": factor.effectiveness_score,
        "created_at": factor.created_at.isoformat() if factor.created_at else None,
        "updated_at": factor.updated_at.isoformat() if factor.updated_at else None,
    }
