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
    """Extract all face embeddings from image file."""
    img = cv2.imread(image_path)
    if img is None:
        return []
    faces = detect_faces(img)
    return [f["embedding"] for f in faces if f.get("embedding") is not None]
