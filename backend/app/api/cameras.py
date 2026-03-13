"""
Visioryx - Cameras API
Camera management endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminUser
from app.database.connection import get_db
from app.database.models import Camera
from app.schemas.cameras import CameraCreate, CameraResponse, CameraUpdate

router = APIRouter()


@router.get("", response_model=list[CameraResponse])
async def list_cameras(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = None,
):
    """List all cameras."""
    result = await db.execute(select(Camera).order_by(Camera.id))
    return result.scalars().all()


@router.post("", response_model=CameraResponse)
async def create_camera(
    data: CameraCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = None,
):
    """Add a new camera."""
    camera = Camera(camera_name=data.camera_name, rtsp_url=data.rtsp_url)
    db.add(camera)
    await db.flush()
    await db.refresh(camera)
    return camera


@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = None,
):
    """Get camera by ID."""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    return camera


@router.patch("/{camera_id}", response_model=CameraResponse)
async def update_camera(
    camera_id: int,
    data: CameraUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = None,
):
    """Update camera."""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(camera, k, v)
    await db.flush()
    await db.refresh(camera)
    return camera


@router.delete("/{camera_id}")
async def delete_camera(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = None,
):
    """Delete camera."""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    await db.delete(camera)
    return {"ok": True}
