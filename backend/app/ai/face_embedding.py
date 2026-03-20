"""
Visioryx - Face Embedding
Extract face embeddings for matching.
"""
from typing import Optional

import cv2
import numpy as np

from app.ai.face_detector import detect_faces


def extract_embedding(frame: np.ndarray, bbox: Optional[list[int]] = None) -> Optional[list[float]]:
    """
    Extract embedding for a single face.
    If bbox provided, crop and use; else use first detected face.
    """
    faces = detect_faces(frame)
    if not faces:
        return None
    if bbox:
        for f in faces:
            if f.get("embedding") is not None:
                return f["embedding"]
        # No embedding from detector - would need separate model
        return None
    face = faces[0]
    return face.get("embedding")


def extract_embeddings_from_image(image_path: str) -> list[list[float]]:
    """
    Extract face embedding(s) from image file.
    If multiple faces are present, uses the largest face (typical for enrollment photos).
    """
    img = cv2.imread(image_path)
    if img is None:
        return []
    faces = detect_faces(img)
    valid = [f for f in faces if f.get("embedding") is not None]
    if not valid:
        return []

    def area(f: dict) -> float:
        b = f.get("bbox") or [0, 0, 0, 0]
        return float((b[2] - b[0]) * (b[3] - b[1]))

    valid.sort(key=area, reverse=True)
    return [valid[0]["embedding"]]
