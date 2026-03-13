"""
Visioryx - MJPEG Stream API
Live camera feed endpoints.
"""
import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.security import decode_access_token
from app.database.connection import get_db
from app.database.models import Camera
from app.services.stream_manager import get_frame, is_streaming, start_stream, stop_stream

router = APIRouter()


def _verify_stream_token(token: Optional[str]) -> bool:
    """Verify token for img src (browser can't send Bearer header)."""
    if not token:
        return False
    return decode_access_token(token) is not None


async def _generate_mjpeg(camera_id: int):
    """Yield MJPEG frames for streaming. Uses placeholder when no frame available."""
    from app.services.stream_manager import _get_no_signal_frame

    boundary = "frame"
    while True:
        frame = get_frame(camera_id)
        if not frame:
            frame = _get_no_signal_frame()
        yield (
            b"--" + boundary.encode() + b"\r\n"
            b"Content-Type: image/jpeg\r\n"
            b"Content-Length: " + str(len(frame)).encode() + b"\r\n\r\n"
            + frame + b"\r\n"
        )
        await asyncio.sleep(0.033)  # ~30 fps


@router.get("/{camera_id}/mjpeg")
async def stream_mjpeg(
    camera_id: int,
    token: Optional[str] = Query(None, description="JWT for auth (required for img src)"),
    db: AsyncSession = Depends(get_db),
):
    """MJPEG stream for camera. Use <img src='/api/v1/stream/1/mjpeg?token=JWT'>."""
    if not _verify_stream_token(token):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    if not camera.is_enabled:
        raise HTTPException(status_code=400, detail="Camera disabled")
    if not is_streaming(camera_id):
        start_stream(camera_id, camera.rtsp_url)
        await asyncio.sleep(1)  # Wait for first frame
    return StreamingResponse(
        _generate_mjpeg(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.post("/{camera_id}/start")
async def start_camera_stream(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None,
):
    """Start camera stream (capture begins)."""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    start_stream(camera_id, camera.rtsp_url)
    camera.status = "active"
    await db.commit()
    return {"status": "started", "camera_id": camera_id}


@router.post("/{camera_id}/stop")
async def stop_camera_stream(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None,
):
    """Stop camera stream."""
    stop_stream(camera_id)
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if camera:
        camera.status = "inactive"
        await db.commit()
    return {"status": "stopped", "camera_id": camera_id}
