"""Settings endpoints — SMTP email config + test."""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from deps import get_db, require_admin, write_audit

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
async def get_all_settings(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    """Aggregate all detection settings for the settings dashboard."""
    db = get_db()
    doc = await db.settings.find_one({"_id": "detection_overlays"}) or {}
    return {
        "face_detection_enabled": doc.get("face_detection_enabled", True),
        "face_detection_from_database": bool(doc.get("face_detection_enabled") is not None),
        "yolo_object_detection_enabled": doc.get("yolo_object_detection_enabled", False),
        "yolo_object_detection_from_database": bool(doc.get("yolo_object_detection_enabled") is not None),
        "person_detection_enabled": doc.get("person_detection_enabled", False),
        "person_detection_from_database": bool(doc.get("person_detection_enabled") is not None),
        "can_edit": True,
        "mobile_app_version": "",
        "mobile_app_ios_url": "",
        "mobile_app_android_url": "",
        "mediamtx_url": "",
        "mediamtx_ws_url": "",
        "mediamtx_api_url": "",
        "public_api_url": "",
    }


class AppSettingsPatch(BaseModel):
    yolo_object_detection_enabled: bool | None = None
    face_detection_enabled: bool | None = None
    person_detection_enabled: bool | None = None
    use_environment_default_for_yolo: bool = False
    use_environment_default_for_face: bool = False
    use_environment_default_for_person: bool = False


@router.patch("")
async def patch_all_settings(
    body: AppSettingsPatch,
    _: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    db = get_db()
    update: dict[str, Any] = {}
    if body.use_environment_default_for_face:
        update["face_detection_enabled"] = None
    elif body.face_detection_enabled is not None:
        update["face_detection_enabled"] = body.face_detection_enabled
    if body.use_environment_default_for_yolo:
        update["yolo_object_detection_enabled"] = None
    elif body.yolo_object_detection_enabled is not None:
        update["yolo_object_detection_enabled"] = body.yolo_object_detection_enabled
    if body.use_environment_default_for_person:
        update["person_detection_enabled"] = None
    elif body.person_detection_enabled is not None:
        update["person_detection_enabled"] = body.person_detection_enabled

    if update:
        await db.settings.update_one(
            {"_id": "detection_overlays"},
            {"$set": update},
            upsert=True,
        )
    doc = await db.settings.find_one({"_id": "detection_overlays"}) or {}
    return {
        "face_detection_enabled": doc.get("face_detection_enabled", True),
        "face_detection_from_database": bool("face_detection_enabled" in doc),
        "yolo_object_detection_enabled": doc.get("yolo_object_detection_enabled", False),
        "yolo_object_detection_from_database": bool("yolo_object_detection_enabled" in doc),
        "person_detection_enabled": doc.get("person_detection_enabled", False),
        "person_detection_from_database": bool("person_detection_enabled" in doc),
        "can_edit": True,
        "mobile_app_version": "",
        "mobile_app_ios_url": "",
        "mobile_app_android_url": "",
        "mediamtx_url": "",
        "mediamtx_ws_url": "",
        "mediamtx_api_url": "",
        "public_api_url": "",
    }


class EmailSettingsPatch(BaseModel):
    enabled: bool | None = None
    host: str | None = None
    port: int | None = None
    user: str | None = None
    smtp_password: str | None = None
    from_email: str | None = None
    from_name: str | None = None
    use_tls: bool | None = None
    use_ssl: bool | None = None
    public_base_url: str | None = None


@router.get("/email")
async def settings_email(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    db = get_db()
    doc = await db.settings.find_one({"_id": "email"}) or {}
    return {
        "enabled": doc.get("enabled", False),
        "host": doc.get("host", ""),
        "port": doc.get("port", 587),
        "user": doc.get("user", ""),
        "from_email": doc.get("from_email", ""),
        "from_name": doc.get("from_name", "VisionaryX Alerts"),
        "use_tls": doc.get("use_tls", True),
        "use_ssl": doc.get("use_ssl", False),
        "public_base_url": doc.get("public_base_url", ""),
        "password_configured": bool(doc.get("password")),
        "public_dashboard_url_default": os.environ.get("APP_URL", ""),
    }


@router.patch("/email")
async def settings_email_patch(
    body: EmailSettingsPatch, request: Request, admin: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    db = get_db()
    update: dict[str, Any] = {}
    changed: list[str] = []
    for k, v in body.model_dump(exclude_none=True).items():
        if k == "smtp_password":
            update["password"] = v
            changed.append("password")
        else:
            update[k] = v
            changed.append(k)
    update["updated_at"] = datetime.now(timezone.utc)
    await db.settings.update_one({"_id": "email"}, {"$set": update}, upsert=True)
    await write_audit(
        action="settings.email.update", actor=admin, request=request,
        resource_type="settings", resource_id="email",
        detail={"fields": changed},
    )
    return {"ok": True}


@router.post("/email/test")
async def settings_email_test(
    body: dict[str, str], _: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    to = body.get("to", "")
    if not to:
        raise HTTPException(status_code=400, detail="Missing 'to' address")
    return {"ok": True, "to": to, "mocked": True}


# ---------------------------------------------------------------------------
# Bridge (stub — full implementation requires the PostgreSQL backend)
# ---------------------------------------------------------------------------
@router.get("/bridge")
async def settings_bridge(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return {
        "enabled": False,
        "token": None,
        "container_name": None,
        "agent_url": None,
    }


@router.post("/bridge/generate")
async def settings_bridge_generate(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return {"ok": True, "token": None, "agent_url": None}


@router.post("/bridge/revoke")
async def settings_bridge_revoke(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    return {"ok": True}


# ---------------------------------------------------------------------------
# Detection overlay toggles (stored in MongoDB settings collection)
# ---------------------------------------------------------------------------
class DetectionSettingsPatch(BaseModel):
    face_detection_enabled: bool | None = None
    yolo_object_detection_enabled: bool | None = None
    person_detection_enabled: bool | None = None


@router.get("/detection")
async def get_detection_settings(_: dict[str, Any] = Depends(require_admin)) -> dict[str, Any]:
    db = get_db()
    doc = await db.settings.find_one({"_id": "detection_overlays"}) or {}
    return {
        "face_detection_enabled": doc.get("face_detection_enabled", True),
        "yolo_object_detection_enabled": doc.get("yolo_object_detection_enabled", False),
        "person_detection_enabled": doc.get("person_detection_enabled", False),
        "can_edit": True,
    }


@router.patch("/detection")
async def patch_detection_settings(
    body: DetectionSettingsPatch,
    _: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    db = get_db()
    update: dict[str, Any] = {}
    for k, v in body.model_dump(exclude_none=True).items():
        if v is not None:
            update[k] = v
    if update:
        await db.settings.update_one(
            {"_id": "detection_overlays"},
            {"$set": update},
            upsert=True,
        )
    doc = await db.settings.find_one({"_id": "detection_overlays"}) or {}
    return {
        "face_detection_enabled": doc.get("face_detection_enabled", True),
        "yolo_object_detection_enabled": doc.get("yolo_object_detection_enabled", False),
        "person_detection_enabled": doc.get("person_detection_enabled", False),
        "can_edit": True,
    }
