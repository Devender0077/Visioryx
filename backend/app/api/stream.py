"""
Visioryx - MJPEG Stream API
Live camera feed endpoints.
"""
import asyncio
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import SurveillanceUser
from app.core.config import get_settings
from app.core.security import Role, decode_access_token
from app.database.connection import get_db
from app.database.models import Camera
from app.services.stream_manager import get_frame, is_streaming, start_stream, stop_stream
from app.services.hls_manager import (
    get_playlist_path,
    get_segment_path,
    is_hls_running,
    start_hls,
    stop_hls,
    wait_for_playlist,
)

router = APIRouter()


def _mediamtx_path_name(camera, camera_id: int) -> str:
    """Derive a MediaMTX-safe path name from the camera record."""
    import re
    name = (camera.camera_name or "").lower().strip()
    name = re.sub(r"[^a-z0-9]+", "_", name).strip("_")
    return name or f"cam_{camera_id}"

def _camera_stream_active(camera_id: int) -> bool:
    """MJPEG thread and/or HLS ffmpeg — whichever mode is running for this camera."""
    return is_hls_running(camera_id) or is_streaming(camera_id)


@router.get("/status")
async def get_streams_status(
    db: AsyncSession = Depends(get_db),
    current_user: SurveillanceUser = None,
):
    """Which cameras are actively decoding on the server (survives leaving the Live page)."""
    result = await db.execute(select(Camera.id))
    ids = list(result.scalars().all())
    active = [cid for cid in ids if _camera_stream_active(cid)]
    return {"active_camera_ids": active}


def _verify_surveillance_stream_token(token: Optional[str]) -> bool:
    """Verify JWT for img/video src; enrollee tokens cannot access live streams."""
    if not token:
        return False
    payload = decode_access_token(token)
    if not payload:
        return False
    role = payload.get("role")
    return role in (Role.ADMIN.value, Role.OPERATOR.value)


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
        # ~40 fps max; buffer usually updates slower — low sleep reduces visible lag between new frames
        await asyncio.sleep(0.02)


@router.get("/{camera_id}/mjpeg")
async def stream_mjpeg(
    camera_id: int,
    token: Optional[str] = Query(None, description="JWT for auth (required for img src)"),
    db: AsyncSession = Depends(get_db),
):
    """MJPEG stream for camera. Use <img src='/api/v1/stream/1/mjpeg?token=JWT'>."""
    if not _verify_surveillance_stream_token(token):
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
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering if proxied
        },
    )


@router.get("/{camera_id}/hls/index.m3u8")
async def stream_hls_playlist(
    camera_id: int,
    token: Optional[str] = Query(None, description="JWT for auth (required for video src)"),
    db: AsyncSession = Depends(get_db),
):
    """HLS playlist for camera. Use <video src='/api/v1/stream/1/hls/index.m3u8?token=JWT'>."""
    if not _verify_surveillance_stream_token(token):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    if not camera.is_enabled:
        raise HTTPException(status_code=400, detail="Camera disabled")

    # Ensure ffmpeg is running
    if not is_hls_running(camera_id):
        ok = start_hls(camera_id, camera.rtsp_url)
        if not ok:
            raise HTTPException(status_code=500, detail="Failed to start HLS stream (ffmpeg)")

    # Wait briefly for the playlist to appear
    await asyncio.to_thread(wait_for_playlist, camera_id)
    playlist = get_playlist_path(camera_id)
    if not playlist:
        raise HTTPException(status_code=504, detail="Stream starting, playlist not ready yet")

    return FileResponse(
        path=str(playlist),
        media_type="application/vnd.apple.mpegurl",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache"},
    )

from pydantic import BaseModel

class WebRTCSignalingRequest(BaseModel):
    sdp: str

@router.get("/{camera_id}/hls/{filename}")
async def stream_hls_segment(
    camera_id: int,
    filename: str,
    token: Optional[str] = Query(None, description="JWT for auth (required for video src)"),
    db: AsyncSession = Depends(get_db),
    current_user: SurveillanceUser = None,
):
    if not _verify_surveillance_stream_token(token):
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    seg = get_segment_path(camera_id, filename)
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")
    return FileResponse(
        path=str(seg),
        media_type="video/mp2t",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache"},
    )


