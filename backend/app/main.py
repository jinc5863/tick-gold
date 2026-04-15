"""Tick Gold Backend - FastAPI Main Application."""
import asyncio
import json
import random
import time
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.config import get_settings
from app.api.v1 import data, factors, strategy, risk
from app.core.cleaning.cleaner import VolatilityTracker, SessionDetector, TickCleaner, BatchCleaner

settings = get_settings()

# Timeout configuration
REQUEST_TIMEOUT_SECONDS = 30
WEBSOCKET_TIMEOUT_SECONDS = 300


class ConnectionManager:
    """Manages WebSocket connections for real-time communication."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscriptions: Dict[WebSocket, set] = {}

    async def connect(self, websocket: WebSocket):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)
        self.subscriptions[websocket] = set()

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.subscriptions:
            del self.subscriptions[websocket]

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific client."""
        try:
            await websocket.send_json(message)
        except WebSocketDisconnect:
            self.disconnect(websocket)
        except RuntimeError as e:
            if "WebSocket is not connected" in str(e):
                self.disconnect(websocket)
            else:
                raise
        except Exception as e:
            # Log unexpected errors but don't crash
            import logging
            logging.warning(f"WebSocket send error: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: dict):
        """Broadcast a message to all connected clients."""
        disconnected = []
        for connection in self.active_connections:
            try:
                await asyncio.wait_for(
                    connection.send_json(message),
                    timeout=WEBSOCKET_TIMEOUT_SECONDS
                )
            except asyncio.TimeoutError:
                import logging
                logging.warning(f"WebSocket broadcast timeout for client {id(connection)}")
                disconnected.append(connection)
            except WebSocketDisconnect:
                disconnected.append(connection)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast_to_subscribers(self, message: dict, topic: str):
        """Broadcast a message to clients subscribed to a specific topic."""
        disconnected = []
        for connection in self.active_connections:
            try:
                if topic in self.subscriptions.get(connection, set()):
                    await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

    def subscribe(self, websocket: WebSocket, topic: str):
        """Subscribe a client to a topic."""
        if websocket in self.subscriptions:
            self.subscriptions[websocket].add(topic)

    def unsubscribe(self, websocket: WebSocket, topic: str):
        """Unsubscribe a client from a topic."""
        if websocket in self.subscriptions:
            self.subscriptions[websocket].discard(topic)


manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup: start background tasks
    broadcast_task = asyncio.create_task(broadcast_market_data())
    yield
    # Shutdown: cancel background tasks
    broadcast_task.cancel()
    try:
        await broadcast_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
    default_response_class=JSONResponse,
)


@app.middleware("http")
async def timeout_middleware(request: Request, call_next):
    """Add timeout to all HTTP requests."""
    try:
        response = await asyncio.wait_for(
            call_next(request),
            timeout=REQUEST_TIMEOUT_SECONDS
        )
        return response
    except asyncio.TimeoutError:
        return JSONResponse(
            status_code=504,
            content={"detail": "Request timeout", "error": "timeout"}
        )

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(data.router, prefix="/api/v1/data", tags=["data"])
app.include_router(factors.router, prefix="/api/v1/factors", tags=["factors"])
app.include_router(strategy.router, prefix="/api/v1/strategy", tags=["strategy"])
app.include_router(risk.router, prefix="/api/v1/risk", tags=["risk"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.APP_VERSION}


@app.websocket("/ws/realtime")
async def websocket_realtime(websocket: WebSocket):
    """WebSocket endpoint for real-time tick data."""
    await manager.connect(websocket)
    client_id = f"client_{id(websocket)}"
    try:
        await manager.send_personal_message({
            "type": "connected",
            "client_id": client_id,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }, websocket)

        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                await handle_client_message(websocket, message)
            except json.JSONDecodeError:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Invalid JSON format"
                }, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def handle_client_message(websocket: WebSocket, message: dict):
    """Process incoming client messages."""
    msg_type = message.get("type")

    if msg_type == "subscribe":
        topic = message.get("topic", "market")
        manager.subscribe(websocket, topic)
        await manager.send_personal_message({
            "type": "subscribed",
            "topic": topic
        }, websocket)

    elif msg_type == "unsubscribe":
        topic = message.get("topic", "market")
        manager.unsubscribe(websocket, topic)
        await manager.send_personal_message({
            "type": "unsubscribed",
            "topic": topic
        }, websocket)

    elif msg_type == "ping":
        await manager.send_personal_message({
            "type": "pong",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }, websocket)

    elif msg_type == "get_status":
        await manager.send_personal_message({
            "type": "status",
            "connections": len(manager.active_connections),
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }, websocket)


# Base market data for simulation
_base_price = 2344.50


async def broadcast_market_data():
    """Background task to broadcast market data every second."""
    global _base_price
    while True:
        try:
            await asyncio.sleep(1)

            # Simulate price movement
            change = random.uniform(-0.5, 0.5)
            _base_price += change
            _base_price = max(2300, min(2400, _base_price))

            bid = round(_base_price, 2)
            ask = round(_base_price + random.uniform(0.01, 0.03), 2)

            market_data = {
                "type": "market",
                "symbol": "XAUUSD",
                "bid": bid,
                "ask": ask,
                "spread": round(ask - bid, 2),
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }

            await manager.broadcast_to_subscribers(market_data, "market")

        except asyncio.CancelledError:
            break
        except Exception:
            continue


async def broadcast_cleaning_progress(
    progress: float,
    processed: int,
    total: int,
    speed: float,
    stage: str = "cleaning"
):
    """Broadcast data cleaning progress to all subscribers."""
    message = {
        "type": "cleaning_progress",
        "progress": round(progress, 2),
        "processed": processed,
        "total": total,
        "speed": f"{speed:.0f} ticks/sec",
        "stage": stage,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    await manager.broadcast_to_subscribers(message, "cleaning")


async def broadcast_system_status(
    component: str,
    status: str,
    latency_ms: Optional[float] = None
):
    """Broadcast system component status."""
    message = {
        "type": "system_status",
        "component": component,
        "status": status,
        "latency_ms": latency_ms,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    await manager.broadcast_to_subscribers(message, "system")


@app.get("/ws/connections")
async def get_connection_count():
    """Get the current number of active WebSocket connections."""
    return {
        "active_connections": len(manager.active_connections),
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
