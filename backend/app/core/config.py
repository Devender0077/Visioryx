"""
Visioryx - Core Configuration
Centralized configuration management using Pydantic Settings.
"""
from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

# Default dev placeholder — must match .env.example; startup warns if still used with DEBUG=false
DEFAULT_DEV_SECRET_KEY = "change-this-in-production-use-openssl-rand-hex-32"


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
    SECRET_KEY: str = DEFAULT_DEV_SECRET_KEY

    # CORS — comma-separated origins (browser requests). Add your production dashboard URL.
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Face Recognition
    FACE_SIMILARITY_THRESHOLD: float = 0.6  # Cosine similarity threshold
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

    # GPU (Optional)
    CUDA_VISIBLE_DEVICES: Optional[str] = None


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
