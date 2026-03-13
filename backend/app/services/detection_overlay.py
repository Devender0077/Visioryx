"""
Visioryx - Detection Overlay
Draw face and object detection boxes on frames (sync, for use in capture thread).
"""
import os
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

logger = get_logger("detection_overlay")

_embeddings_cache: list[tuple[int, list[float]]] = []
_embeddings_ts: float = 0
_engine = None
CACHE_TTL = 60.0  # Refresh embeddings every 60s


def _get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        _engine = create_engine(settings.DATABASE_URL_SYNC, pool_pre_ping=True)
    return _engine


def _load_embeddings_sync() -> list[tuple[int, list[float]]]:
    """Load user embeddings from DB (sync, for use in thread). Rebuilds FAISS index."""
    global _embeddings_cache, _embeddings_ts
    import time
    now = time.time()
    if _embeddings_cache and (now - _embeddings_ts) < CACHE_TTL:
        return _embeddings_cache
    try:
        SessionLocal = sessionmaker(bind=_get_engine(), autoflush=False)
        with SessionLocal() as db:
            result = db.execute(select(User.id, User.face_embedding).where(User.face_embedding.isnot(None)))
            rows = result.all()
            _embeddings_cache = [(r[0], r[1]) for r in rows if r[1] is not None and len(r[1]) > 0]
            _embeddings_ts = now
        # Rebuild FAISS index for fast vector search
        try:
            from app.vector_db.faiss_index import rebuild_faiss_from_embeddings
            rebuild_faiss_from_embeddings(_embeddings_cache)
        except Exception as e:
            logger.debug(f"FAISS rebuild skip: {e}")
    except Exception as e:
        logger.warning(f"Failed to load embeddings: {e}")
    return _embeddings_cache


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
        color = (0, 255, 0) if status == "known" else (0, 165, 255)  # green / orange
        cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
        label = f"Face: {status}"
        cv2.putText(out, label, (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
    for o in objects:
        bbox = o.get("bbox")
        if not bbox or len(bbox) < 4:
            continue
        x1, y1, x2, y2 = [int(x) for x in bbox[:4]]
        name = o.get("object_name", "?")
        cv2.rectangle(out, (x1, y1), (x2, y2), (255, 0, 0), 2)
        cv2.putText(out, name, (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1)
    return out


def annotate_frame(
    frame: np.ndarray,
    frame_count: int,
    camera_id: int = 0,
    run_detection_every: int = 5,
) -> np.ndarray:
    """
    Run face/object detection and draw boxes. Runs detection every run_detection_every frames.
    Enqueues detections for logging. Returns annotated frame.
    """
    if frame is None or frame.size == 0:
        return frame
    if frame_count % run_detection_every != 0:
        return frame
    try:
        from app.ai.face_detector import detect_faces
        from app.ai.face_matcher import find_best_match
        from app.ai.object_detector import detect_objects
        from app.services.detection_log_queue import enqueue_detection, enqueue_object_detection

        settings = get_settings()
        faces_raw = detect_faces(frame)
        embeddings = _load_embeddings_sync()
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
            if emb and embeddings:
                match = find_best_match(emb, embeddings)
                if match:
                    status = "known"
                    user_id, sim = match
                    confidence = sim
            faces_annotated.append({"bbox": bbox, "status": status})

            snapshot_path = None
            if status == "unknown" and bbox and emb and len(bbox) >= 4:
                snapshot_path = _save_unknown_face_crop(frame, bbox, camera_id)
            enqueue_detection(
                camera_id, user_id, status, confidence,
                snapshot_path=snapshot_path,
                embedding=emb if status == "unknown" else None,
            )

        objects = []
        try:
            objects = detect_objects(frame)
            for o in objects:
                enqueue_object_detection(
                    camera_id,
                    o.get("object_name", "unknown"),
                    float(o.get("confidence", 0)),
                    o.get("bbox"),
                )
        except Exception as e:
            logger.debug(f"Object detection skip: {e}")

        return _draw_detections(frame, faces_annotated, objects)
    except Exception as e:
        logger.debug(f"Detection overlay skip: {e}")
        return frame
