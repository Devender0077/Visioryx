"""VisionaryX — AI Surveillance Backend (MongoDB).

Single-file FastAPI app that powers the React Native (web + mobile) client.
Heavy AI/face-recognition pipeline is stubbed for now; this provides the full
data surface (auth, analytics, cameras, alerts, detections, users, audit)
so the UI can be exercised end-to-end.
"""
from __future__ import annotations

import os
import random
import secrets
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any, Literal

import bcrypt
import jwt
from dotenv import load_dotenv

load_dotenv()  # MUST run before any os.environ.get downstream

from fastapi import Depends, FastAPI, HTTPException, Query, Request, status
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
DEMO_CAMERAS = [
    ("Front Gate", "rtsp://10.0.1.21:554/stream/main"),
    ("Lobby East", "rtsp://10.0.1.22:554/stream/main"),
    ("Parking A1", "rtsp://10.0.1.23:554/stream/main"),
    ("Server Room", "rtsp://10.0.1.24:554/stream/main"),
    ("Loading Bay", "rtsp://10.0.1.25:554/stream/main"),
    ("Rooftop North", "rtsp://10.0.1.26:554/stream/main"),
]
DEMO_ALERT_TYPES = [
    ("Unrecognized entry", "high", "Unknown person detected at perimeter"),
    ("Camera offline", "medium", "Stream lost — auto-reconnect attempted"),
    ("Face match", "info", "Known operator entered restricted area"),
    ("Loitering detected", "medium", "Subject lingering > 60s near node"),
    ("System maintenance", "low", "Background indexing complete"),
    ("Forced entry", "critical", "Tamper attempt on locked node"),
]


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

    # cameras
    if await db.cameras.count_documents({}) == 0:
        await db.cameras.insert_many(
            [
                {
                    "_id": str(uuid.uuid4()),
                    "camera_name": name,
                    "rtsp_url": url,
                    "is_enabled": idx not in (4,),  # one disabled
                    "status": "active" if idx not in (3, 4) else "offline",
                    "created_at": datetime.now(timezone.utc),
                }
                for idx, (name, url) in enumerate(DEMO_CAMERAS)
            ]
        )

    # alerts (last 48 hours, ~24 items)
    if await db.alerts.count_documents({}) == 0:
        now = datetime.now(timezone.utc)
        camera_docs = await db.cameras.find().to_list(None)
        docs = []
        for i in range(24):
            t, sev, msg = random.choice(DEMO_ALERT_TYPES)
            cam = random.choice(camera_docs)
            docs.append(
                {
                    "_id": str(uuid.uuid4()),
                    "alert_type": t,
                    "severity": sev,
                    "message": msg,
                    "is_read": i > 7,
                    "timestamp": now - timedelta(minutes=random.randint(2, 60 * 48)),
                    "camera_id": cam["_id"],
                    "camera_name": cam["camera_name"],
                }
            )
        await db.alerts.insert_many(docs)

    # detection trend (last 30 days)
    if await db.detection_trends.count_documents({}) == 0:
        now = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        docs = [
            {
                "_id": str(uuid.uuid4()),
                "date": (now - timedelta(days=i)).isoformat(),
                "count": random.randint(40, 380),
            }
            for i in range(30)
        ]
        await db.detection_trends.insert_many(docs)


# ---------------------------------------------------------------------------
# App / lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(_: FastAPI):
    global _client, _db
    _client = AsyncIOMotorClient(MONGO_URL)
    _db = _client[DB_NAME]
    await _db.users.create_index("email", unique=True)
    await _db.alerts.create_index("timestamp")
    await _db.cameras.create_index("camera_name")
    await seed(_db)
    yield
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
# Auth
# ---------------------------------------------------------------------------
@app.post(f"{API_PREFIX}/auth/login", response_model=TokenResponse)
async def login(body: LoginBody) -> TokenResponse:
    db = get_db()
    user = await db.users.find_one({"email": body.email.lower()})
    if user is None or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    days = ACCESS_TOKEN_REMEMBER_DAYS if (body.expires_in_days or 0) >= 30 else ACCESS_TOKEN_DEFAULT_DAYS
    token = create_access_token(user["_id"], user["email"], user["role"], days)
    return TokenResponse(access_token=token, expires_in=days * 86400)


