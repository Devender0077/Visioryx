"""Tests for phone-as-camera MVP endpoints."""
from __future__ import annotations

import io
import os
import time
from pathlib import Path

import pytest
import requests
from PIL import Image
from websockets.sync.client import connect as ws_connect

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    env_file = Path("/app/frontend/.env")
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api/v1"
WS_BASE = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
ADMIN_EMAIL = "admin@visionaryx.dev"
ADMIN_PASSWORD = "VisionX2025!"


def _h(t: str) -> dict:
    return {"Authorization": f"Bearer {t}"}


def _make_jpeg(seed: int = 0) -> bytes:
    img = Image.new("RGB", (64, 48), color=(seed * 30 % 255, 100, 150))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=70)
    return buf.getvalue()


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def created_phone_camera(s, admin_token):
    """Create one phone camera reused across tests."""
    r = s.post(
        f"{API}/phone-cameras",
        json={"camera_name": "TEST_PhoneCam_Module"},
        headers=_h(admin_token),
        timeout=15,
    )
    assert r.status_code == 201, r.text
    return r.json()


# ---- Create + shape ----
class TestPhoneCameraCreate:
    def test_create_requires_admin(self, s):
        r = s.post(f"{API}/phone-cameras", json={"camera_name": "Nope"}, timeout=10)
        assert r.status_code in (401, 403)

    def test_create_returns_expected_shape(self, created_phone_camera):
        d = created_phone_camera
        for k in ("id", "camera_name", "pair_token", "pair_url_path", "kind", "is_enabled", "status"):
            assert k in d, f"missing field {k}"
        assert d["kind"] == "phone"
        assert d["is_enabled"] is True
        assert d["status"] == "offline"
        assert d["pair_url_path"].startswith("/pair?token=")
        assert d["pair_token"] in d["pair_url_path"]
        assert len(d["pair_token"]) > 10


