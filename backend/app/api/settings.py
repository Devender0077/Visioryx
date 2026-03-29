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
    get_mobile_app_settings,
    set_mobile_app_settings,
)

router = APIRouter()


class AppSettingsResponse(BaseModel):
    yolo_object_detection_enabled: bool
    """Effective on/off for YOLO object detection on live streams."""

    yolo_object_detection_from_database: bool
    """True if stored in DB; False means STREAM_ENABLE_YOLO_OVERLAY from environment is used."""

    can_edit: bool
    """True for admin — operators see current state only."""
    
    mobile_app_version: str
    mobile_app_ios_url: str
    mobile_app_android_url: str


class AppSettingsPatch(BaseModel):
    yolo_object_detection_enabled: Optional[bool] = Field(
        default=None,
        description="Turn YOLO object detection overlay on or off.",
    )
    use_environment_default_for_yolo: bool = Field(
        default=False,
        description="If true, remove DB override and use STREAM_ENABLE_YOLO_OVERLAY from .env",
    )
    mobile_app_version: Optional[str] = Field(
        default=None,
        description="Mobile app version for display",
    )
    mobile_app_ios_url: Optional[str] = Field(
        default=None,
        description="iOS app download URL (.ipa or App Store link)",
    )
    mobile_app_android_url: Optional[str] = Field(
        default=None,
        description="Android app download URL (.apk or Play Store link)",
    )


@router.get("", response_model=AppSettingsResponse)
async def get_app_settings(current_user: SurveillanceUser):
    """Current detection preferences (any authenticated user)."""
    enabled, from_db = get_yolo_object_detection_state()
    is_admin = current_user.role == "admin"
    mobile_version, ios_url, android_url = get_mobile_app_settings()
    return AppSettingsResponse(
        yolo_object_detection_enabled=enabled,
        yolo_object_detection_from_database=from_db,
        can_edit=is_admin,
        mobile_app_version=mobile_version,
        mobile_app_ios_url=ios_url,
        mobile_app_android_url=android_url,
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
    
    if body.mobile_app_version is not None or body.mobile_app_ios_url is not None or body.mobile_app_android_url is not None:
        set_mobile_app_settings(
            version=body.mobile_app_version,
            ios_url=body.mobile_app_ios_url,
            android_url=body.mobile_app_android_url,
        )
    
    enabled, from_db = get_yolo_object_detection_state()
    mobile_version, ios_url, android_url = get_mobile_app_settings()
    return AppSettingsResponse(
        yolo_object_detection_enabled=enabled,
        yolo_object_detection_from_database=from_db,
        can_edit=True,
        mobile_app_version=mobile_version,
        mobile_app_ios_url=ios_url,
        mobile_app_android_url=android_url,
    )