@app.post(f"{API_PREFIX}/auth/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterBody) -> TokenResponse:
    db = get_db()
    if await db.users.find_one({"email": body.email.lower()}) is not None:
        raise HTTPException(status_code=409, detail="Email already registered")
    user_doc = {
        "_id": str(uuid.uuid4()),
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": body.role,
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(user_doc)
    token = create_access_token(user_doc["_id"], user_doc["email"], user_doc["role"], ACCESS_TOKEN_DEFAULT_DAYS)
    return TokenResponse(access_token=token, expires_in=ACCESS_TOKEN_DEFAULT_DAYS * 86400)


@app.post(f"{API_PREFIX}/auth/forgot-password")
async def forgot_password(body: ForgotPasswordBody) -> dict[str, Any]:
    # We don't reveal whether the email exists — always return success.
    db = get_db()
    user = await db.users.find_one({"email": body.email.lower()})
    if user is not None:
        token = secrets.token_urlsafe(32)
        await db.password_resets.insert_one(
            {
                "_id": str(uuid.uuid4()),
                "user_id": user["_id"],
                "token": token,
                "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
                "used": False,
            }
        )
    return {"ok": True, "message": "If that email exists, a reset link has been sent."}


@app.post(f"{API_PREFIX}/auth/change-password")
async def change_password(body: ChangePasswordBody, user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    db = get_db()
    full = await db.users.find_one({"_id": user["id"]})
    if full is None or not verify_password(body.current_password, full["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one(
        {"_id": user["id"]},
        {"$set": {"password_hash": hash_password(body.new_password)}},
    )
    return {"ok": True}


@app.get(f"{API_PREFIX}/auth/me", response_model=UserPublic)
async def me(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return user


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------
@app.get(f"{API_PREFIX}/analytics/overview")
async def analytics_overview(_: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    db = get_db()
    total_users = await db.users.count_documents({})
    total_cameras = await db.cameras.count_documents({})
    active_cameras = await db.cameras.count_documents({"is_enabled": True, "status": "active"})
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    detections_today = await db.alerts.count_documents({"timestamp": {"$gte": today_start}})
    unknown_today = await db.alerts.count_documents(
        {"timestamp": {"$gte": today_start}, "alert_type": "Unrecognized entry"}
    )
    return {
        "total_users": total_users,
        "total_cameras": total_cameras,
        "active_cameras": active_cameras,
        "detections_today": detections_today,
        "unknown_detections_today": unknown_today,
        "detection_trend_7d": random.randint(8, 24),
    }


@app.get(f"{API_PREFIX}/analytics/detection-trends")
async def detection_trends(
    days: int = Query(7, ge=1, le=90),
    _: dict[str, Any] = Depends(current_user),
) -> list[dict[str, Any]]:
    db = get_db()
    docs = await db.detection_trends.find().sort("date", -1).to_list(days)
    docs.reverse()
    return [{"date": d["date"], "count": d["count"]} for d in docs]


# ---------------------------------------------------------------------------
# Cameras
# ---------------------------------------------------------------------------
def _camera_public(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": doc["_id"],
        "camera_name": doc["camera_name"],
        "rtsp_url": doc["rtsp_url"],
        "is_enabled": doc.get("is_enabled", True),
        "status": doc.get("status", "active"),
    }


@app.get(f"{API_PREFIX}/cameras")
async def list_cameras(_: dict[str, Any] = Depends(current_user)) -> list[dict[str, Any]]:
    db = get_db()
    docs = await db.cameras.find().to_list(None)
    return [_camera_public(d) for d in docs]


@app.post(f"{API_PREFIX}/cameras", status_code=201)
async def create_camera(body: CameraIn, _: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    db = get_db()
    doc = {
        "_id": str(uuid.uuid4()),
        "camera_name": body.camera_name,
        "rtsp_url": body.rtsp_url,
        "is_enabled": body.is_enabled,
        "status": "active" if body.is_enabled else "offline",
        "created_at": datetime.now(timezone.utc),
    }
    await db.cameras.insert_one(doc)
    return _camera_public(doc)


@app.patch(f"{API_PREFIX}/cameras/{{camera_id}}")
async def patch_camera(
    camera_id: str, body: CameraPatch, _: dict[str, Any] = Depends(require_admin)
) -> dict[str, Any]:
    db = get_db()
    update = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "is_enabled" in update:
        update["status"] = "active" if update["is_enabled"] else "offline"
    result = await db.cameras.find_one_and_update(
        {"_id": camera_id}, {"$set": update}, return_document=True
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    return _camera_public(result)


@app.delete(f"{API_PREFIX}/cameras/{{camera_id}}")
async def delete_camera(camera_id: str, _: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    db = get_db()
    r = await db.cameras.delete_one({"_id": camera_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Camera not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Stream (stub)
# ---------------------------------------------------------------------------
@app.get(f"{API_PREFIX}/stream/status")
async def stream_status(_: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    db = get_db()
    docs = await db.cameras.find({"is_enabled": True, "status": "active"}).to_list(None)
    return {"active_camera_ids": [d["_id"] for d in docs]}


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------
def _alert_public(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": doc["_id"],
        "alert_type": doc["alert_type"],
        "severity": doc.get("severity", "info"),
        "message": doc.get("message", ""),
        "is_read": doc.get("is_read", False),
        "timestamp": doc["timestamp"].isoformat() if isinstance(doc["timestamp"], datetime) else doc["timestamp"],
        "camera_id": doc.get("camera_id"),
        "camera_name": doc.get("camera_name"),
    }


@app.get(f"{API_PREFIX}/alerts")
async def list_alerts(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    q: str | None = None,
    severity: str | None = None,
    camera_id: str | None = None,
    today_only: bool = False,
    _: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    db = get_db()
    flt: dict[str, Any] = {}
    if q:
        flt["$or"] = [
            {"alert_type": {"$regex": q, "$options": "i"}},
            {"message": {"$regex": q, "$options": "i"}},
        ]
    if severity and severity.lower() != "all":
        flt["severity"] = severity.lower()
    if camera_id:
        flt["camera_id"] = camera_id
    if today_only:
        flt["timestamp"] = {
            "$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        }
    total = await db.alerts.count_documents(flt)
    items = (
        await db.alerts.find(flt).sort("timestamp", -1).skip(offset).limit(limit).to_list(limit)
    )
    return {"items": [_alert_public(i) for i in items], "total": total}


@app.patch(f"{API_PREFIX}/alerts/{{alert_id}}/read")
async def mark_alert_read(alert_id: str, _: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    db = get_db()
    r = await db.alerts.find_one_and_update(
        {"_id": alert_id}, {"$set": {"is_read": True}}, return_document=True
    )
    if r is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return _alert_public(r)


@app.post(f"{API_PREFIX}/alerts/mark-all-read")
async def mark_all_alerts_read(_: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    db = get_db()
    r = await db.alerts.update_many({"is_read": False}, {"$set": {"is_read": True}})
    return {"modified": r.modified_count}


# ---------------------------------------------------------------------------
# Users (admin only)
# ---------------------------------------------------------------------------
@app.get(f"{API_PREFIX}/users")
async def list_users(_: dict[str, Any] = Depends(require_admin)) -> list[dict[str, Any]]:
    db = get_db()
    docs = await db.users.find().sort("created_at", -1).to_list(None)
    return [
        {
            "id": d["_id"],
            "email": d["email"],
            "role": d.get("role", "operator"),
            "name": d.get("name"),
            "created_at": d["created_at"].isoformat()
            if isinstance(d.get("created_at"), datetime)
            else d.get("created_at"),
        }
        for d in docs
    ]


@app.post(f"{API_PREFIX}/users", status_code=201)
async def create_user(body: RegisterBody, _: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    db = get_db()
    if await db.users.find_one({"email": body.email.lower()}) is not None:
        raise HTTPException(status_code=409, detail="Email already registered")
    doc = {
        "_id": str(uuid.uuid4()),
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": body.role,
        "created_at": datetime.now(timezone.utc),
    }
    await db.users.insert_one(doc)
    return {
        "id": doc["_id"],
        "email": doc["email"],
        "role": doc["role"],
        "name": doc["name"],
        "created_at": doc["created_at"].isoformat(),
    }


@app.delete(f"{API_PREFIX}/users/{{user_id}}")
async def delete_user(user_id: str, admin: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    db = get_db()
    r = await db.users.delete_one({"_id": user_id})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Detections / audit (stubbed lists)
# ---------------------------------------------------------------------------
@app.get(f"{API_PREFIX}/detections")
async def list_detections(
    limit: int = Query(50, ge=1, le=200),
    _: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    """Recent detections — we reuse the alerts collection as the events log."""
    db = get_db()
    docs = await db.alerts.find().sort("timestamp", -1).limit(limit).to_list(limit)
    return {
        "items": [
            {
                "id": d["_id"],
                "kind": "face" if "Face" in d["alert_type"] or "entry" in d["alert_type"] else "object",
                "name": "Operator" if "Face" in d["alert_type"] else "Unknown",
                "confidence": round(random.uniform(0.72, 0.98), 2),
                "camera_name": d.get("camera_name"),
                "timestamp": d["timestamp"].isoformat() if isinstance(d["timestamp"], datetime) else d["timestamp"],
            }
            for d in docs
        ],
        "total": await db.alerts.count_documents({}),
    }


@app.get(f"{API_PREFIX}/audit")
async def list_audit(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return {
        "items": [
            {
                "id": str(uuid.uuid4()),
                "actor": ADMIN_EMAIL,
                "action": "system.start",
                "target": "visionaryx-backend",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ],
        "total": 1,
    }


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
# Global error handler — make sure FastAPI 422 errors are still json
# ---------------------------------------------------------------------------
@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
