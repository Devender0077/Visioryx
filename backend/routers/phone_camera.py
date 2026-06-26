"""Phone-as-camera MVP.

Admins create a "wireless camera" → backend mints a pair_token + QR-code that
the user opens on their phone. The phone's browser captures `getUserMedia()`
frames and streams JPEG frames via WebSocket to this server. The latest frame
is kept in an in-memory buffer, keyed by camera_id, and re-served on demand
through the existing MJPEG endpoint.

Endpoints
---------
POST   /api/v1/phone-cameras                (admin) → create + return pair info
GET    /api/v1/phone-cameras/{id}/qr.png    (admin) → QR PNG of the pair URL
GET    /api/v1/phone-cameras/pair-info      (public) → resolve token → camera meta
WS     /api/v1/phone-cameras/ws/ingest      (token) → binary JPEG frames in
GET    /api/v1/phone-cameras/{id}/frame.jpg → latest frame (re-served via stream)

Frames live in `_FRAME_BUFFER[camera_id] = {bytes, ts}`. A camera is considered
"live" if ts is within `STALE_AFTER_S` seconds.
"""
from __future__ import annotations

import asyncio
import io
import secrets
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from pydantic import BaseModel

from deps import current_user, get_db, require_admin

router = APIRouter(prefix="/phone-cameras", tags=["phone-cameras"])

# In-memory frame buffer: camera_id → { "bytes": <jpeg>, "ts": <epoch> }
_FRAME_BUFFER: dict[str, dict[str, Any]] = {}
STALE_AFTER_S = 30  # camera marked offline if no frame for this long


class PhoneCameraCreate(BaseModel):
    camera_name: str


def _public_base_url(req_host: str | None) -> str:
    # Fallback: rely on REACT_APP_BACKEND_URL env or the request host header.
    import os
    return os.environ.get("REACT_APP_BACKEND_URL") or (f"https://{req_host}" if req_host else "")


def get_frame(camera_id: str) -> tuple[bytes | None, float | None]:
    """Return the latest cached frame for a phone camera, if fresh."""
    entry = _FRAME_BUFFER.get(camera_id)
    if not entry:
        return None, None
    age = time.time() - entry["ts"]
    if age > STALE_AFTER_S:
        return None, age
    return entry["bytes"], age


@router.post("", status_code=201)
async def create_phone_camera(
    body: PhoneCameraCreate,
    _: dict[str, Any] = Depends(require_admin),
) -> dict[str, Any]:
    db = get_db()
    pair_token = secrets.token_urlsafe(24)
    cam_id = str(uuid.uuid4())
    doc = {
        "_id": cam_id,
        "camera_name": body.camera_name,
        "rtsp_url": f"phone://{cam_id}",  # marker — never actually dialed
        "kind": "phone",
        "pair_token": pair_token,
        "pair_expires_at": datetime.now(timezone.utc).timestamp() + 86400,  # 24h
        "is_enabled": True,
        "status": "offline",  # flips to active when first frame arrives
        "created_at": datetime.now(timezone.utc),
    }
    await db.cameras.insert_one(doc)
    return {
        "id": cam_id,
        "camera_name": body.camera_name,
        "pair_token": pair_token,
        "pair_url_path": f"/pair?token={pair_token}",
        "kind": "phone",
        "is_enabled": True,
        "status": "offline",
    }


@router.get("/{camera_id}/qr.png")
async def phone_camera_qr(
    camera_id: str,
    base: str | None = Query(None, description="Override base URL (e.g. https://app...)"),
    _: dict[str, Any] = Depends(require_admin),
) -> Response:
    import qrcode

    db = get_db()
    cam = await db.cameras.find_one({"_id": camera_id, "kind": "phone"})
    if not cam:
        raise HTTPException(status_code=404, detail="Phone camera not found")
    base = base or _public_base_url(None)
    pair_url = f"{base.rstrip('/')}/pair?token={cam['pair_token']}"
    qr = qrcode.QRCode(box_size=8, border=2)
    qr.add_data(pair_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={"Cache-Control": "no-cache"},
    )


