"""
Visioryx - Camera Worker
Per-camera frame capture and processing.
"""
import asyncio
from typing import Optional

import cv2
import numpy as np

from app.core.config import get_settings
from app.core.logger import get_logger
from app.core.websocket_manager import ws_manager

logger = get_logger("camera_worker")


class CameraWorker:
    """Process frames from a single camera."""

    def __init__(self, camera_id: int, rtsp_url: str, frame_callback=None):
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.frame_callback = frame_callback
        self._running = False
        self._cap: Optional[cv2.VideoCapture] = None
        self._frame_count = 0

    async def start(self):
        """Start capturing frames."""
        self._running = True
        settings = get_settings()
        skip = settings.FRAME_SKIP_RATE
        loop = asyncio.get_event_loop()
        self._cap = cv2.VideoCapture(self.rtsp_url)
        if not self._cap.isOpened():
            logger.error(f"Camera {self.camera_id}: failed to open {self.rtsp_url}")
            await ws_manager.broadcast("camera_status", {
                "camera_id": self.camera_id,
                "status": "error",
                "message": "Failed to open stream",
            })
            return
        logger.info(f"Camera {self.camera_id}: started")
        await ws_manager.broadcast("camera_status", {
            "camera_id": self.camera_id,
            "status": "active",
        })
        try:
            while self._running:
                ret, frame = await loop.run_in_executor(None, lambda: self._cap.read())
                if not ret or frame is None:
                    break
                self._frame_count += 1
                if self._frame_count % (skip + 1) == 0 and self.frame_callback:
                    await self.frame_callback(self.camera_id, frame)
        except asyncio.CancelledError:
            pass
        finally:
            self.stop()

    def stop(self):
        """Stop capture."""
        self._running = False
        if self._cap:
            self._cap.release()
            self._cap = None
        logger.info(f"Camera {self.camera_id}: stopped")
        asyncio.create_task(ws_manager.broadcast("camera_status", {
            "camera_id": self.camera_id,
            "status": "inactive",
        }))