@router.post("/{camera_id}/webrtc-signal")
async def webrtc_signal(
    camera_id: int,
    current_user: SurveillanceUser, # Moved up to fix SyntaxError
    req: WebRTCSignalingRequest,
    db: AsyncSession = Depends(get_db),
):
    """Proxy WebRTC WHEP signaling to MediaMTX for remote access."""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
        
    path_name = _mediamtx_path_name(camera, camera_id)
    
    import httpx, logging
    logger = logging.getLogger("visioryx")
    settings = get_settings()
    # MediaMTX v1.17+ uses WHEP for WebRTC reads: POST /{path}/whep with application/sdp
    mtx_url = settings.MEDIAMTX_URL.replace("localhost", "127.0.0.1").rstrip('/')
    mtx_signaling_url = f"{mtx_url}/{path_name}/whep"
    
    logger.info(f"Proxying WHEP signal for camera {camera_id} (path: {path_name}) to {mtx_signaling_url}")
    
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(
                mtx_signaling_url,
                content=req.sdp,
                headers={"Content-Type": "application/sdp"},
                timeout=10.0
            )
            if not res.is_success:
                logger.error(f"WHEP signaling failed for {path_name}: {res.status_code} {res.text}")
                raise HTTPException(status_code=502, detail=f"MediaMTX WHEP failed: {res.text}")
            # WHEP returns SDP answer with Content-Type: application/sdp
            return {"sdp": res.text, "content_type": res.headers.get("content-type", "application/sdp")}
        except HTTPException:
            raise
        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.exception(f"WHEP Signaling Exception for {path_name}")
            raise HTTPException(status_code=500, detail=f"Signaling failed: {str(e)}")


@router.post("/{camera_id}/start")
async def start_camera_stream(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: SurveillanceUser = None,
):
    """Start camera stream (MediaMTX registration & AI processing)."""
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    settings = get_settings()
    path_name = _mediamtx_path_name(camera, camera_id)
    
    # 1. Register with MediaMTX if it's a real RTSP stream
    if camera.rtsp_url and camera.rtsp_url.startswith("rtsp://"):
        try:
            mtx_api_base = settings.MEDIAMTX_API_URL.replace("localhost", "127.0.0.1").rstrip('/')
            import httpx
            async with httpx.AsyncClient() as client:
                # Add path to MediaMTX with sourceOnDemand so it pulls RTSP when viewers connect
                api_url = f"{mtx_api_base}/v3/config/paths/add/{path_name}"
                path_config = {
                    "source": camera.rtsp_url,
                    "sourceOnDemand": True,
                    "sourceOnDemandStartTimeout": "10s",
                    "sourceOnDemandCloseAfter": "10s",
                }
                res = await client.post(api_url, json=path_config, timeout=5.0)
                if not res.is_success and "already exists" not in res.text:
                    # Try to update if already exists
                    api_url_update = f"{mtx_api_base}/v3/config/paths/patch/{path_name}"
                    await client.patch(api_url_update, json=path_config, timeout=5.0)
        except Exception as e:
            from app.core.logger import setup_logger
            setup_logger("visioryx").warning(f"Failed to register MediaMTX path {path_name}: {e}")

    # 2. Start AI background thread (MJPEG manager does this)
    # Even if we use HLS/WebRTC for display, we need OpenCV to pull frames for AI logic.
    if not is_streaming(camera_id):
        # We start the stream manager, but it doesn't HAVE to be for proxying anymore.
        # It's for extracting frames for face detection / YOLO.
        start_stream(camera_id, camera.rtsp_url)
    
    camera.status = "active"
    await db.commit()

    return {
        "status": "started",
        "camera_id": camera_id,
        "mode": settings.STREAM_MODE.lower(),
        "path_name": path_name,
        "hls_url": f"{settings.MEDIAMTX_URL.replace(':8889', ':8888').rstrip('/')}/{path_name}/index.m3u8",
        "webrtc_url": f"{settings.MEDIAMTX_WS_URL.rstrip('/')}/{path_name}/"
    }


@router.post("/{camera_id}/stop")
async def stop_camera_stream(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: SurveillanceUser = None,
):
    """Stop camera stream."""
    settings = get_settings()
    if settings.STREAM_MODE.lower() == "hls":
        stop_hls(camera_id)
    else:
        stop_stream(camera_id)
    result = await db.execute(select(Camera).where(Camera.id == camera_id))
    camera = result.scalar_one_or_none()
    if camera:
        camera.status = "inactive"
        await db.commit()
    return {"status": "stopped", "camera_id": camera_id}
