"""Camera preview / synthetic MJPEG stream.

Browsers can't speak RTSP directly. Until a real RTSP→HLS gateway is wired,
this module generates **synthetic CCTV-style frames** per camera (dark grid,
camera name + timestamp + scanline) and exposes:

    GET /api/v1/cameras/{id}/preview.jpg     — single fresh JPEG (cacheable=1s)
    GET /api/v1/cameras/{id}/stream.mjpeg    — multipart/x-mixed-replace
                                                stream @ 10 fps

These accept the JWT via `?token=<jwt>` query param since `<img>` tags cannot
attach an Authorization header.
"""
from __future__ import annotations

import asyncio
import io
import time
from typing import Any

import jwt
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response, StreamingResponse

from deps import JWT_ALGORITHM, JWT_SECRET, get_db

router = APIRouter(prefix="/cameras", tags=["cameras-stream"])


async def _auth_from_query(token: str | None) -> dict[str, Any]:
    if not token:
        raise HTTPException(status_code=401, detail="Token query param required")
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def _render_frame(name: str, status: str, frame_n: int) -> bytes:
    """Build a simple 'No Signal' placeholder JPEG."""
    from PIL import Image, ImageDraw, ImageFont

    W, H = 640, 360
    img = Image.new("RGB", (W, H), (8, 8, 16))
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", 18)
    except Exception:
        font = ImageFont.load_default()
    draw.text((W // 2 - 60, H // 2 - 20), "No Signal", fill=(139, 92, 246), font=font)
    draw.text((W // 2 - 80, H // 2 + 10), "Waiting for camera feed", fill=(90, 90, 100), font=font)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=60)
    return buf.getvalue()


@router.get("/{camera_id}/preview.jpg")
async def camera_preview(camera_id: str, token: str | None = Query(None)) -> Response:
    await _auth_from_query(token)
    db = get_db()
    cam = await db.cameras.find_one({"_id": camera_id})
    if cam is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    # Phone-camera → re-serve latest captured frame.
    if cam.get("kind") == "phone":
        from routers.phone_camera import get_frame
        body, _age = await get_frame(camera_id)
        if body is not None:
            return Response(content=body, media_type="image/jpeg",
                            headers={"Cache-Control": "no-cache, no-store"})
        # else fall through to synthetic
    name = cam.get("camera_name", "Camera")
    status = cam.get("status", "offline")
    frame_n = int(time.time() * 10) % 4096
    body = _render_frame(name, status, frame_n)
    return Response(content=body, media_type="image/jpeg",
                    headers={"Cache-Control": "no-cache, no-store", "Pragma": "no-cache"})


@router.get("/{camera_id}/stream.mjpeg")
async def camera_mjpeg(request: Request, camera_id: str, token: str | None = Query(None)) -> StreamingResponse:
    """Synthetic 10 fps MJPEG stream. Yields a fresh frame every 100 ms until
    the client disconnects (`request.is_disconnected()` polled every 500 ms).

    For phone-cameras frames come from the MongoDB-backed phone_frames buffer
    (populated by the phone's WebSocket). Falls back to synthetic if stale.
    """
    await _auth_from_query(token)
    db = get_db()
    cam = await db.cameras.find_one({"_id": camera_id})
    if cam is None:
        raise HTTPException(status_code=404, detail="Camera not found")
    name = cam.get("camera_name", "Camera")
    status = cam.get("status", "offline")
    is_phone = cam.get("kind") == "phone"

    boundary = b"--vxframe"

    async def gen():
        from routers.phone_camera import get_frame as _get_frame
        frame_n = 0
        last_disconnect_check = 0.0
        try:
            while True:
                now = time.time()
                if now - last_disconnect_check > 0.5:
                    last_disconnect_check = now
                    if await request.is_disconnected():
                        return
                body: bytes | None = None
                if is_phone:
                    entry_bytes, _age = await _get_frame(camera_id)
                    if entry_bytes is not None:
                        body = entry_bytes
                if body is None:
                    body = _render_frame(name, status, frame_n)
                yield (boundary + b"\r\nContent-Type: image/jpeg\r\n"
                       + b"Content-Length: " + str(len(body)).encode() + b"\r\n\r\n"
                       + body + b"\r\n")
                frame_n += 1
                await asyncio.sleep(0.1)  # 10 fps
        except asyncio.CancelledError:
            return

    return StreamingResponse(
        gen(),
        media_type="multipart/x-mixed-replace; boundary=vxframe",
        headers={"Cache-Control": "no-cache, no-store", "X-Accel-Buffering": "no"},
    )