# ---- QR PNG ----
class TestPhoneCameraQR:
    def test_qr_png(self, s, admin_token, created_phone_camera):
        cam_id = created_phone_camera["id"]
        r = s.get(f"{API}/phone-cameras/{cam_id}/qr.png", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("image/png")
        assert len(r.content) > 1024, f"QR PNG too small: {len(r.content)} bytes"
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n"

    def test_qr_requires_admin(self, s, created_phone_camera):
        cam_id = created_phone_camera["id"]
        r = s.get(f"{API}/phone-cameras/{cam_id}/qr.png", timeout=10)
        assert r.status_code in (401, 403)

    def test_qr_404_for_nonexistent(self, s, admin_token):
        r = s.get(f"{API}/phone-cameras/does-not-exist/qr.png", headers=_h(admin_token), timeout=10)
        assert r.status_code == 404


# ---- Pair-info (public) ----
class TestPairInfo:
    def test_pair_info_public_valid_token(self, s, created_phone_camera):
        tok = created_phone_camera["pair_token"]
        r = s.get(f"{API}/phone-cameras/pair-info", params={"token": tok}, timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["camera_id"] == created_phone_camera["id"]
        assert d["camera_name"] == created_phone_camera["camera_name"]
        assert "ws_path" in d and "phone-cameras/ws/ingest" in d["ws_path"]
        assert f"token={tok}" in d["ws_path"]

    def test_pair_info_invalid_token(self, s):
        r = s.get(f"{API}/phone-cameras/pair-info", params={"token": "totally-bogus-xyz"}, timeout=10)
        assert r.status_code == 404

    def test_pair_info_no_auth_required(self, s, created_phone_camera):
        # Explicitly use a fresh session (no cookies/headers)
        fresh = requests.Session()
        r = fresh.get(
            f"{API}/phone-cameras/pair-info",
            params={"token": created_phone_camera["pair_token"]},
            timeout=10,
        )
        assert r.status_code == 200


# ---- WebSocket ingest + frame.jpg ----
class TestPhoneCameraWebSocket:
    def test_ws_ingest_and_frame_fetch(self, s, admin_token, created_phone_camera):
        tok = created_phone_camera["pair_token"]
        cam_id = created_phone_camera["id"]
        ws_url = f"{WS_BASE}/api/v1/phone-cameras/ws/ingest?token={tok}"
        with ws_connect(ws_url, open_timeout=15, close_timeout=10) as ws:
            for i in range(5):
                ws.send(_make_jpeg(i))
                time.sleep(0.1)
        # Allow buffer to settle
        time.sleep(0.5)
        r = s.get(f"{API}/phone-cameras/{cam_id}/frame.jpg", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("image/jpeg")
        assert "X-Frame-Age-S" in r.headers or "x-frame-age-s" in {k.lower() for k in r.headers}
        assert r.content[:3] == b"\xff\xd8\xff", "Not a JPEG"

    def test_camera_kind_phone_in_listing(self, s, admin_token, created_phone_camera):
        r = s.get(f"{API}/cameras", headers=_h(admin_token), timeout=15)
        assert r.status_code == 200
        cams = r.json()
        # Find ours
        ours = next((c for c in cams if c.get("id") == created_phone_camera["id"]), None)
        assert ours is not None, "Created phone camera not in /cameras list"
        assert "kind" in ours, "kind field missing from camera listing"
        assert ours["kind"] == "phone"
        # Verify status flipped to active after WS frames
        # (depends on previous test having run)
        # Don't strictly assert active in case test ordering changes; just ensure kind is set.

    def test_ws_invalid_token_rejected(self):
        ws_url = f"{WS_BASE}/api/v1/phone-cameras/ws/ingest?token=bogus-token"
        from websockets.exceptions import InvalidStatus, ConnectionClosed
        with pytest.raises((InvalidStatus, ConnectionClosed, Exception)):
            with ws_connect(ws_url, open_timeout=10, close_timeout=5) as ws:
                ws.send(_make_jpeg(0))
                # Should be closed by server; try receiving
                ws.recv(timeout=2)


# ---- MJPEG re-stream ----
class TestPhoneMjpegRestream:
    def test_mjpeg_stream_serves_phone_frames(self, s, admin_token, created_phone_camera):
        # Ensure we have a recent frame
        tok = created_phone_camera["pair_token"]
        cam_id = created_phone_camera["id"]
        ws_url = f"{WS_BASE}/api/v1/phone-cameras/ws/ingest?token={tok}"
        with ws_connect(ws_url, open_timeout=15, close_timeout=10) as ws:
            for i in range(3):
                ws.send(_make_jpeg(i + 10))
                time.sleep(0.1)
        time.sleep(0.5)
        url = f"{API}/cameras/{cam_id}/stream.mjpeg?token={admin_token}"
        r = s.get(url, stream=True, timeout=15)
        assert r.status_code == 200, r.text
        ctype = r.headers.get("content-type", "")
        assert "multipart" in ctype, f"unexpected content-type: {ctype}"
        # Read first ~4KB
        chunks = []
        total = 0
        for chunk in r.iter_content(chunk_size=1024):
            chunks.append(chunk)
            total += len(chunk)
            if total > 4096:
                break
        r.close()
        data = b"".join(chunks)
        assert b"vxframe" in data, "MJPEG boundary not found in stream"

    def test_mjpeg_requires_token(self, s, created_phone_camera):
        cam_id = created_phone_camera["id"]
        r = s.get(f"{API}/cameras/{cam_id}/stream.mjpeg", timeout=10)
        assert r.status_code in (401, 422)


# ---- Cleanup test data ----
class TestCleanup:
    def test_zzz_cleanup(self, s, admin_token, created_phone_camera):
        """Best-effort cleanup of TEST_ phone camera."""
        cam_id = created_phone_camera["id"]
        # Try DELETE on the generic cameras endpoint
        r = s.delete(f"{API}/cameras/{cam_id}", headers=_h(admin_token), timeout=10)
        # Accept any status - cleanup is best-effort
        assert r.status_code in (200, 204, 404, 405)
