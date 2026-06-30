"""VisionaryX — AI Surveillance Backend (MongoDB).

Single-file FastAPI app that powers the React Native (web + mobile) client.
Heavy AI/face-recognition pipeline is stubbed for now; this provides the full
data surface (auth, analytics, cameras, alerts, detections, users, audit, ws)
so the UI can be exercised end-to-end.
"""
from __future__ import annotations

import asyncio
import json
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any, Literal

import bcrypt
import jwt
from dotenv import load_dotenv

load_dotenv()  # MUST run before any os.environ.get downstream

from fastapi import Depends, FastAPI, HTTPException, Query, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr, Field

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
APP_NAME = "VisionaryX"
APP_VERSION = "2.0.0"
API_PREFIX = "/api/v1"
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_DEFAULT_DAYS = 1
ACCESS_TOKEN_REMEMBER_DAYS = 30

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "visionaryx")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@visionaryx.dev")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "VisionX2025!")
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")

# ---------------------------------------------------------------------------
# DB
# ---------------------------------------------------------------------------
_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not initialised")
    return _db


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------
async def write_audit(
    *,
    action: str,
    actor: dict[str, Any] | None = None,
    resource_type: str | None = None,
    resource_id: str | None = None,
    detail: dict[str, Any] | None = None,
    request: Request | None = None,
) -> None:
    """Persist an audit event. Safe to call from any route — failures are
    swallowed so audit issues never break the user-facing action.

    `actor` is the decoded JWT payload (id + email + role). `action` follows
    a dotted noun: `auth.login`, `users.create`, `settings.email.update`, …
    """
    try:
        db = get_db()
    except RuntimeError:
        return
    try:
        ip = None
        if request is not None:
            xff = request.headers.get("x-forwarded-for")
            ip = (xff.split(",")[0].strip() if xff else (request.client.host if request.client else None))
        await db.audit_logs.insert_one({
            "_id": str(uuid.uuid4()),
            "actor_id": (actor or {}).get("id") or (actor or {}).get("sub"),
            "actor_email": (actor or {}).get("email"),
            "actor_role": (actor or {}).get("role"),
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "detail": detail or {},
            "ip": ip,
            "created_at": datetime.now(timezone.utc),
        })
    except Exception:
        # Never let audit logging break a user action.
        pass


# ---------------------------------------------------------------------------
# Security helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str, days: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=days)).timestamp()),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


async def current_user(request: Request) -> dict[str, Any]:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(auth[7:])
    user = await get_db().users.find_one({"_id": payload.get("sub")})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    user.pop("password_hash", None)
    user["id"] = user.pop("_id")
    return user


async def require_admin(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
Role = Literal["admin", "operator", "enrollee"]
Severity = Literal["critical", "high", "medium", "low", "info"]


class LoginBody(BaseModel):
    email: EmailStr
    password: str
    expires_in_days: int | None = None


class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    role: Role = "operator"
    name: str | None = None


class ForgotPasswordBody(BaseModel):
    email: EmailStr


class ChangePasswordBody(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    role: Role
    name: str | None = None
    created_at: datetime


class CameraIn(BaseModel):
    camera_name: str
    rtsp_url: str
    is_enabled: bool = True


class CameraPatch(BaseModel):
    camera_name: str | None = None
    rtsp_url: str | None = None
    is_enabled: bool | None = None


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------


async def seed(db: AsyncIOMotorDatabase) -> None:
    # admin
    admin = await db.users.find_one({"email": ADMIN_EMAIL})
    if admin is None:
        await db.users.insert_one(
            {
                "_id": str(uuid.uuid4()),
                "email": ADMIN_EMAIL,
                "password_hash": hash_password(ADMIN_PASSWORD),
                "name": "Sentinel Admin",
                "role": "admin",
                "created_at": datetime.now(timezone.utc),
            }
        )
    elif not verify_password(ADMIN_PASSWORD, admin["password_hash"]):
        await db.users.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}},
        )

    # demo operator
    if await db.users.find_one({"email": "operator@visionaryx.dev"}) is None:
        await db.users.insert_one(
            {
                "_id": str(uuid.uuid4()),
                "email": "operator@visionaryx.dev",
                "password_hash": hash_password("Operator2025!"),
                "name": "Sample Operator",
                "role": "operator",
                "created_at": datetime.now(timezone.utc),
            }
        )


