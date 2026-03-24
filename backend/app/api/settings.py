"""
Dashboard settings API — persisted preferences (admin).
"""
from typing import Optional

from pydantic import BaseModel, Field

from fastapi import APIRouter, HTTPException

from app.api.deps import AdminUser, SurveillanceUser
from app.services.runtime_app_settings import (
    clear_yolo_database_override,
    get_yolo_object_detection_state,
    set_yolo_object_detection_enabled,
)

router = APIRouter()


class AppSettingsResponse(BaseModel):
    yolo_object_detection_enabled: bool
    """Effective on/off for YOLO object detection on live streams."""

    yolo_object_detection_from_database: bool
    """True if stored in DB; False means STREAM_ENABLE_YOLO_OVERLAY from environment is used."""

    can_edit: bool
    """True for admin — operators see current state only."""


class AppSettingsPatch(BaseModel):
    yolo_object_detection_enabled: Optional[bool] = Field(
        default=None,
        description="Turn YOLO object detection overlay on or off.",
    )
    use_environment_default_for_yolo: bool = Field(
        default=False,
        description="If true, remove DB override and use STREAM_ENABLE_YOLO_OVERLAY from .env",
    )


@router.get("", response_model=AppSettingsResponse)
async def get_app_settings(current_user: SurveillanceUser):
    """Current detection preferences (any authenticated user)."""
    enabled, from_db = get_yolo_object_detection_state()
    is_admin = current_user.role == "admin"
    return AppSettingsResponse(
        yolo_object_detection_enabled=enabled,
        yolo_object_detection_from_database=from_db,
        can_edit=is_admin,
    )


@router.patch("", response_model=AppSettingsResponse)
async def patch_app_settings(
    body: AppSettingsPatch,
    current_user: AdminUser,
):
    """Update persisted settings (admin only)."""
    if body.use_environment_default_for_yolo:
        clear_yolo_database_override()
    elif body.yolo_object_detection_enabled is not None:
        set_yolo_object_detection_enabled(body.yolo_object_detection_enabled)
    else:
        raise HTTPException(status_code=400, detail="No changes provided")
    enabled, from_db = get_yolo_object_detection_state()
    return AppSettingsResponse(
        yolo_object_detection_enabled=enabled,
        yolo_object_detection_from_database=from_db,
        can_edit=True,
    )
