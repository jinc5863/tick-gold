"""Data API endpoints."""
import csv
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from pathlib import Path

from fastapi import APIRouter, HTTPException
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings
from app.models.tick import Tick
from app.schemas.tick import (
    DataImportRequest,
    DataCleanRequest,
    TickResponse,
    TickListResponse,
)
from app.schemas.common import APIResponse
from app.core.cleaning.cleaner import create_cleaner

router = APIRouter()
logger = logging.getLogger(__name__)

settings = get_settings()


def get_db_session() -> Optional[Session]:
    """Get database session if connection is available."""
    if not settings.DATABASE_URL:
        return None
    try:
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        return SessionLocal()
    except Exception as e:
        logger.warning(f"Database connection failed: {e}")
        return None


def parse_csv_ticks(file_path: str, symbol: str = "XAUUSD") -> List[Dict[str, Any]]:
    """Parse tick data from CSV file.

    Expected CSV format:
    timestamp,bid,ask,bid_size,ask_size,volume
    """
    ticks = []
    path = Path(file_path)

    # Try relative to backend directory first
    if not path.is_absolute():
        path = Path("/Users/office01/work/tick-gold/backend") / path

    if not path.exists():
        raise FileNotFoundError(f"CSV file not found: {file_path}")

    with open(path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                tick = {
                    "timestamp": datetime.fromisoformat(row["timestamp"].replace("Z", "+00:00")),
                    "symbol": symbol,
                    "bid": float(row["bid"]),
                    "ask": float(row["ask"]),
                    "bid_size": int(row.get("bid_size", 0)),
                    "ask_size": int(row.get("ask_size", 0)),
                    "volume": float(row.get("volume", 0.0)),
                }
                ticks.append(tick)
            except (KeyError, ValueError) as e:
                logger.warning(f"Skipping invalid row: {row}, error: {e}")
                continue

    return ticks


@router.post("/import", response_model=APIResponse)
async def import_data(request: DataImportRequest):
    """Import tick data from CSV file."""
    try:
        ticks = parse_csv_ticks(request.file_path, request.symbol)

        if not ticks:
            return APIResponse(
                success=False,
                message="No valid ticks found in file",
                data={"file_path": request.file_path, "symbol": request.symbol, "ticks_imported": 0},
            )

        session = get_db_session()

        if session is None:
            # Demo mode - return simulated success
            return APIResponse(
                success=True,
                message=f"Demo mode: Would import {len(ticks)} ticks",
                data={"file_path": request.file_path, "symbol": request.symbol, "ticks_imported": len(ticks)},
            )

        try:
            cleaner = create_cleaner()
            cleaned_ticks = cleaner.clean_dict_list(ticks)

            tick_objects = []
            for tick_data in cleaned_ticks:
                tick = Tick(
                    timestamp=tick_data["timestamp"],
                    symbol=tick_data.get("symbol", request.symbol),
                    bid=tick_data["bid"],
                    ask=tick_data["ask"],
                    bid_size=tick_data.get("bid_size", 0),
                    ask_size=tick_data.get("ask_size", 0),
                    volume=tick_data.get("volume", 0.0),
                    is_valid=tick_data.get("is_valid", 1),
                    session=tick_data.get("session"),
                    volatility_bucket=tick_data.get("volatility_bucket"),
                )
                tick_objects.append(tick)

            session.add_all(tick_objects)
            session.commit()

            return APIResponse(
                success=True,
                message=f"Successfully imported {len(tick_objects)} ticks",
                data={
                    "file_path": request.file_path,
                    "symbol": request.symbol,
                    "ticks_imported": len(tick_objects),
                    "ticks_filtered": len(ticks) - len(cleaned_ticks),
                },
            )

        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Database error during import: {e}")
            return APIResponse(
                success=False,
                message=f"Database error: {str(e)}",
                data={"file_path": request.file_path, "symbol": request.symbol},
            )
        finally:
            session.close()

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error importing data: {e}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.post("/clean", response_model=APIResponse)
async def clean_data(request: DataCleanRequest):
    """Clean tick data using BatchCleaner."""
    try:
        session = get_db_session()

        if session is None:
            return APIResponse(
                success=True,
                message="Demo mode: Would clean ticks",
                data={"symbol": request.symbol, "ticks_cleaned": 0},
            )

        try:
            query = select(Tick).where(Tick.symbol == request.symbol)

            if request.start_time:
                query = query.where(Tick.timestamp >= request.start_time)
            if request.end_time:
                query = query.where(Tick.timestamp <= request.end_time)

            result = session.execute(query)
            ticks = result.scalars().all()

            if not ticks:
                return APIResponse(
                    success=True,
                    message="No ticks found in time range",
                    data={"symbol": request.symbol, "ticks_cleaned": 0},
                )

            tick_dicts = [
                {
                    "timestamp": t.timestamp,
                    "symbol": t.symbol,
                    "bid": t.bid,
                    "ask": t.ask,
                    "bid_size": t.bid_size,
                    "ask_size": t.ask_size,
                    "volume": t.volume,
                }
                for t in ticks
            ]

            cleaner = create_cleaner()
            cleaned_ticks = cleaner.clean_dict_list(tick_dicts)

            cleaned_ids = {ct["timestamp"] for ct in cleaned_ticks}
            for tick in ticks:
                tick.is_valid = 1 if tick.timestamp in cleaned_ids else 0

            session.commit()

            return APIResponse(
                success=True,
                message=f"Cleaned {len(cleaned_ticks)} ticks",
                data={
                    "symbol": request.symbol,
                    "ticks_cleaned": len(cleaned_ticks),
                    "ticks_filtered": len(ticks) - len(cleaned_ticks),
                },
            )

        except SQLAlchemyError as e:
            session.rollback()
            logger.error(f"Database error during cleaning: {e}")
            return APIResponse(
                success=False,
                message=f"Database error: {str(e)}",
                data={"symbol": request.symbol},
            )
        finally:
            session.close()

    except Exception as e:
        logger.error(f"Error cleaning data: {e}")
        raise HTTPException(status_code=500, detail=f"Cleaning failed: {str(e)}")


@router.get("/ticks", response_model=TickListResponse)
async def get_ticks(
    symbol: str = "XAUUSD",
    start_time: Optional[datetime] = None,
    end_time: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0,
):
    """Get tick list with pagination."""
    session = get_db_session()

    if session is None:
        # Demo mode - return simulated ticks
        demo_ticks = [
            TickResponse(
                id=i,
                timestamp=datetime.utcnow(),
                symbol=symbol,
                bid=2344.50 + i * 0.01,
                ask=2344.52 + i * 0.01,
                bid_size=100,
                ask_size=100,
                volume=1.5,
                is_valid=1,
                session="london",
                volatility_bucket="high",
            )
            for i in range(min(limit, 10))
        ]
        return TickListResponse(total=len(demo_ticks), ticks=demo_ticks)

    try:
        count_query = select(func.count(Tick.id)).where(Tick.symbol == symbol)
        if start_time:
            count_query = count_query.where(Tick.timestamp >= start_time)
        if end_time:
            count_query = count_query.where(Tick.timestamp <= end_time)

        total = session.execute(count_query).scalar()

        query = (
            select(Tick)
            .where(Tick.symbol == symbol)
            .order_by(Tick.timestamp.desc())
            .offset(offset)
            .limit(limit)
        )
        if start_time:
            query = query.where(Tick.timestamp >= start_time)
        if end_time:
            query = query.where(Tick.timestamp <= end_time)

        result = session.execute(query)
        ticks = result.scalars().all()

        tick_responses = [
            TickResponse(
                id=t.id,
                timestamp=t.timestamp,
                symbol=t.symbol,
                bid=t.bid,
                ask=t.ask,
                bid_size=t.bid_size,
                ask_size=t.ask_size,
                volume=t.volume,
                is_valid=t.is_valid,
                session=t.session,
                volatility_bucket=t.volatility_bucket,
            )
            for t in ticks
        ]

        return TickListResponse(total=total, ticks=tick_responses)

    except SQLAlchemyError as e:
        logger.error(f"Database error fetching ticks: {e}")
        return TickListResponse(total=0, ticks=[])
    finally:
        session.close()


@router.get("/ticks/{tick_id}", response_model=TickResponse)
async def get_tick(tick_id: int):
    """Get single tick by ID."""
    session = get_db_session()

    if session is None:
        return TickResponse(
            id=tick_id,
            timestamp=datetime.utcnow(),
            symbol="XAUUSD",
            bid=2344.50,
            ask=2344.52,
            bid_size=100,
            ask_size=100,
            volume=1.5,
            is_valid=1,
            session="london",
            volatility_bucket="high",
        )

    try:
        result = session.execute(select(Tick).where(Tick.id == tick_id))
        tick = result.scalar_one_or_none()

        if not tick:
            raise HTTPException(status_code=404, detail="Tick not found")

        return TickResponse(
            id=tick.id,
            timestamp=tick.timestamp,
            symbol=tick.symbol,
            bid=tick.bid,
            ask=tick.ask,
            bid_size=tick.bid_size,
            ask_size=tick.ask_size,
            volume=tick.volume,
            is_valid=tick.is_valid,
            session=tick.session,
            volatility_bucket=tick.volatility_bucket,
        )

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error fetching tick: {e}")
        raise HTTPException(status_code=500, detail="Database error")
    finally:
        session.close()