# ---------------------------------------------------------------------------
# App / lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(_: FastAPI):
    global _client, _db
    _client = AsyncIOMotorClient(MONGO_URL)
    _db = _client[DB_NAME]
    # Share the DB handle with the deps module so routers can use it.
    from deps import set_db
    set_db(_db)
    await _db.users.create_index("email", unique=True)
    await _db.alerts.create_index("timestamp")
    await _db.cameras.create_index("camera_name")
    await _db.audit_logs.create_index("created_at")
    await _db.audit_logs.create_index("actor_email")
    await seed(_db)
    # System startup audit event.
    try:
        await _db.audit_logs.insert_one({
            "_id": str(uuid.uuid4()),
            "actor_id": None, "actor_email": None, "actor_role": "system",
            "action": "system.start",
            "resource_type": "service", "resource_id": APP_NAME,
            "detail": {"version": APP_VERSION},
            "ip": None,
            "created_at": datetime.now(timezone.utc),
        })
    except Exception:
        pass
    health_task = asyncio.create_task(_camera_health_loop())
    try:
        yield
    finally:
        health_task.cancel()
        try:
            await health_task
        except Exception:
            pass
        if _client is not None:
            _client.close()


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="AI Surveillance — Digital Sentinel API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS.split(",")] if CORS_ORIGINS != "*" else ["*"],
    allow_credentials=False,  # tokens flow as Authorization header, not cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount AI Studio routes (chat, agents, models, RAG, automations, MCP).
from ai_studio import build_ai_router  # noqa: E402
app.include_router(build_ai_router(API_PREFIX, current_user, require_admin, get_db))

# Mount domain routers (auth, users) — extracted from this file for cleanliness.
from routers.auth import router as auth_router  # noqa: E402
from routers.users import router as users_router  # noqa: E402
from routers.analytics import router as analytics_router  # noqa: E402
from routers.cameras import router as cameras_router  # noqa: E402
from routers.alerts import router as alerts_router  # noqa: E402
from routers.detections import router as detections_router  # noqa: E402
from routers.settings import router as settings_router  # noqa: E402
from routers.activity import router as activity_router  # noqa: E402
from routers.face import router as face_router  # noqa: E402
from routers.camera_stream import router as camera_stream_router  # noqa: E402
from routers.hls_gateway import router as hls_router  # noqa: E402
from routers.reports import router as reports_router  # noqa: E402
from routers.phone_camera import router as phone_camera_router  # noqa: E402
from routers.stream import router as stream_router  # noqa: E402

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(users_router, prefix=API_PREFIX)
app.include_router(analytics_router, prefix=API_PREFIX)
app.include_router(cameras_router, prefix=API_PREFIX)
app.include_router(alerts_router, prefix=API_PREFIX)
app.include_router(detections_router, prefix=API_PREFIX)
app.include_router(settings_router, prefix=API_PREFIX)
app.include_router(activity_router, prefix=API_PREFIX)
app.include_router(face_router, prefix=API_PREFIX)
app.include_router(camera_stream_router, prefix=API_PREFIX)
app.include_router(hls_router, prefix=API_PREFIX)
app.include_router(reports_router, prefix=API_PREFIX)
app.include_router(phone_camera_router, prefix=API_PREFIX)
app.include_router(stream_router, prefix=API_PREFIX)


# ---------------------------------------------------------------------------
# Health / meta
# ---------------------------------------------------------------------------
@app.get("/")
async def root() -> dict[str, Any]:
    return {"app": APP_NAME, "version": APP_VERSION, "status": "vigilant"}


@app.get("/health")
async def health() -> dict[str, Any]:
    return {"status": "healthy"}


@app.get(f"{API_PREFIX}/meta/version")
async def meta_version() -> dict[str, Any]:
    return {
        "backend_version": APP_VERSION,
        "app_name": APP_NAME,
        "public_api_url": os.environ.get("APP_URL", ""),
    }


# ---------------------------------------------------------------------------
# Auth, Users — extracted to routers/auth.py and routers/users.py.
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Analytics — extracted to routers/analytics.py.
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Cameras + Stream — extracted to routers/cameras.py.
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Alerts — extracted to routers/alerts.py.
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Users (admin only)
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Users endpoints — extracted to routers/users.py.
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Detections + Audit — extracted to routers/detections.py.
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Enrollment (stubbed — accepts files, returns success)
# ---------------------------------------------------------------------------
@app.post(f"{API_PREFIX}/enroll/upload-session")
async def enroll_upload(
    request: Request, _: dict[str, Any] = Depends(current_user)
) -> dict[str, Any]:
    # We accept multipart but don't run the actual recognition pipeline in this build.
    form = await request.form()
    files = form.getlist("files")
    return {
        "ok": True,
        "files_received": len(files),
        "message": "Enrollment captured. Indexing scheduled by Sentinel pipeline.",
    }


