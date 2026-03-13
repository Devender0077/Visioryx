"""
Visioryx - Face Detector
Face detection using InsightFace.
"""
from typing import Optional

import cv2
import numpy as np

from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger("face_detector")

# Lazy load to avoid import errors if not installed
_face_app = None


def _get_face_app():
    global _face_app
    if _face_app is None:
        try:
            from insightface.app import FaceAnalysis
            settings = get_settings()
            _face_app = FaceAnalysis(name="buffalo_l", root="models/insightface")
            _face_app.prepare(ctx_id=0, det_size=(640, 640))
            logger.info("InsightFace FaceAnalysis loaded")
        except ImportError:
            logger.warning("InsightFace not installed. Using OpenCV fallback.")
            _face_app = "opencv"
    return _face_app


def detect_faces(frame: np.ndarray) -> list[dict]:
    """
    Detect faces in BGR frame.
    Returns list of {bbox: [x1,y1,x2,y2], landmarks, embedding (if available)}
    """
    app = _get_face_app()
    if app == "opencv":
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
