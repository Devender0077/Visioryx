"""
Visioryx - AI Powered Real-Time Face Recognition & Surveillance System
Main FastAPI application entry point.
"""
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logger import setup_logger

settings = get_settings()
logger = setup_logger("visioryx")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    from app.services.detection_log_queue import start_queue_processor
    _detection_task = start_queue_processor()
    yield
    _detection_task.cancel()
    try:
        await _detection_task
    except asyncio.CancelledError:
        pass
    logger.info("Shutting down Visioryx")


app = FastAPI(
    title=settings.APP_NAME,
    description="AI Powered Real-Time Face Recognition & Surveillance System",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health")
async def health():
    """Health check for load balancers."""
    return {"status": "healthy"}


@app.get("/health/db")
async def health_db():
    """Database connectivity check."""
    try:
        from sqlalchemy import text
        from app.database.connection import AsyncSessionLocal

        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}


# API routes
from app.api import auth, users, cameras, detections, analytics, alerts
from app.core.websocket_manager import ws_manager

app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_PREFIX}/users", tags=["users"])
app.include_router(cameras.router, prefix=f"{settings.API_V1_PREFIX}/cameras", tags=["cameras"])
app.include_router(detections.router, prefix=f"{settings.API_V1_PREFIX}/detections", tags=["detections"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_PREFIX}/analytics", tags=["analytics"])
app.include_router(alerts.router, prefix=f"{settings.API_V1_PREFIX}/alerts", tags=["alerts"])
from app.api import stream

app.include_router(stream.router, prefix=f"{settings.API_V1_PREFIX}/stream", tags=["stream"])
logger.info("Stream API registered: /api/v1/stream/{camera_id}/start, /stop, /mjpeg")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time events."""
    import uuid
    client_id = str(uuid.uuid4())
    await ws_manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Heartbeat / keepalive
            if data == "ping":
                await websocket.send_text("pong")
    except Exception:
        pass
    finally:
        ws_manager.disconnect(client_id)
