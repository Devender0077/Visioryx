"""VisionaryX backend regression test suite (pytest).

Covers: health/meta, auth (login/register/forgot/me), analytics, alerts,
cameras, stream, users (admin-only RBAC).
"""
from __future__ import annotations

import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback to frontend .env for local runs
    import re
    from pathlib import Path
    env_file = Path("/app/frontend/.env")
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            m = re.match(r"REACT_APP_BACKEND_URL\s*=\s*(.+)", line)
            if m:
                BASE_URL = m.group(1).strip().strip('"').rstrip("/")
                break

API = f"{BASE_URL}/api/v1"

ADMIN_EMAIL = "admin@visionaryx.dev"
ADMIN_PASSWORD = "VisionX2025!"
OPERATOR_EMAIL = "operator@visionaryx.dev"
OPERATOR_PASSWORD = "Operator2025!"


# ---- fixtures ----
@pytest.fixture(scope="session")
def s() -> requests.Session:
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def _login(sess: requests.Session, email: str, password: str) -> str:
    r = sess.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    tok = r.json()["access_token"]
    assert isinstance(tok, str) and len(tok) > 20
    return tok


@pytest.fixture(scope="session")
def admin_token(s: requests.Session) -> str:
    return _login(s, ADMIN_EMAIL, ADMIN_PASSWORD)


