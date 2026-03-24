"""
Visioryx - Detection Overlay
Draw face and object detection boxes on frames (sync, for use in capture thread).

Heavy inference (InsightFace / HOG / YOLO) runs in a background thread so the RTSP
capture loop stays near real time; the hot path only draws the latest cached boxes.
"""
import os
import threading
import time
import uuid
from typing import Optional

import cv2
import numpy as np
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings
from app.core.logger import get_logger
from app.database.models import User
from app.services.runtime_app_settings import get_yolo_object_detection_enabled

logger = get_logger("detection_overlay")

_embeddings_cache: list[tuple[int, list[float]]] = []
_user_names: dict[int, str] = {}
_embeddings_ts: float = 0
_engine = None
CACHE_TTL = 60.0  # Refresh embeddings every 60s
# Last drawn faces/objects per camera (bbox drawn on frames between AI runs)
_last_overlay_cache: dict[int, tuple[list[dict], list[dict]]] = {}
_overlay_cache_lock = threading.Lock()
_overlay_refresh_busy: dict[int, bool] = {}
_overlay_disabled_logged: bool = False
_overlay_error_log_ts: float = 0.0
_live_insightface_for_matching_logged: bool = False
_last_unknown_snap_ts: dict[int, float] = {}


def _get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_engine(settings.DATABASE_URL_SYNC, pool_pre_ping=True)
    return _engine


def _load_embeddings_sync() -> list[tuple[int, list[float]]]:
    """Load user embeddings from DB (sync, for use in thread). Rebuilds FAISS index."""
    global _embeddings_cache, _embeddings_ts, _user_names
    import time
    now = time.time()
    if _embeddings_cache and (now - _embeddings_ts) < CACHE_TTL:
        return _embeddings_cache
    try:
        SessionLocal = sessionmaker(bind=_get_engine(), autoflush=False)
        dim = get_settings().EMBEDDING_DIMENSION
        with SessionLocal() as db:
            result = db.execute(
                select(User.id, User.face_embedding, User.name).where(User.face_embedding.isnot(None))
            )
            rows = result.all()
            _embeddings_cache = []
            _user_names = {}
            for r in rows:
                emb = r[1]
                if emb is None or len(emb) == 0:
                    continue
                if len(emb) != dim:
                    logger.warning(
                        "User id=%s: face_embedding length %s != %s (InsightFace expects %s-D; re-upload face photo)",
                        r[0],
                        len(emb),
                        dim,
                        dim,
                    )
                    continue
                _embeddings_cache.append((r[0], emb))
                _user_names[r[0]] = r[2] or f"User {r[0]}"
            _embeddings_ts = now
        # Rebuild FAISS index for fast vector search
        try:
            from app.vector_db.faiss_index import rebuild_faiss_from_embeddings
            rebuild_faiss_from_embeddings(_embeddings_cache)
        except Exception as e:
            logger.debug(f"FAISS rebuild skip: {e}")
    except Exception as e:
        logger.warning(f"Failed to load embeddings: {e}")
        _user_names = {}
    return _embeddings_cache


def invalidate_embedding_cache() -> None:
    """Call after registering/updating a user face so live matching picks up new embeddings."""
    global _embeddings_cache, _embeddings_ts, _user_names
    _embeddings_cache = []
    _user_names = {}
    _embeddings_ts = 0.0


def _upscale_for_face_recognition(frame: np.ndarray) -> tuple[np.ndarray, float]:
    """
    Upscale small CCTV / low-res stream frames so distant faces have enough pixels for
    InsightFace embeddings (otherwise live cosine scores stay far below enrolled photos).
    """
    h, w = frame.shape[:2]
    m = min(h, w)
    if m >= 512:
        return frame, 1.0
    scale = min(2.5, 512.0 / float(m))
    nw = max(1, int(round(w * scale)))
    nh = max(1, int(round(h * scale)))
    up = cv2.resize(frame, (nw, nh), interpolation=cv2.INTER_CUBIC)
    return up, scale


def _map_face_bboxes_to_original(faces: list[dict], scale: float) -> None:
    if scale == 1.0:
        return
    inv = 1.0 / scale
    for f in faces:
        b = f.get("bbox")
        if not b or len(b) < 4:
            continue
        f["bbox"] = [int(round(x * inv)) for x in b[:4]]


