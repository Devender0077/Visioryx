"""
Runtime app settings stored in PostgreSQL (overrides env defaults).
Used from sync capture threads — keep reads in-memory after init / PATCH.
"""
from __future__ import annotations

import threading
from typing import Any, Optional

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.core.logger import get_logger
from app.database.models import AppSetting

logger = get_logger("runtime_app_settings")

KEY_YOLO_OBJECT_DETECTION = "yolo_object_detection_overlay"
KEY_MOBILE_APP_VERSION = "mobile_app_version"
KEY_MOBILE_APP_IOS_URL = "mobile_app_ios_url"
KEY_MOBILE_APP_ANDROID_URL = "mobile_app_android_url"

_engine = None
_SessionLocal: Optional[sessionmaker] = None
_lock = threading.Lock()

# None = no DB row (follow STREAM_ENABLE_YOLO_OVERLAY); True/False = explicit DB value
_yolo_overlay_db: Optional[bool] = None


def _get_session_factory():
    global _engine, _SessionLocal
    if _SessionLocal is not None:
        return _SessionLocal
    with _lock:
        if _SessionLocal is None:
            settings = get_settings()
            _engine = create_engine(settings.DATABASE_URL_SYNC, pool_pre_ping=True)
            _SessionLocal = sessionmaker(bind=_engine, autoflush=False)
    return _SessionLocal


def _get_setting(key: str) -> Optional[dict[str, Any]]:
    try:
        SessionLocal = _get_session_factory()
        with SessionLocal() as db:
            row = db.execute(select(AppSetting).where(AppSetting.key == key)).scalars().first()
            if row is None:
                return None
            return dict(row.value) if isinstance(row.value, dict) else {}
    except Exception as e:
        logger.warning("app_settings read failed: %s", e)
        return None


def _upsert_setting(key: str, value: dict[str, Any]) -> None:
    SessionLocal = _get_session_factory()
    with SessionLocal() as db:
        row = db.execute(select(AppSetting).where(AppSetting.key == key)).scalar_one_or_none()
        if row is None:
            db.add(AppSetting(key=key, value=value))
        else:
            row.value = value
        db.commit()


def load_from_database() -> None:
    """Call on API startup. Safe if table missing (migration not applied)."""
    global _yolo_overlay_db
    raw = _get_setting(KEY_YOLO_OBJECT_DETECTION)
    if raw is None:
        _yolo_overlay_db = None
    else:
        _yolo_overlay_db = bool(raw.get("enabled"))


def get_yolo_object_detection_enabled() -> bool:
    """Effective YOLO overlay flag: DB override if set, else env STREAM_ENABLE_YOLO_OVERLAY."""
    env = get_settings().STREAM_ENABLE_YOLO_OVERLAY
    if _yolo_overlay_db is not None:
        return _yolo_overlay_db
    return env


def yolo_object_detection_from_database() -> bool:
    """True if a DB row exists (UI: show that env is overridden)."""
    return _yolo_overlay_db is not None


def get_yolo_object_detection_state() -> tuple[bool, bool]:
    """Returns (effective_enabled, has_database_override)."""
    return get_yolo_object_detection_enabled(), _yolo_overlay_db is not None


def set_yolo_object_detection_enabled(enabled: bool) -> None:
    """Admin: persist and update in-memory cache."""
    global _yolo_overlay_db
    _upsert_setting(KEY_YOLO_OBJECT_DETECTION, {"enabled": True if enabled else False})
    _yolo_overlay_db = True if enabled else False


def clear_yolo_database_override() -> None:
    """Remove DB row; fall back to env STREAM_ENABLE_YOLO_OVERLAY."""
    global _yolo_overlay_db
    try:
        SessionLocal = _get_session_factory()
        with SessionLocal() as db:
            row = db.execute(
                select(AppSetting).where(AppSetting.key == KEY_YOLO_OBJECT_DETECTION)
            ).scalars().first()
            if row:
                db.delete(row)
                db.commit()
    except Exception as e:
        logger.warning("clear yolo override failed: %s", e)
    _yolo_overlay_db = None


def get_mobile_app_settings() -> tuple[str, str, str]:
    """Get mobile app version and download URLs."""
    settings = get_settings()
    version = _get_setting(KEY_MOBILE_APP_VERSION) or {}
    ios_url = _get_setting(KEY_MOBILE_APP_IOS_URL) or {}
    android_url = _get_setting(KEY_MOBILE_APP_ANDROID_URL) or {}
    return (
        version.get("value") or settings.MOBILE_APP_VERSION,
        ios_url.get("value") or settings.MOBILE_APP_IOS_URL,
        android_url.get("value") or settings.MOBILE_APP_ANDROID_URL,
    )


def set_mobile_app_settings(version: Optional[str] = None, ios_url: Optional[str] = None, android_url: Optional[str] = None) -> None:
    """Set mobile app version and download URLs."""
    def _save(key: str, value: Optional[str]):
        if value is None:
            return
        try:
            SessionLocal = _get_session_factory()
            with SessionLocal() as db:
                row = db.execute(select(AppSetting).where(AppSetting.key == key)).scalars().first()
                if row:
                    row.value = {"value": value}
                else:
                    row = AppSetting(key=key, value={"value": value})
                    db.add(row)
                db.commit()
        except Exception as e:
            logger.warning(f"set {key} failed: %s", e)
    
    if version is not None:
        _save(KEY_MOBILE_APP_VERSION, version)
    if ios_url is not None:
        _save(KEY_MOBILE_APP_IOS_URL, ios_url)
    if android_url is not None:
        _save(KEY_MOBILE_APP_ANDROID_URL, android_url)


def get_app_settings(key: str) -> Optional[dict[str, Any]]:
    """Get arbitrary app setting by key."""
    return _get_setting(key)


def set_app_settings(key: str, value: dict[str, Any]) -> None:
    """Set arbitrary app setting by key."""
    _upsert_setting(key, value)