# ---------------------------------------------------------------------------
# WebSocket — realtime push for alerts/detections/system events.
# Token comes via `?token=<jwt>` query string (browsers cannot set headers
# on WebSocket handshakes).
# ---------------------------------------------------------------------------
class _Broadcaster:
    def __init__(self) -> None:
        self.connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def add(self, ws: WebSocket) -> None:
        async with self._lock:
            self.connections.add(ws)

    async def remove(self, ws: WebSocket) -> None:
        async with self._lock:
            self.connections.discard(ws)

    async def broadcast(self, payload: dict[str, Any]) -> None:
        msg = json.dumps(payload, default=str)
        dead: list[WebSocket] = []
        async with self._lock:
            for ws in list(self.connections):
                try:
                    await ws.send_text(msg)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.connections.discard(ws)


broadcaster = _Broadcaster()


@app.websocket(f"{API_PREFIX}/ws")
async def ws_endpoint(websocket: WebSocket, token: str | None = Query(None)) -> None:
    if not token:
        await websocket.close(code=4401)
        return
    try:
        payload = decode_token(token)
    except HTTPException:
        await websocket.close(code=4401)
        return
    user = await get_db().users.find_one({"_id": payload.get("sub")})
    if user is None:
        await websocket.close(code=4404)
        return

    await websocket.accept()
    await broadcaster.add(websocket)
    try:
        await websocket.send_text(
            json.dumps(
                {
                    "type": "system",
                    "data": {"message": "VisionaryX realtime channel open", "role": user.get("role")},
                }
            )
        )
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
                continue
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await broadcaster.remove(websocket)


async def _camera_health_loop() -> None:
    """Periodically TCP-ping each camera's RTSP host:port to flip status.

    Runs every 60s. For each enabled camera, opens a TCP connection to the
    camera's host:port with a 3s timeout. Success → status 'active', failure
    → status 'offline'. Emits a 'Camera offline' alert on each transition
    from active → offline.
    """
    import urllib.parse
    await asyncio.sleep(20)
    while True:
        try:
            db = get_db()
            cams = await db.cameras.find({"is_enabled": True}).to_list(None)
            for cam in cams:
                url = cam.get("rtsp_url", "")
                if not url:
                    continue
                try:
                    parsed = urllib.parse.urlparse(url)
                    host = parsed.hostname
                    port = parsed.port or (443 if parsed.scheme.endswith("s") else
                                            80 if parsed.scheme.startswith("http") else 554)
                except Exception:
                    host, port = None, None
                if not host:
                    continue
                ok = False
                try:
                    reader, writer = await asyncio.wait_for(
                        asyncio.open_connection(host, port), timeout=3.0,
                    )
                    writer.close()
                    try:
                        await writer.wait_closed()
                    except Exception:
                        pass
                    ok = True
                except Exception:
                    ok = False
                target_status = "active" if ok else "offline"
                previous = cam.get("status")
                if previous != target_status:
                    await db.cameras.update_one(
                        {"_id": cam["_id"]},
                        {"$set": {"status": target_status,
                                  "last_health_check": datetime.now(timezone.utc)}},
                    )
                    if target_status == "offline":
                        await db.alerts.insert_one({
                            "_id": str(uuid.uuid4()),
                            "alert_type": "Camera offline",
                            "severity": "medium",
                            "message": f"{cam.get('camera_name', 'Camera')} stopped responding at {host}:{port}",
                            "is_read": False,
                            "timestamp": datetime.now(timezone.utc),
                            "camera_id": cam["_id"],
                            "camera_name": cam.get("camera_name"),
                        })
        except asyncio.CancelledError:
            raise
        except Exception:
            pass
        await asyncio.sleep(60)


# ---------------------------------------------------------------------------
# Analytics extras + Settings — extracted to routers/{analytics,settings}.py
# ---------------------------------------------------------------------------


# enrollment-link, patch_user, UserPatch — extracted to routers/users.py


# ---------------------------------------------------------------------------
# Global error handler — make sure FastAPI 422 errors are still json
# ---------------------------------------------------------------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