@pytest.fixture(scope="session")
def operator_token(s: requests.Session) -> str:
    return _login(s, OPERATOR_EMAIL, OPERATOR_PASSWORD)


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---- health & meta ----
class TestHealthMeta:
    def test_health(self, s):
        # /health is an internal liveness route, not exposed via /api ingress prefix.
        # Hit the backend directly on its internal port.
        r = s.get("http://localhost:8001/health", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "healthy"

    def test_meta_version(self, s):
        r = s.get(f"{API}/meta/version", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["backend_version"] == "2.0.0"
        assert d["app_name"] == "VisionaryX"


# ---- auth ----
class TestAuth:
    def test_login_success(self, s):
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert "access_token" in d
        assert d["token_type"] == "bearer"
        assert isinstance(d["expires_in"], int)

    def test_login_wrong_password(self, s):
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "WRONG_PWD!!"})
        assert r.status_code == 401

    def test_login_unknown_email(self, s):
        r = s.post(f"{API}/auth/login", json={"email": "nope@nowhere.dev", "password": "whatever123"})
        assert r.status_code == 401

    def test_me_with_token(self, s, admin_token):
        r = s.get(f"{API}/auth/me", headers=_h(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL
        assert d["role"] == "admin"
        assert "id" in d

    def test_me_without_token(self, s):
        r = s.get(f"{API}/auth/me", headers={"Content-Type": "application/json"})
        assert r.status_code == 401

    def test_register_new_then_duplicate(self, s):
        email = f"TEST_new_{uuid.uuid4().hex[:8]}@visionaryx.dev"
        body = {"email": email, "password": "StrongPass123!", "role": "operator", "name": "Test"}
        r = s.post(f"{API}/auth/register", json=body)
        assert r.status_code == 201, r.text
        assert "access_token" in r.json()
        # duplicate
        r2 = s.post(f"{API}/auth/register", json=body)
        assert r2.status_code == 409

    def test_forgot_password_always_ok(self, s):
        r = s.post(f"{API}/auth/forgot-password", json={"email": "doesnotexist@nowhere.dev"})
        assert r.status_code == 200
        assert r.json().get("ok") is True
        r2 = s.post(f"{API}/auth/forgot-password", json={"email": ADMIN_EMAIL})
        assert r2.status_code == 200
        assert r2.json().get("ok") is True


# ---- analytics ----
class TestAnalytics:
    def test_overview_requires_auth(self, s):
        r = s.get(f"{API}/analytics/overview")
        assert r.status_code == 401

    def test_overview_with_auth(self, s, admin_token):
        r = s.get(f"{API}/analytics/overview", headers=_h(admin_token))
        assert r.status_code == 200
        d = r.json()
        for k in [
            "total_users",
            "total_cameras",
            "active_cameras",
            "detections_today",
            "unknown_detections_today",
            "detection_trend_7d",
        ]:
            assert k in d, f"missing key {k}"
            assert isinstance(d[k], (int, float)), f"{k} not a number: {d[k]!r}"

    def test_detection_trends(self, s, admin_token):
        r = s.get(f"{API}/analytics/detection-trends?days=7", headers=_h(admin_token))
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) == 7
        for item in items:
            assert "date" in item and "count" in item
            assert isinstance(item["count"], int)


# ---- alerts ----
class TestAlerts:
    def test_list_default(self, s, admin_token):
        r = s.get(f"{API}/alerts?limit=10", headers=_h(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "total" in d
        assert isinstance(d["items"], list)
        assert isinstance(d["total"], int)
        assert len(d["items"]) <= 10

    def test_filter_severity(self, s, admin_token):
        r = s.get(f"{API}/alerts?severity=high&limit=50", headers=_h(admin_token))
        assert r.status_code == 200
        for it in r.json()["items"]:
            assert it["severity"] == "high"

    def test_filter_today_only(self, s, admin_token):
        r = s.get(f"{API}/alerts?today_only=true&limit=50", headers=_h(admin_token))
        assert r.status_code == 200

    def test_search_q(self, s, admin_token):
        r = s.get(f"{API}/alerts?q=Unrecognized&limit=50", headers=_h(admin_token))
        assert r.status_code == 200
        for it in r.json()["items"]:
            assert (
                "unrecognized" in it["alert_type"].lower()
                or "unrecognized" in it["message"].lower()
            )

    def test_mark_read_and_verify(self, s, admin_token):
        lst = s.get(f"{API}/alerts?limit=1", headers=_h(admin_token)).json()
        assert lst["items"], "no alerts seeded"
        aid = lst["items"][0]["id"]
        r = s.patch(f"{API}/alerts/{aid}/read", headers=_h(admin_token))
        assert r.status_code == 200
        assert r.json()["is_read"] is True


# ---- cameras ----
class TestCameras:
    def test_list_cameras_seeded(self, s, admin_token):
        r = s.get(f"{API}/cameras", headers=_h(admin_token))
        assert r.status_code == 200
        cams = r.json()
        assert isinstance(cams, list)
        assert len(cams) >= 6
        names = {c["camera_name"] for c in cams}
        assert "Front Gate" in names

    def test_admin_create_camera(self, s, admin_token):
        body = {"camera_name": f"TEST_cam_{uuid.uuid4().hex[:6]}", "rtsp_url": "rtsp://1.1.1.1/x", "is_enabled": True}
        r = s.post(f"{API}/cameras", json=body, headers=_h(admin_token))
        assert r.status_code == 201, r.text
        created = r.json()
        assert created["camera_name"] == body["camera_name"]
        # cleanup
        s.delete(f"{API}/cameras/{created['id']}", headers=_h(admin_token))

    def test_operator_cannot_create_camera(self, s, operator_token):
        body = {"camera_name": "TEST_nope", "rtsp_url": "rtsp://x/x"}
        r = s.post(f"{API}/cameras", json=body, headers=_h(operator_token))
        assert r.status_code == 403


# ---- stream ----
class TestStream:
    def test_stream_status(self, s, admin_token):
        r = s.get(f"{API}/stream/status", headers=_h(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert "active_camera_ids" in d
        assert isinstance(d["active_camera_ids"], list)


# ---- users (admin RBAC) ----
class TestUsers:
    def test_admin_can_list_users(self, s, admin_token):
        r = s.get(f"{API}/users", headers=_h(admin_token))
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list)
        emails = {u["email"] for u in users}
        assert ADMIN_EMAIL in emails
        assert OPERATOR_EMAIL in emails

    def test_operator_cannot_list_users(self, s, operator_token):
        r = s.get(f"{API}/users", headers=_h(operator_token))
        assert r.status_code == 403
