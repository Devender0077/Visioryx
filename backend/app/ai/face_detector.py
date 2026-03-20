"""
Visioryx - Face Detector
InsightFace for embeddings / registration; optional OpenCV Haar for live stream on macOS (stability).
"""
import sys

import cv2
import numpy as np

from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger("face_detector")

_insightface_app = None  # FaceAnalysis instance, or "missing"
_live_opencv_notice_logged = False


def _live_prefers_opencv() -> bool:
    """True → live path uses Haar only (no InsightFace in capture thread — avoids macOS SIGSEGV)."""
    s = get_settings()
    b = (s.FACE_DETECTION_BACKEND or "auto").lower().strip()
    if b == "opencv":
        return True
    if b == "insightface":
        return False
    return sys.platform == "darwin"


def _get_insightface_app():
    global _insightface_app
    if _insightface_app is not None:
        return _insightface_app
    try:
        from insightface.app import FaceAnalysis

        settings = get_settings()
        app = FaceAnalysis(name="buffalo_l", root="models/insightface")
        ctx_id = settings.INSIGHTFACE_CTX_ID
        app.prepare(ctx_id=ctx_id, det_size=(640, 640))
        logger.info("InsightFace FaceAnalysis loaded")
        _insightface_app = app
    except ImportError:
        logger.warning("InsightFace not installed. Using OpenCV fallback.")
        _insightface_app = "missing"
    return _insightface_app


def insightface_embeddings_enabled() -> bool:
    """False when InsightFace is not installed (OpenCV fallback only — no embeddings)."""
    return _get_insightface_app() != "missing"


def detect_faces(frame: np.ndarray, *, for_embedding: bool = False) -> list[dict]:
    """
    Detect faces in BGR frame.
    Returns list of {bbox: [x1,y1,x2,y2], landmarks, embedding (if available)}

    Use for_embedding=True for registration / recognition (always InsightFace when available).
    Default live path uses OpenCV on macOS when FACE_DETECTION_BACKEND=auto.
    """
    use_opencv_only = (not for_embedding) and _live_prefers_opencv()
    if use_opencv_only:
        global _live_opencv_notice_logged
        if not _live_opencv_notice_logged:
            logger.info(
                "Live faces: OpenCV Haar (darwin/auto safe mode). "
                "Boxes work; no embeddings on live → unknown/red unless FACE_DETECTION_BACKEND=insightface."
            )
            _live_opencv_notice_logged = True
        return _detect_faces_opencv(frame)

    app = _get_insightface_app()
    if app == "missing":
        return _detect_faces_opencv(frame)
    faces = app.get(frame)
    result = []
    for f in faces:
        emb = None
        if hasattr(f, "embedding") and f.embedding is not None:
            emb = f.embedding.tolist()
        result.append({
            "bbox": f.bbox.astype(int).tolist(),
            "landmarks": getattr(f, "kps", None),
            "embedding": emb,
            "det_score": float(getattr(f, "det_score", 1.0)),
        })
    return result


def _detect_faces_opencv(frame: np.ndarray) -> list[dict]:
    """Fallback: OpenCV Haar cascade (no embedding)."""
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )
    rects = cascade.detectMultiScale(gray, 1.3, 5)
    return [
        {
            "bbox": [int(x), int(y), int(x + w), int(y + h)],
            "landmarks": None,
            "embedding": None,
            "det_score": 1.0,
        }
        for (x, y, w, h) in rects
    ]
