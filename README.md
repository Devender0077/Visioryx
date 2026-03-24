# Visioryx

**AI Powered Real-Time Face Recognition & Surveillance System**

Developed by: Devender Vutukuru

---

## Overview

Visioryx is a production-grade real-time AI surveillance system for **single-admin** use. One superadmin account (`admin@visioryx.dev`) has full access; no multi-tenant or operator roles.

Features:

- **Face Recognition** — Known person identification
- **Unknown Face Detection** — Detection of unregistered individuals (snapshots / review)
- **Object Detection** — YOLOv8 for person, phone, laptop, bag, etc.
- **Multi-Camera Monitoring** — Per-camera workers with async pipelines
- **Real-Time Alerts** — WebSocket push to dashboard
- **Analytics Dashboard** — Detection trends, charts, searchable history

**100% open-source. No paid APIs.**

---

## Architecture

Visioryx is a **full-stack** app: **Python backend** (FastAPI) + **React frontend** (Next.js). The `.py` files are the backend API and AI services—they do not need to be converted. The frontend calls the backend via HTTP. This is standard and correct.

| Layer | Technologies |
|-------|-------------|
| Backend | Python, FastAPI, SQLAlchemy, OpenCV, NumPy |
| Face Recognition | InsightFace |
| Object Detection | YOLOv8 (Ultralytics; weights download on first use) |
| Frontend | Next.js 15, React, TypeScript, TailwindCSS |
| Dashboard UI | MUI Material 5, minimals.cc style |
| Database | PostgreSQL |
| Real-time | WebSockets |
| Deployment | Docker, Docker Compose |

---

## Project Structure

```
Visioryx/
├── backend/
│   ├── app/
│   │   ├── api/          # auth, users, cameras, detections, analytics
│   │   ├── core/         # config, security, websocket, logger
│   │   ├── ai/           # face_detector, face_embedding, face_matcher, object_detector
│   │   ├── services/     # stream_manager, recognition_pipeline, face_enrollment, logging, alert
│   │   ├── database/     # connection, models, migrations
│   │   └── main.py
│   ├── models/           # InsightFace, YOLOv8 weights
│   └── storage/         # registered_faces, unknown_faces, snapshots
├── frontend/
│   └── src/
│       ├── app/          # dashboard, cameras, users, detections, analytics, alerts
│       ├── components/   # camera-stream, face-box, object-box, tables, charts
│       └── websocket/    # socket.ts
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
└── scripts/
    ├── register_user.py
    └── train_faces.py
```

---

## New machine checklist