@router.get("/pair-info")
async def pair_info(token: str = Query(...)) -> dict[str, Any]:
    """Public — used by the /pair phone page to validate token + show camera name."""
    db = get_db()
    cam = await db.cameras.find_one({"pair_token": token, "kind": "phone"})
    if not cam:
        raise HTTPException(status_code=404, detail="Invalid pairing token")
    if cam.get("pair_expires_at", 0) < datetime.now(timezone.utc).timestamp():
        raise HTTPException(status_code=410, detail="Pairing token expired")
    return {
        "camera_id": cam["_id"],
        "camera_name": cam["camera_name"],
        "ws_path": f"/api/v1/phone-cameras/ws/ingest?token={token}",
    }


@router.websocket("/ws/ingest")
async def ws_ingest(ws: WebSocket, token: str = Query(...)):
    """Phone-side WebSocket: receives binary JPEG frames."""
    db = get_db()
    cam = await db.cameras.find_one({"pair_token": token, "kind": "phone"})
    if not cam:
        await ws.close(code=4004)
        return
    if cam.get("pair_expires_at", 0) < datetime.now(timezone.utc).timestamp():
        await ws.close(code=4010)
        return

    camera_id = cam["_id"]
    await ws.accept()
    MAX_FRAME_BYTES = 2 * 1024 * 1024  # 2MB safety cap per frame
    # Mark camera active.
    await db.cameras.update_one({"_id": camera_id}, {"$set": {"status": "active"}})
    try:
        while True:
            msg = await ws.receive()
            if "bytes" in msg and msg["bytes"]:
                frame = msg["bytes"]
                if len(frame) > MAX_FRAME_BYTES:
                    continue  # drop oversized frames
                _FRAME_BUFFER[camera_id] = {"bytes": frame, "ts": time.time()}
            elif msg.get("type") == "websocket.disconnect":
                break
    except WebSocketDisconnect:
        pass
    finally:
        # Don't immediately flip offline — staleness check handles it.
        await db.cameras.update_one(
            {"_id": camera_id},
            {"$set": {"last_phone_disconnect": datetime.now(timezone.utc)}},
        )


@router.get("/{camera_id}/frame.jpg")
async def latest_frame(
    camera_id: str,
    _: dict[str, Any] = Depends(current_user),
) -> Response:
    body, age = get_frame(camera_id)
    if body is None:
        raise HTTPException(status_code=404, detail="No fresh frame")
    return Response(
        content=body,
        media_type="image/jpeg",
        headers={"Cache-Control": "no-store", "X-Frame-Age-S": str(round(age or 0, 1))},
    )


@router.get("/{camera_id}/stream.mjpeg")
async def phone_camera_mjpeg(
    camera_id: str,
    token: str = Query(...),
):
    """MJPEG re-stream of cached phone frames. Token = bearer JWT (query)."""
    import jwt as _jwt
    from fastapi.responses import StreamingResponse
    from deps import JWT_ALGORITHM, JWT_SECRET

    try:
        _jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth: {e}")

    boundary = b"--vxframe"

    async def gen():
        last_ts = 0.0
        while True:
            entry = _FRAME_BUFFER.get(camera_id)
            if entry and entry["ts"] != last_ts:
                last_ts = entry["ts"]
                body = entry["bytes"]
                yield (boundary + b"\r\nContent-Type: image/jpeg\r\n"
                       + b"Content-Length: " + str(len(body)).encode() + b"\r\n\r\n"
                       + body + b"\r\n")
            await asyncio.sleep(0.1)

    return StreamingResponse(
        gen(),
        media_type="multipart/x-mixed-replace; boundary=vxframe",
        headers={"Cache-Control": "no-cache, no-store", "X-Accel-Buffering": "no"},
    )
