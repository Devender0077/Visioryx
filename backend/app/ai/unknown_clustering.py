"""
Visioryx - Unknown Face Clustering
Group unknown faces by similarity for repeated unknown individuals.
"""
from typing import Optional

import numpy as np

from app.ai.face_matcher import cosine_similarity
from app.core.config import get_settings


def assign_cluster(
    embedding: list[float],
    clusters: list[tuple[int, list[float]]],
) -> Optional[int]:
    """
    Assign embedding to existing cluster or return None for new cluster.
    clusters: [(cluster_id, centroid_embedding), ...]
    """
    settings = get_settings()
    threshold = settings.FACE_SIMILARITY_THRESHOLD
    best_cluster = None
    best_sim = -1.0
    for cid, centroid in clusters:
        sim = cosine_similarity(embedding, centroid)
        if sim > best_sim and sim >= threshold:
            best_sim = sim
            best_cluster = cid
    return best_cluster


def compute_centroid(embeddings: list[list[float]]) -> list[float]:
    """Compute centroid of embeddings."""
    arr = np.array(embeddings, dtype=np.float32)
    return np.mean(arr, axis=0).tolist()
