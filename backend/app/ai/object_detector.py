"""
Visioryx - Object Detector
YOLOv8 object detection via Ultralytics.
"""
from typing import Optional

import numpy as np

from app.core.config import get_settings
from app.core.logger import get_logger

logger = get_logger("object_detector")

# Target classes from spec (YOLO COCO names may vary: cell phone, backpack, etc.)
TARGET_CLASSES = {"person", "cell phone", "laptop", "backpack", "handbag", "bottle", "chair", "car", "motorcycle", "bicycle", "cup", "book"}

_model = None


def _get_model():
    global _model
    if _model is None:
        try:
            from ultralytics import YOLO
            _model = YOLO("yolov8n.pt")  # nano for speed; use yolov8m for accuracy
            logger.info("YOLOv8 model loaded")
        except ImportError:
            logger.warning("Ultralytics not installed. Object detection disabled.")
            _model = "unavailable"
    return _model


def detect_objects(frame: np.ndarray) -> list[dict]:
    """
    Detect objects in BGR frame.
    Returns list of {name, confidence, bbox: [x1,y1,x2,y2]}
    """
    model = _get_model()
    if model == "unavailable":
        return []
    settings = get_settings()
    results = model(frame, conf=settings.OBJECT_DETECTION_CONFIDENCE, verbose=False)
    detections = []
    for r in results:
        if r.boxes is None:
            continue
        names = r.names or {}
        for box in r.boxes:
            cls_id = int(box.cls[0])
            name = names.get(cls_id, "unknown")
            if name not in TARGET_CLASSES:
                continue  # Filter to target classes
            xyxy = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            detections.append({
                "object_name": name,
                "confidence": conf,
                "bbox": [int(x) for x in xyxy],
            })
    return detections
