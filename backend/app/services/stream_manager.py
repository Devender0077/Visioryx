"""
Visioryx - Camera Stream Manager
Manages per-camera frame capture and MJPEG streaming.
Supports test:// URLs for demo when no real cameras available.
"""
import os
import threading
import time
from typing import Optional

import cv2
import numpy as np

from app.core.config import get_settings
from app.core.logger import get_logger
from app.services.detection_overlay import annotate_frame

logger = get_logger("stream_manager")

# Use TCP for RTSP (more reliable than UDP through firewalls/NAT)
os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp")


def _redact_rtsp_for_log(url: str) -> str:
    """Hide password in rtsp://user:pass@host for logs."""
    if not url.startswith("rtsp://"):
        return url
    try:
        rest = url[7:]  # after rtsp://
        if "@" not in rest:
            return url
        creds, hostpath = rest.split("@", 1)
        if ":" in creds:
            user, _ = creds.split(":", 1)
            return f"rtsp://{user}:****@{hostpath}"
        return f"rtsp://****@{hostpath}"
    except Exception:
        return "rtsp://****"

# Placeholder "No signal" frame (gray 640x480 with text)
_NO_SIGNAL_FRAME: Optional[bytes] = None


def _get_no_signal_frame() -> bytes:
    """Generate a placeholder frame for when no camera signal."""
    global _NO_SIGNAL_FRAME
    if _NO_SIGNAL_FRAME is not None:
        return _NO_SIGNAL_FRAME
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    img[:] = (40, 40, 40)
    cv2.putText(img, "No signal", (220, 220), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 2)
    cv2.putText(img, "Check RTSP URL or use test:// for demo", (100, 270), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180, 180, 180), 1)
    _, jpeg = cv2.imencode(".jpg", img)
    _NO_SIGNAL_FRAME = jpeg.tobytes()
    return _NO_SIGNAL_FRAME


def _generate_test_frame(camera_id: int) -> Optional[bytes]:
    """Generate a test pattern for test:// URLs."""
    t = time.time()
    x = np.linspace(0, 1, 640)
    y = np.linspace(0, 1, 480)
    xx, yy = np.meshgrid(x, y)
    r = ((xx + t * 0.1) % 1 * 255).astype(np.uint8)
    g = ((yy + t * 0.05) % 1 * 255).astype(np.uint8)
    b = np.full_like(r, 128)
    img = np.stack([b, g, r], axis=2)  # BGR for OpenCV
    cv2.putText(img, f"Camera {camera_id} - Test", (180, 220), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    cv2.putText(img, "Demo stream (use real RTSP for live feed)", (100, 270), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)
    _, jpeg = cv2.imencode(".jpg", img)
    return jpeg.tobytes()


# Global: camera_id -> latest JPEG bytes
_frame_buffer: dict[int, bytes] = {}
_frame_lock = threading.Lock()
_active_cameras: dict[int, dict] = {}  # camera_id -> {rtsp_url, thread, stop_event}


def _capture_loop(camera_id: int, rtsp_url: str, stop_event: threading.Event):
    """Background thread: capture frames and update buffer."""
    # Test/demo mode - no real RTSP
    if rtsp_url.startswith("test://") or rtsp_url.startswith("demo://"):
        try:
            while not stop_event.is_set():
                frame_bytes = _generate_test_frame(camera_id)
                with _frame_lock:
                    _frame_buffer[camera_id] = frame_bytes
                stop_event.wait(0.1)
        except Exception as e:
            logger.error(f"Camera {camera_id} test mode error: {e}")
        finally:
            with _frame_lock:
                _frame_buffer.pop(camera_id, None)
        return

    settings = get_settings()
    skip = settings.FRAME_SKIP_RATE
    retry_count = 0
    max_retries = 5
    retry_delay = 2

    while not stop_event.is_set():
        cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
        if not cap.isOpened():
            logger.error(
                "Camera %s: failed to open RTSP %s — same checks: (1) backend host must reach the "
                "camera IP (not only your browser), (2) same LAN/VPN as the DVR, (3) if backend runs in "
                "Docker use host network or a reachable IP, (4) test: ffmpeg -rtsp_transport tcp -i URL -frames:v 1 -f null -",
                camera_id,
                _redact_rtsp_for_log(rtsp_url),
            )
            with _frame_lock:
                _frame_buffer[camera_id] = _get_no_signal_frame()
            if retry_count < max_retries:
                retry_count += 1
                stop_event.wait(retry_delay)
                continue
            return
        retry_count = 0
        count = 0
        det_count = 0
        try:
            while not stop_event.is_set():
                ret, frame = cap.read()
                if not ret or frame is None:
                    break
                count += 1
                if count % (skip + 1) == 0:
                    det_count += 1
                    frame = annotate_frame(frame, det_count, camera_id=camera_id, run_detection_every=3)
                    _, jpeg = cv2.imencode(".jpg", frame)
                    with _frame_lock:
                        _frame_buffer[camera_id] = jpeg.tobytes()
        except Exception as e:
            logger.error(f"Camera {camera_id} capture error: {e}")
        finally:
            cap.release()
        if stop_event.is_set():
            break
        with _frame_lock:
            _frame_buffer[camera_id] = _get_no_signal_frame()
        logger.info(f"Camera {camera_id}: stream ended, reconnecting in {retry_delay}s...")
        for _ in range(retry_delay * 10):
            if stop_event.wait(0.1):
                break
    with _frame_lock:
        _frame_buffer.pop(camera_id, None)


def start_stream(camera_id: int, rtsp_url: str) -> bool:
    """Start capturing from camera."""
    if camera_id in _active_cameras:
        return True
    stop_event = threading.Event()
    t = threading.Thread(target=_capture_loop, args=(camera_id, rtsp_url, stop_event), daemon=True)
    t.start()
    _active_cameras[camera_id] = {"rtsp_url": rtsp_url, "thread": t, "stop_event": stop_event}
    logger.info(f"Stream started for camera {camera_id}")
    return True


def stop_stream(camera_id: int):
    """Stop capturing from camera."""
    if camera_id not in _active_cameras:
        return
    _active_cameras[camera_id]["stop_event"].set()
    _active_cameras[camera_id]["thread"].join(timeout=2)
    del _active_cameras[camera_id]
    with _frame_lock:
        _frame_buffer.pop(camera_id, None)
    logger.info(f"Stream stopped for camera {camera_id}")


def get_frame(camera_id: int) -> Optional[bytes]:
    """Get latest JPEG frame for camera."""
    with _frame_lock:
        return _frame_buffer.get(camera_id)


def is_streaming(camera_id: int) -> bool:
    """Check if camera is actively streaming."""
    return camera_id in _active_cameras
