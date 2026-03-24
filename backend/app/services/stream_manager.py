"""
Visioryx - Camera Stream Manager
Manages per-camera frame capture and MJPEG streaming.
Supports test:// URLs for demo when no real cameras available.

For real RTSP, prefer FFmpeg subprocess (RTSP_CAPTURE_BACKEND=ffmpeg) instead of
OpenCV VideoCapture — the latter often triggers SIGSEGV on macOS and freezes the feed.
"""
import os
import subprocess
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


def _resize_for_stream(frame: np.ndarray, max_width: int) -> np.ndarray:
    """Downscale wide frames so JPEG encode and browser stay fast."""
    if max_width <= 0 or frame is None or frame.size == 0:
        return frame
    h, w = frame.shape[:2]
    if w <= max_width:
        return frame
    scale = max_width / float(w)
    new_w = max_width
    new_h = max(1, int(h * scale))
    return cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)


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


def _capture_loop_ffmpeg(camera_id: int, rtsp_url: str, stop_event: threading.Event):
    """
    Decode RTSP via FFmpeg rawvideo pipe → numpy BGR frames.
    Avoids cv2.VideoCapture (common source of EXC_BAD_ACCESS on macOS).
    """
    settings = get_settings()
    ff = settings.FFMPEG_PATH
    w = max(320, min(settings.STREAM_DECODE_WIDTH, 1920))
    h = max(180, min(settings.STREAM_DECODE_HEIGHT, 1080))
    frame_size = w * h * 3
    retry_delay = 2
    max_retries = 8
    retry_count = 0

    # Low-latency flags strip buffers and break many HEVC RTSP streams ("Could not find ref with POC").
    base_cmd = [
        ff,
        "-hide_banner",
        "-loglevel",
        "error",
        "-rtsp_transport",
        "tcp",
    ]
    if settings.STREAM_FFMPEG_LOW_LATENCY:
        base_cmd += ["-fflags", "nobuffer", "-flags", "low_delay"]
    else:
        base_cmd += ["-err_detect", "ignore_err"]
    base_cmd += [
        "-i",
        rtsp_url,
        "-an",
        "-vf",
        f"scale={w}:{h}",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "bgr24",
        "-",
    ]

    while not stop_event.is_set():
        proc: Optional[subprocess.Popen] = None
        try:
            proc = subprocess.Popen(
                base_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                stdin=subprocess.DEVNULL,
                close_fds=True,
            )
        except FileNotFoundError:
            logger.error(f"Camera {camera_id}: FFmpeg not found at '{ff}'. Install ffmpeg or set FFMPEG_PATH.")
            with _frame_lock:
                _frame_buffer[camera_id] = _get_no_signal_frame()
            return
        except Exception as e:
            logger.error(f"Camera {camera_id}: failed to start FFmpeg: {e}")
            with _frame_lock:
                _frame_buffer[camera_id] = _get_no_signal_frame()
            if retry_count < max_retries:
                retry_count += 1
                stop_event.wait(retry_delay)
                continue
            return

        retry_count = 0
        count = 0
        # Match OpenCV path: one knob for how often full InsightFace + overlay runs (lower CPU = smoother MJPEG).
        run_ai_every = max(2, int(getattr(settings, "STREAM_ANNOTATE_EVERY_N_FRAMES", 10)))
        jpeg_q = max(40, min(95, int(getattr(settings, "STREAM_JPEG_QUALITY", 82))))
        assert proc.stdout is not None

        # Drain stderr in a thread so a full PIPE cannot deadlock FFmpeg on long runs.
        def _drain_ffmpeg_stderr():
            try:
                if proc.stderr:
                    while True:
                        line = proc.stderr.readline()
                        if not line:
                            break
                        s = line.decode(errors="replace").strip()
                        if s:
                            logger.warning(f"Camera {camera_id} FFmpeg: {s[:500]}")
            except Exception:
                pass

        threading.Thread(target=_drain_ffmpeg_stderr, daemon=True).start()

        try:
            while not stop_event.is_set():
                raw = proc.stdout.read(frame_size)
                if len(raw) != frame_size:
                    try:
                        proc.wait(timeout=0.2)
                    except Exception:
                        pass
                    rc = proc.poll()
                    logger.warning(
                        f"Camera {camera_id}: FFmpeg ended or short frame read "
                        f"(got {len(raw)}/{frame_size} bytes, returncode={rc})"
                    )
                    break
                frame = np.frombuffer(raw, dtype=np.uint8).reshape((h, w, 3))
                count += 1
                # Annotate every frame; AI runs inside annotate_frame every run_ai_every frames (cached boxes between).
                display = annotate_frame(
                    frame,
                    count,
                    camera_id=camera_id,
                    run_detection_every=run_ai_every,
                )
                _, jpeg = cv2.imencode(
                    ".jpg", display, [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_q]
                )
                with _frame_lock:
                    _frame_buffer[camera_id] = jpeg.tobytes()
        except Exception as e:
            logger.error(f"Camera {camera_id} FFmpeg loop error: {e}")
        finally:
            try:
                proc.terminate()
                proc.wait(timeout=3)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass

        if stop_event.is_set():
            break
        with _frame_lock:
            _frame_buffer[camera_id] = _get_no_signal_frame()
        logger.info(f"Camera {camera_id}: FFmpeg stream ended, reconnecting in {retry_delay}s...")
        for _ in range(retry_delay * 10):
            if stop_event.wait(0.1):
                break

    with _frame_lock:
        _frame_buffer.pop(camera_id, None)


def _capture_loop_opencv(camera_id: int, rtsp_url: str, stop_event: threading.Event):
    """Legacy: OpenCV VideoCapture — may crash the interpreter on some macOS builds."""
    settings = get_settings()
    max_w = getattr(settings, "STREAM_MAX_WIDTH", 1280) or 0
    jpeg_q = max(40, min(95, int(getattr(settings, "STREAM_JPEG_QUALITY", 82))))
    annotate_every = max(1, int(getattr(settings, "STREAM_ANNOTATE_EVERY_N_FRAMES", 10)))
    retry_count = 0
    max_retries = 5
    retry_delay = 2
    frame_count = 0

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
        try:
            while not stop_event.is_set():
                ret, frame = cap.read()
                if not ret or frame is None:
                    break
                frame_count += 1
                frame = _resize_for_stream(frame, max_w)
                # Most frames: fast JPEG only. Heavy InsightFace/YOLO only every Nth frame.
                if frame_count % annotate_every == 0:
                    det_tick = frame_count // annotate_every
                    frame = annotate_frame(
                        frame,
                        det_tick,
                        camera_id=camera_id,
                        run_detection_every=1,
                    )
                encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_q]
                _, jpeg = cv2.imencode(".jpg", frame, encode_params)
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
    backend = (settings.RTSP_CAPTURE_BACKEND or "ffmpeg").lower()
    if backend == "opencv":
        logger.warning(f"Camera {camera_id}: using OpenCV RTSP capture (less stable on macOS)")
        _capture_loop_opencv(camera_id, rtsp_url, stop_event)
    else:
        logger.info(f"Camera {camera_id}: using FFmpeg RTSP decode (backend=ffmpeg)")
        _capture_loop_ffmpeg(camera_id, rtsp_url, stop_event)


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
