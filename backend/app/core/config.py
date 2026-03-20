"""
Visioryx - Core Configuration
Centralized configuration management using Pydantic Settings.
"""
import sys
from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_stream_ai_overlay() -> bool:
    """Live AI (faces/YOLO) in-process: off on macOS by default — PyTorch/ONNX often SIGSEGV with capture thread."""
    return sys.platform != "darwin"


def _default_yolo_overlay() -> bool:
    """YOLO loads torch; keep off on macOS unless explicitly enabled."""
    return sys.platform != "darwin"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # Application
    APP_NAME: str = "Visioryx"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # API
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/visioryx"
    DATABASE_URL_SYNC: str = "postgresql://postgres:postgres@localhost:5432/visioryx"

    # JWT Security
    SECRET_KEY: str = "change-this-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Face Recognition
    FACE_SIMILARITY_THRESHOLD: float = 0.6
    # auto = OpenCV Haar on macOS for *live* detect_faces only (avoids InsightFace SIGSEGV); InsightFace on Linux.
    # insightface = always use InsightFace for live (green/unknown boxes; may crash some Macs). opencv = always Haar.
    FACE_DETECTION_BACKEND: str = "auto"  # Cosine similarity threshold
    FACE_DETECTION_CONFIDENCE: float = 0.5
    EMBEDDING_DIMENSION: int = 512

    # Object Detection
    OBJECT_DETECTION_CONFIDENCE: float = 0.5
    OBJECT_DETECTION_IOU_THRESHOLD: float = 0.45

    # Processing
    FRAME_SKIP_RATE: int = 2  # Process every Nth frame
    MAX_CAMERAS: int = 16
    FRAME_QUEUE_SIZE: int = 10

    # Storage Paths
    STORAGE_PATH: str = "storage"
    REGISTERED_FACES_PATH: str = "storage/registered_faces"
    UNKNOWN_FACES_PATH: str = "storage/unknown_faces"
    SNAPSHOTS_PATH: str = "storage/snapshots"

    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = 30

    # Streaming
    # - "mjpeg": OpenCV VideoCapture + MJPEG endpoint (best dev compatibility; can crash on some macOS setups)
    # - "hls": FFmpeg subprocess generates HLS playlist + segments (recommended for stability)
    #
    # Default to MJPEG so Live Monitoring works immediately in all browsers.
    # You can switch to HLS via env: STREAM_MODE=hls (requires ffmpeg + hls.js or Safari native HLS).
    STREAM_MODE: str = "mjpeg"
    FFMPEG_PATH: str = "ffmpeg"
    HLS_SEGMENT_SECONDS: int = 2
    HLS_LIST_SIZE: int = 6

    # RTSP decode: "ffmpeg" (subprocess, avoids OpenCV VideoCapture segfaults on macOS)
    # or "opencv" (legacy cv2.VideoCapture — can crash the whole Python process)
    RTSP_CAPTURE_BACKEND: str = "ffmpeg"
    # Fixed decode size for FFmpeg rawvideo pipe (width x height, BGR24)
    STREAM_DECODE_WIDTH: int = 960
    STREAM_DECODE_HEIGHT: int = 540
    # Face/object overlay on MJPEG. Default false on macOS (stable video); set true in .env to try (risky).
    STREAM_ENABLE_AI_OVERLAY: bool = Field(default_factory=_default_stream_ai_overlay)
    # YOLO / Ultralytics (torch) — default off on macOS; major source of SIGSEGV in dev.
    STREAM_ENABLE_YOLO_OVERLAY: bool = Field(default_factory=_default_yolo_overlay)
    # nobuffer+low_delay hurts HEVC (IP cams): ref-frame errors / frozen first frame. Enable only for low-latency H.264.
    STREAM_FFMPEG_LOW_LATENCY: bool = False

    # GPU (Optional)
    CUDA_VISIBLE_DEVICES: Optional[str] = None
    # InsightFace: -1 = CPU (safer on macOS), 0 = first GPU
    INSIGHTFACE_CTX_ID: int = -1


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