1. **Install [Node.js 20+](https://nodejs.org)** (includes `npm`) and **Python 3.10+** (e.g. `brew install python@3.12` on macOS).
2. **Install [PostgreSQL 14+](https://www.postgresql.org/download/)** locally, *or* run only the DB in Docker:  
   `docker compose -f docker/docker-compose.dev.yml up -d`
3. **Configure the backend:** `cp backend/.env.example backend/.env` and set `DATABASE_URL` / `DATABASE_URL_SYNC` to match your Postgres (defaults assume `postgres` / `postgres` on `localhost:5432`, database `visioryx`).
4. **Verify your environment** (tools + DB + tables after venv exists):  
   `./scripts/preflight.sh`
5. **Start the app:** `./scripts/start-dev.sh` — migrations run automatically; if Postgres is down or `.env` is wrong, the backend **stops with an error** instead of starting without a database.

6. **Object detection (YOLO) on live streams:** Admins can toggle this under **Profile → Detection & AI** (stored in `app_settings`). It overrides `STREAM_ENABLE_YOLO_OVERLAY` from `.env` until you choose “Use environment default”. Requires migration `002` (included in `alembic upgrade head`).

7. **Face matching:** Enroll with a **frontal** face when possible (or use **Users → QR** for multi-angle self-capture on a phone). Live CCTV often sees **profiles** or distant subjects; the backend uses **three** cosine tiers (`FACE_SIMILARITY_THRESHOLD`, `FACE_SIMILARITY_THRESHOLD_RELAXED`, `FACE_SIMILARITY_THRESHOLD_WIDE` in `.env`). The DB stores **one** merged embedding per user (latest enrollment wins). Tune thresholds if you see false accepts or missed IDs.

**`pip: command not found` (macOS / minimal PATH):** use the venv interpreter, not bare `pip`:

`cd backend && ./venv/bin/python -m pip install -r requirements.txt`  
(create the venv first if needed: `python3 -m venv venv`)

---

## Quick Start

```bash
# macOS/Linux
./scripts/start-dev.sh        # Start backend + frontend (kills busy ports first)
./scripts/start-dev.sh backend
./scripts/start-dev.sh frontend

# If Python/OpenCV crashes on macOS, run backend supervised (auto-restarts):
# (also uses safer default streaming mode: STREAM_MODE=hls)
./scripts/start-backend-supervised.sh

# Live face boxes: STREAM_ENABLE_AI_OVERLAY defaults to true (OpenCV Haar on macOS when FACE_DETECTION_BACKEND=auto).
# Set STREAM_ENABLE_AI_OVERLAY=false only if you need video-only preview. YOLO defaults off on macOS (STREAM_ENABLE_YOLO_OVERLAY).

# Live name matching: once any user has an enrolled embedding, the overlay uses InsightFace on the stream so faces can be matched (Haar has no embeddings).
# If the backend crashes on live, set STREAM_FORCE_HAAR_LIVE=true (names will always be Unknown). Or run the API on Linux.
# Ceiling / wide-angle cameras: Haar often misses faces. On Linux you can use STREAM_ENABLE_HOG_PERSONS=true (OpenCV HOG). On macOS HOG defaults OFF — it can trigger SIGFPE crashes (OpenBLAS/numpy); use YOLO on Linux or a Linux server for person boxes instead.

# Windows PowerShell
.\scripts\start-dev.ps1 -Target all
```

### Live monitoring: leaving the page

When you click **Start** on Live Monitoring, the **backend** opens the RTSP feed and keeps decoding it until you click **Stop** (or the API process restarts). **Navigating away from the dashboard does not stop the stream** — the server work continues in the background, which uses CPU and network until you stop it. If you want streams to stop when you leave the page, that would require a product change (e.g. auto-stop on unmount); today you must use **Stop** per camera.

### Face enrollment (QR, phone, multi-angle)

1. **Admin** creates a recognition user (Users page) with name + email.
2. **Option A — QR / link:** Click the **QR** icon → scan or copy the URL. Opens `/enroll?token=…` on a phone (same network as the app if using `localhost`; for phones use your machine’s LAN IP in `NEXT_PUBLIC_API_URL` or open the dashboard via the server hostname). The person adds **front (required)** + optional **left/right** photos; the server **averages** embeddings into **one** 512-D vector (same storage as before).
3. **Option B — Logged-in user:** If **Users** profile email **matches** the dashboard login email, open **Profile → “face enrollment”** or go to `/enroll` while signed in — no QR token needed (`POST /api/v1/enroll/upload-session`).
4. **Option C — Admin upload:** Classic single-file upload from the Users table (still supported).

Enrollment links expire after **`ENROLLMENT_TOKEN_EXPIRE_HOURS`** (default 48). They are signed JWTs — keep `SECRET_KEY` private.

**Dashboard vs enrollment (who needs what):**

| Person | Needs dashboard login? | How they enroll |
|--------|------------------------|-----------------|
| **Operator / admin** | Yes (`/login`) — uses Cameras, Live, Users, etc. | Can upload faces in **Users** or open **QR** for someone else. |
| **Employee / visitor (QR only)** | **No** — open `/enroll?token=…` from phone after admin creates their **Users** row and shares the link. | Finishes on **Confirm → Photos → Review → Done**; never sees the main app. |
| **Same person with both** | Optional — if their **Users** email matches their **Auth** email, they can use `/enroll` while logged in from **Profile**. | Same wizard. |
| **Public signup (enrollee)** | Yes — **`/register`** creates login + a matching **Users** row (`enrollee` role). | After signup you are sent to **`/enroll`** to upload face photos. Surveillance (Live, Cameras, analytics, etc.) stays **operator/admin** only. |

**Public registration** is controlled by **`ALLOW_PUBLIC_REGISTRATION`** in `backend/.env` (default **true** in code; set **`false`** in production if you only want admins to create accounts). The API is **`POST /api/v1/auth/register`** (name, email, password). If an admin already created a **Users** row for that email but no login yet, signup **attaches** dashboard credentials to the existing profile instead of duplicating it.

**macOS SIGFPE (OpenBLAS / numpy):** If Python crashes with `EXC_ARITHMETIC` in `libopenblas` / `inv`, always start the API via `./scripts/start-dev.sh` (sets thread limits) and ensure `app/runtime_env` loads first. The backend **forces** single-thread BLAS on **darwin** at import time.

### PostgreSQL & migrations

Detections, users, and alerts are stored in **PostgreSQL**. The dev script runs `alembic upgrade head` before starting the API.

1. **Start Postgres** (recommended):
   ```bash
   docker compose -f docker/docker-compose.dev.yml up -d
   ```
2. **Copy** `backend/.env.example` → `backend/.env` and ensure `DATABASE_URL` / `DATABASE_URL_SYNC` point at `localhost:5432/visioryx`.
3. **Verify** after the backend is up:
   ```bash
   curl -s http://localhost:8000/health/db
   ```
   Expect `"status":"healthy","database":"connected"`.

If migrations fail, the dev script prints a short hint (DB not running or wrong URL).

---

## Phase 1 — Installation

### Prerequisites

- Python 3.10+
- Node.js 20+
- PostgreSQL 14+
- Docker & Docker Compose (optional)
- FFmpeg (recommended for stable live streaming / HLS)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Object detection: on first use, YOLOv8 nano weights (~6.5MB) download automatically if not present.

# Copy environment
cp .env.example .env
# Edit .env with your DATABASE_URL and SECRET_KEY

# Run migrations
alembic upgrade head

# Start API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Database (PostgreSQL)

Create database:

```sql
CREATE DATABASE visioryx;
```

Or use Docker:

```bash
docker run -d --name visioryx-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=visioryx \
  -p 5432:5432 \
  postgres:16-alpine
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment
cp .env.example .env.local

# Start dev server
npm run dev
```

Dashboard: http://localhost:3000  
API docs: http://localhost:8000/api/docs

**If the UI shows blank pages, `Cannot find module './NNN.js'`, or `404` on `/_next/static/chunks/...`:** stop the dev server, run `npm run clean` (or `rm -rf .next`) in `frontend/`, then `npm run dev` again. That clears a stale Next.js build cache; also avoid running two `next dev` processes on port 3000.

### 4. Seed Admin User (First Time)

```bash
cd backend
python scripts/seed_admin.py
# Creates: admin@visioryx.dev / admin123
```

### 5. Docker (Full Stack)

```bash
# From project root
cp backend/.env.example backend/.env

docker compose -f docker/docker-compose.yml up -d

# Migrations and admin seed run automatically on backend startup.
# DB container uses host port 5433 (avoids conflict with local PostgreSQL on 5432).
# Verify: ./scripts/verify.sh or curl -sf http://localhost:8000/health/db (expects HTTP 200; 503 = DB down)
```

---

## Environment Variables

### Backend (`.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Async PostgreSQL URL | `postgresql+asyncpg://postgres:postgres@localhost:5432/visioryx` |
| `DATABASE_URL_SYNC` | Sync URL for Alembic | `postgresql://postgres:postgres@localhost:5432/visioryx` |
| `SECRET_KEY` | JWT secret (use `openssl rand -hex 32`) | — |
| `CORS_ORIGINS` | Comma-separated browser origins allowed for the API | `http://localhost:3000,http://127.0.0.1:3000` |
| `FACE_SIMILARITY_THRESHOLD` | Cosine similarity to enrolled face (lower = more matches) | `0.52` |
| `DEBUG` | Enable debug mode | `false` |

### Frontend (`.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL |

---

## Database Migrations

```bash
cd backend

# Create new migration
alembic revision -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/start-dev.sh` | Start dev (runs migrations + schema check; kills 3000/8000 if busy) |
| `scripts/preflight.sh` | Check Node/Python, optional DB/tables (after `backend/venv` exists) |
| `scripts/check_setup.py` | PostgreSQL + expected tables + Alembic revision (used by start + preflight) |
| `scripts/verify.sh` | Docker, DB, API, frontend smoke checks |
| `scripts/register_user.py` | Register user with face image |
| `scripts/train_faces.py` | Batch extract embeddings for users |
| `backend/scripts/seed_admin.py` | Create admin@visioryx.dev / admin123 |

## Phase Status

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ | Project setup, DB, config |
| 2 | ✅ | APIs, Auth, Face Recognition, Object Detection |
| 3 | ✅ | Camera workers, WebSocket, Dashboard UI |
| 4 | ✅ | Alerts, Analytics, Face upload, UI polish |
| 5 | ✅ | Live MJPEG streaming, Stream manager, Detection logging |
| 6 | ✅ | Face/object detection overlay on live stream, auto-embedding on upload, fullscreen/zoom, auth enforcement |

---

## Docker Deployment

```bash
cd /path/to/Visioryx
docker compose -f docker/docker-compose.yml up --build -d
```

**Services:**
- `db` — PostgreSQL 16 on port 5432
- `backend` — FastAPI on port 8000 (runs migrations + seeds admin on startup)
- `frontend` — Next.js on port 3000

**First run:** Admin user is auto-created: `admin@visioryx.dev` / `admin123`

**Faster rebuilds:** Use `DOCKER_BUILDKIT=1 docker compose build` to enable pip cache (subsequent builds reuse downloaded packages).

**VPS / Production:**
1. Set `SECRET_KEY` in `backend/.env.docker` or override via compose `environment`
2. Build frontend with your API URL:
   ```yaml
   frontend:
     build:
       args:
         NEXT_PUBLIC_API_URL: https://api.yourdomain.com
         NEXT_PUBLIC_WS_URL: wss://api.yourdomain.com
   ```
3. Use a reverse proxy (nginx/Caddy) for HTTPS

---

## Verification

Run the verification script to check Docker, database, and services:

```bash
./scripts/verify.sh
```

---

## Troubleshooting

### Docker: port 5432 already allocated

The Docker db service uses host port **5433** to avoid conflict with local PostgreSQL. If you need the db on 5432, stop local PostgreSQL first, or edit `docker/docker-compose.yml` to use `5432:5432`.

### Docker build fails: "g++ failed: No such file or directory"
The backend image includes `build-essential` for InsightFace. If you see this, ensure you're using the latest `Dockerfile.backend`.

### Dashboard: `ChunkLoadError` / “Loading chunk app/layout failed (timeout)”

This usually means the browser asked for an **old** JavaScript chunk after the dev server **restarted** or **recompiled**. **Fix:** hard-refresh the page (`Cmd+Shift+R` / `Ctrl+Shift+R`) or stop the dev server, run `rm -rf frontend/.next` from the repo root, then `./scripts/start-dev.sh frontend` again. The app includes a one-time automatic reload when this error occurs; if it persists, clear site data for `localhost:3000` or try an incognito window.

### Live preview is choppy / stuttering
The MJPEG capture loop **never blocks** on InsightFace: heavy detection runs in a **background thread** while each frame is JPEG-encoded with the latest cached boxes. **`STREAM_ANNOTATE_EVERY_N_FRAMES`** (default 10) controls how often a new detection pass is *scheduled* (labels may update slightly after the scene changes). Increase (e.g. `15`) if the CPU still struggles; tune **`STREAM_MAX_WIDTH`** and **`STREAM_JPEG_QUALITY`** in `backend/.env` if needed. For the smoothest experience on a weak CPU, use **`STREAM_MODE=hls`** with FFmpeg (see env docs).

### Start Stream shows black / no video
- **RTSP unreachable:** In Docker, the backend container may not reach cameras on your LAN. Use `network_mode: host` for the backend, or set RTSP URL to `host.docker.internal` (Mac/Windows) for local cameras.
- **Remote access:** RTSP with local IPs (192.168.x.x) only works when Visioryx runs on the same network as the cameras. If cameras are at the office and you're at home: deploy Visioryx at the office, or connect via VPN. See `docs/CP-PLUS-RTSP-SETUP.md` for details.
- **Works on another PC but not this laptop:** Live video is pulled by the **backend** (OpenCV/FFmpeg), not the browser. That PC must be on the **same LAN (or VPN)** as the DVR/camera IP (e.g. `192.168.0.3`). Your browser only loads MJPEG from the API; if the API cannot open `rtsp://…`, you see “No signal”. Check: Wi‑Fi vs Ethernet, firewall/VPN, and that you’re not running the backend only inside Docker without LAN access. From the machine running the backend, test: `./scripts/test_rtsp.sh 'rtsp://…'` (requires `ffmpeg`) or VLC with the same URL.
- **Stream stops after a few seconds:** The MJPEG stream uses the direct backend URL (`getStreamBase()`) to bypass the Next.js proxy timeout. Ensure `NEXT_PUBLIC_API_URL` points to your backend (e.g. `http://localhost:8000` in dev). In production, set it to your API host so streams connect directly.

### Detections always show “unknown”

Recognition only labels **known** when a face matches a **registered user** who has an **enrolled face embedding** (Users → upload a clear front-facing photo). Otherwise events stay **unknown** — that is expected. If you have enrolled users but still see only unknown, try lowering `FACE_SIMILARITY_THRESHOLD` slightly in `backend/.env` (e.g. `0.45`–`0.5`) and restart the backend.

**Angles and distance (practical limits):** InsightFace compares a **live crop** to the **enrolled** embedding. **Side profiles** vs a **frontal-only** enrollment often score low; use the built-in relaxed/wide tiers or add a **profile enrollment** image. **Rule of thumb** for reliable IDs: the face bounding box should be at least **~48–80 px tall** in the decoded stream (roughly **~2–5 m** for a typical ceiling camera at **720p** decode, depending on lens and FOV). **Far background** rows with **tiny faces** (~&lt;32 px) may remain Unknown or need a **closer camera**, **higher decode resolution** (`STREAM_DECODE_WIDTH` / `HEIGHT`), or **lower** similarity thresholds (accepting more false positives). **Stream quality:** defaults favor clearer MJPEG (`STREAM_JPEG_QUALITY`, 720p decode); on a weak CPU, reduce decode size (e.g. 960×540) and quality to keep FPS smooth.

**“No embedding” after upload:** The API must run **InsightFace** (not OpenCV-only). Install backend deps, ensure `backend/models/insightface` weights downloaded, and restart. Re-upload a **single, large, front-facing** face; group shots enroll the **largest** face only.

**Multiple people / occlusion / walking past:** The pipeline runs face detection on each processed frame and logs **each** face separately. Hard scenes (profile view, hats, low light) lower match quality — re-enroll with representative photos or tune `FACE_SIMILARITY_THRESHOLD`. **Person tracking** (same ID as someone moves) would require a separate tracker (e.g. ByteTrack) — not bundled yet.

### Stream returns 404 (POST /api/v1/stream/1/start)

The stream routes are registered when the backend starts. If you see 404, **restart the backend** so it picks up the stream router:

```bash
# Stop any running backend (Ctrl+C or kill port 8000), then:
./scripts/start-dev.sh backend
# Or full stack:
./scripts/start-dev.sh
```

On startup, you should see: `Stream API registered: /api/v1/stream/{camera_id}/start, /stop, /mjpeg`

---

## License

Proprietary — Devender Vutukuru