def _should_save_unknown_snapshot(camera_id: int) -> bool:
    """Rate-limit unknown-face disk writes so crowded scenes don't stall the capture thread."""
    settings = get_settings()
    interval = float(getattr(settings, "STREAM_UNKNOWN_SNAPSHOT_MIN_INTERVAL_SEC", 1.5) or 0.0)
    if interval <= 0:
        return True
    now = time.time()
    last = _last_unknown_snap_ts.get(camera_id, 0.0)
    if now - last < interval:
        return False
    _last_unknown_snap_ts[camera_id] = now
    return True


def _save_unknown_face_crop(frame: np.ndarray, bbox: list, camera_id: int) -> Optional[str]:
    """Save unknown face crop to storage. Returns relative path or None."""
    try:
        settings = get_settings()
        path_dir = settings.UNKNOWN_FACES_PATH
        os.makedirs(path_dir, exist_ok=True)
        x1, y1, x2, y2 = [int(x) for x in bbox[:4]]
        h, w = frame.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        if x2 <= x1 or y2 <= y1:
            return None
        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            return None
        fname = f"unknown_{int(time.time())}_{camera_id}_{uuid.uuid4().hex[:8]}.jpg"
        full_path = os.path.join(path_dir, fname)
        cv2.imwrite(full_path, crop)
        return os.path.join(path_dir, fname)
    except Exception as e:
        logger.debug(f"Save unknown face skip: {e}")
        return None


