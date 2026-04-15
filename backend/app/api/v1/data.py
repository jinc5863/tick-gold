"""Data API endpoints for tick data management."""
import csv
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models.tick import Tick as TickData
from app.services.mt5_service import MT5Simulator, parse_mt5_csv
from app.schemas.common import APIResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/import", response_model=APIResponse)
async def import_csv_data(
    file: UploadFile = File(...),
    symbol: str = Query("XAUUSD", description="Trading symbol"),
    db: Session = Depends(get_db)
):
    """Import tick data from uploaded CSV file."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    try:
        # Read file content
        content = await file.read()
        lines = content.decode('utf-8').strip().split('\n')

        if len(lines) < 2:
            return APIResponse(
                success=False,
                message="CSV file is empty or has no data rows",
                data={"filename": file.filename, "ticks_imported": 0},
            )

        # Parse CSV (MT5 format: Date,Time,Symbol,Bid,Ask,Volume)
        ticks_imported = 0
        errors = 0

        for line in lines[1:]:  # Skip header
            try:
                parts = line.strip().split(',')
                if len(parts) < 5:
                    errors += 1
                    continue

                # Parse MT5 date format: 2024.01.15,09:30:00.000
                date_str = parts[0]
                time_str = parts[1]
                csv_symbol = parts[2]
                bid = float(parts[3])
                ask = float(parts[4])
                volume = float(parts[5]) if len(parts) > 5 else 0.0

                # Convert date format: 2024.01.15 -> 2024-01-15
                date_formatted = date_str.replace('.', '-')
                timestamp = datetime.fromisoformat(f"{date_formatted}T{time_str}")

                tick = TickData(
                    symbol=csv_symbol,
                    timestamp=timestamp,
                    bid=bid,
                    ask=ask,
                    spread=round(ask - bid, 2),
                    volume=volume,
                    tick_type="normal",
                    is_cleaned=0,
                )
                db.add(tick)
                ticks_imported += 1

            except Exception:
                errors += 1
                continue

        # Batch commit every 1000 records
        if ticks_imported % 1000 == 0:
            db.commit()

        db.commit()

        return APIResponse(
            success=True,
            message=f"Imported {ticks_imported} ticks",
            data={
                "filename": file.filename,
                "symbol": symbol,
                "ticks_imported": ticks_imported,
                "errors": errors,
            },
        )

    except Exception as e:
        logger.error(f"Error importing CSV: {e}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.get("/ticks", response_model=Dict[str, Any])
async def get_ticks(
    symbol: str = Query("XAUUSD", description="Trading symbol"),
    start_time: Optional[datetime] = Query(None, description="Start time filter"),
    end_time: Optional[datetime] = Query(None, description="End time filter"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db)
):
    """Get tick data from database."""
    query = db.query(TickData).filter(TickData.symbol == symbol)

    if start_time:
        query = query.filter(TickData.timestamp >= start_time)
    if end_time:
        query = query.filter(TickData.timestamp <= end_time)

    total = query.count()
    ticks = query.order_by(desc(TickData.timestamp)).offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "symbol": symbol,
        "ticks": [
            {
                "id": t.id,
                "uuid": str(t.uuid),
                "symbol": t.symbol,
                "timestamp": t.timestamp.isoformat() if t.timestamp else None,
                "bid": t.bid,
                "ask": t.ask,
                "spread": t.spread,
                "volume": t.volume,
                "tick_type": t.tick_type,
                "is_cleaned": t.is_cleaned,
            }
            for t in ticks
        ],
    }


@router.get("/ticks/stats", response_model=Dict[str, Any])
async def get_tick_stats(
    symbol: str = Query("XAUUSD", description="Trading symbol"),
    db: Session = Depends(get_db)
):
    """Get statistics about tick data."""
    base_query = db.query(TickData).filter(TickData.symbol == symbol)

    total_ticks = base_query.count()
    cleaned_ticks = base_query.filter(TickData.is_cleaned == 1).count()
    raw_ticks = base_query.filter(TickData.is_cleaned == 0).count()

    # Get time range
    oldest = base_query.order_by(TickData.timestamp.asc()).first()
    newest = base_query.order_by(TickData.timestamp.desc()).first()

    return {
        "symbol": symbol,
        "total_ticks": total_ticks,
        "cleaned_ticks": cleaned_ticks,
        "raw_ticks": raw_ticks,
        "oldest_tick": oldest.timestamp.isoformat() if oldest else None,
        "newest_tick": newest.timestamp.isoformat() if newest else None,
    }


@router.delete("/ticks", response_model=APIResponse)
async def delete_ticks(
    symbol: str = Query("XAUUSD", description="Trading symbol"),
    before: Optional[datetime] = Query(None, description="Delete ticks before this time"),
    db: Session = Depends(get_db)
):
    """Delete tick data (for cleanup)."""
    query = db.query(TickData).filter(TickData.symbol == symbol)

    if before:
        query = query.filter(TickData.timestamp < before)

    deleted = query.delete()
    db.commit()

    return APIResponse(
        success=True,
        message=f"Deleted {deleted} ticks",
        data={"deleted": deleted, "symbol": symbol},
    )


@router.post("/simulate", response_model=APIResponse)
async def generate_simulated_ticks(
    count: int = Query(1000, ge=1, le=100000, description="Number of ticks to generate"),
    symbol: str = Query("XAUUSD", description="Trading symbol"),
    db: Session = Depends(get_db)
):
    """Generate simulated tick data for testing.

    This creates realistic XAUUSD price movements based on:
    - Random walk with drift
    - Volatility clustering
    - Realistic spread patterns
    """
    simulator = MT5Simulator(symbol=symbol)

    ticks_generated = 0
    batch_size = 500
    tick_objects = []

    for i in range(count):
        tick_data = simulator.generate_tick()

        tick = TickData(
            symbol=tick_data.symbol,
            timestamp=tick_data.timestamp,
            bid=tick_data.bid,
            ask=tick_data.ask,
            spread=tick_data.spread,
            volume=tick_data.volume,
            tick_type=tick_data.tick_type,
            is_cleaned=0,
        )
        tick_objects.append(tick)
        ticks_generated += 1

        # Batch insert
        if len(tick_objects) >= batch_size:
            db.bulk_save_objects(tick_objects)
            db.commit()
            tick_objects = []

    # Save remaining
    if tick_objects:
        db.bulk_save_objects(tick_objects)
        db.commit()

    return APIResponse(
        success=True,
        message=f"Generated {ticks_generated} simulated ticks",
        data={
            "ticks_generated": ticks_generated,
            "symbol": symbol,
            "mode": "simulator",
        },
    )