def _draw_detections(frame: np.ndarray, faces: list[dict], objects: list[dict]) -> np.ndarray:
    """Draw face and object boxes on frame."""
    out = frame.copy()
    for f in faces:
        bbox = f.get("bbox")
        if not bbox or len(bbox) < 4:
            continue
        x1, y1, x2, y2 = [int(x) for x in bbox[:4]]
        status = f.get("status", "unknown")
        # BGR: registered / saved user = green; not in DB = red
        if status == "known":
            color = (0, 255, 0)
            label = f.get("label") or "Registered"
        else:
            color = (0, 0, 255)
            label = "Unknown"
        cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
        cv2.putText(out, label, (x1, max(y1 - 8, 12)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)
    for o in objects:
        bbox = o.get("bbox")
        if not bbox or len(bbox) < 4:
            continue
        x1, y1, x2, y2 = [int(x) for x in bbox[:4]]
        name = o.get("object_name", "?")
        cv2.rectangle(out, (x1, y1), (x2, y2), (255, 128, 0), 2)
        cv2.putText(out, name, (x1, max(y1 - 8, 12)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 128, 0), 1)
    return out


def _run_full_overlay_detection(
    frame: np.ndarray,
    frame_count: int,
    camera_id: int,
) -> tuple[list[dict], list[dict]]:
    """
    Run InsightFace / optional HOG / YOLO. Called from a background thread only.
    `frame` must be an independent copy of the BGR frame.
    """
    from app.ai.face_detector import detect_faces
    from app.ai.face_matcher import find_best_match_with_relaxed_fallback
    from app.services.detection_log_queue import enqueue_detection, enqueue_object_detection

    settings = get_settings()
    embeddings = _load_embeddings_sync()
    global _live_insightface_for_matching_logged
    force_haar = getattr(settings, "STREAM_FORCE_HAAR_LIVE", False)
    use_insightface = (not force_haar) and bool(embeddings)
    if use_insightface:
        work, up_scale = _upscale_for_face_recognition(frame)
        faces_raw = detect_faces(work, for_embedding=True)
        _map_face_bboxes_to_original(faces_raw, up_scale)
        if not _live_insightface_for_matching_logged:
            _live_insightface_for_matching_logged = True
            logger.info(
                "Live face recognition: using InsightFace for this stream (enrolled embeddings in DB). "
                "OpenCV Haar cannot produce embeddings — without this step, names stay Unknown."
            )
    else:
        faces_raw = detect_faces(frame)
    faces_annotated = []
    for f in faces_raw:
        bbox = f.get("bbox")
        emb = f.get("embedding")
        det_score = f.get("det_score", 1.0)
        if det_score < settings.FACE_DETECTION_CONFIDENCE:
            continue
        status = "unknown"
        user_id = None
        confidence = float(det_score)
        display_label = "Unknown"
        if emb and embeddings:
            match = find_best_match_with_relaxed_fallback(emb, embeddings)
            if match:
                status = "known"
                user_id, sim = match
                confidence = sim
                display_label = _user_names.get(user_id, f"User {user_id}")
        faces_annotated.append({"bbox": bbox, "status": status, "label": display_label})

        snapshot_path = None
        if status == "unknown" and bbox and emb and len(bbox) >= 4 and _should_save_unknown_snapshot(camera_id):
            snapshot_path = _save_unknown_face_crop(frame, bbox, camera_id)
        enqueue_detection(
            camera_id,
            user_id,
            status,
            confidence,
            snapshot_path=snapshot_path,
            embedding=emb if status == "unknown" else None,
            bbox=bbox,
        )

    objects: list[dict] = []
    hog_busy = len(faces_raw) >= int(getattr(settings, "STREAM_SKIP_HOG_MIN_FACE_COUNT", 4))
    use_hog_persons = (
        getattr(settings, "STREAM_ENABLE_HOG_PERSONS", True)
        and not get_yolo_object_detection_enabled()
        and not hog_busy
    )
    if use_hog_persons:
        try:
            from app.ai.person_detector_hog import detect_people_hog, filter_hog_by_faces

            hog_raw = detect_people_hog(frame)
            face_boxes = [f.get("bbox") for f in faces_raw if f.get("bbox")]
            hog_filtered = filter_hog_by_faces(hog_raw, face_boxes)
            for o in hog_filtered:
                objects.append(
                    {
                        "object_name": o.get("object_name", "person"),
                        "confidence": float(o.get("confidence", 0.5)),
                        "bbox": o.get("bbox"),
                    }
                )
                enqueue_object_detection(
                    camera_id,
                    o.get("object_name", "person"),
                    float(o.get("confidence", 0.5)),
                    o.get("bbox"),
                )
        except Exception as e:
            logger.debug("HOG person detection skip: %s", e)

    if get_yolo_object_detection_enabled():
        try:
            from app.ai.object_detector import detect_objects

            yolo_objs = detect_objects(frame)
            for o in yolo_objs:
                objects.append(o)
                enqueue_object_detection(
                    camera_id,
                    o.get("object_name", "unknown"),
                    float(o.get("confidence", 0)),
                    o.get("bbox"),
                )
        except Exception as e:
            logger.debug("Object detection skip: %s", e)

    return (
        [dict(f) for f in faces_annotated],
        [dict(o) for o in objects],
    )


def _try_schedule_overlay_refresh(
    frame: np.ndarray,
    frame_count: int,
    camera_id: int,
    run_detection_every: int,
) -> None:
    """Start background detection if due; never blocks on InsightFace."""
    with _overlay_cache_lock:
        cached = _last_overlay_cache.get(camera_id)
        need = (cached is None) or (frame_count % run_detection_every == 0)
        if not need:
            return
        if _overlay_refresh_busy.get(camera_id):
            return
        _overlay_refresh_busy[camera_id] = True
    try:
        frame_copy = frame.copy()
    except Exception:
        with _overlay_cache_lock:
            _overlay_refresh_busy[camera_id] = False
        raise

    def _worker() -> None:
        global _overlay_error_log_ts
        try:
            faces, objs = _run_full_overlay_detection(frame_copy, frame_count, camera_id)
            with _overlay_cache_lock:
                _last_overlay_cache[camera_id] = (faces, objs)
        except Exception as e:
            now = time.time()
            if now - _overlay_error_log_ts >= 10.0:
                _overlay_error_log_ts = now
                logger.warning("Detection overlay failed (throttled every 10s): %s", e, exc_info=True)
        finally:
            _overlay_refresh_busy[camera_id] = False

    threading.Thread(target=_worker, daemon=True).start()


def annotate_frame(
    frame: np.ndarray,
    frame_count: int,
    camera_id: int = 0,
    run_detection_every: int = 5,
) -> np.ndarray:
    """
    Draw cached boxes on the current frame (fast). Schedules heavy detection in a
    background thread when due so RTSP capture stays smooth.
    """
    global _overlay_disabled_logged, _overlay_error_log_ts
    if frame is None or frame.size == 0:
        return frame
    if not get_settings().STREAM_ENABLE_AI_OVERLAY:
        if not _overlay_disabled_logged:
            _overlay_disabled_logged = True
            logger.info(
                "Live face boxes are off (STREAM_ENABLE_AI_OVERLAY=false). "
                "Set STREAM_ENABLE_AI_OVERLAY=true in backend/.env to enable detection overlays."
            )
        return frame

    _try_schedule_overlay_refresh(frame, frame_count, camera_id, run_detection_every)

    with _overlay_cache_lock:
        cached = _last_overlay_cache.get(camera_id)
    if cached:
        faces_c, objs_c = cached
        return _draw_detections(frame, faces_c, objs_c)
    return frame
