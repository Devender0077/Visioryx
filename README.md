# Visioryx

**AI Powered Real-Time Face Recognition & Surveillance System**

Developed by: Devender Vutukuru

---

## Overview

Visioryx is a production-grade real-time AI surveillance system with:

- **Face Recognition** — Known person identification
- **Unknown Face Detection** — Detection and clustering of unregistered individuals
- **Object Detection** — YOLOv8 for person, phone, laptop, bag, etc.
- **Multi-Camera Monitoring** — Per-camera workers with async pipelines
- **Real-Time Alerts** — WebSocket push to dashboard
- **Analytics Dashboard** — Detection trends, charts, searchable history

**100% open-source. No paid APIs.**

---

## Technology Stack

| Layer | Technologies |
|-------|-------------|
| Backend | Python, FastAPI, SQLAlchemy, OpenCV, NumPy |
| Face Recognition | InsightFace (or face_recognition) |
| Object Detection | YOLOv8 (Ultralytics) |
| Frontend | Next.js 14, React, TypeScript, TailwindCSS |
| Dashboard UI | [material-kit-react](https://github.com/minimal-ui-kit/material-kit-react) (MIT, optional reference) |
| Database | PostgreSQL |
| Real-time | WebSockets |
| Deployment | Docker, Docker Compose |

---

## Project Structure

```
ai-surveillance-system/
├── backend/
│   ├── app/
│   │   ├── api/          # auth, users, cameras, detections, analytics
│   │   ├── core/         # config, security, websocket, logger
│   │   ├── ai/           # face_detector, face_embedding, face_matcher, object_detector
│   │   ├── services/     # camera_worker, recognition_pipeline, logging, alert
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

## Quick Start

```bash
# macOS/Linux
./scripts/start-dev.sh        # Start backend + frontend (kills busy ports first)
./scripts/start-dev.sh backend
./scripts/start-dev.sh frontend

# Windows PowerShell
.\scripts\start-dev.ps1 -Target all
```

---

## Phase 1 — Installation

### Prerequisites

- Python 3.10+
- Node.js 20+
- PostgreSQL 14+
- Docker & Docker Compose (optional)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

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
# Verify DB: curl http://localhost:8000/health/db
```

---

## Environment Variables

### Backend (`.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Async PostgreSQL URL | `postgresql+asyncpg://postgres:postgres@localhost:5432/visioryx` |
| `DATABASE_URL_SYNC` | Sync URL for Alembic | `postgresql://postgres:postgres@localhost:5432/visioryx` |
| `SECRET_KEY` | JWT secret (use `openssl rand -hex 32`) | — |
| `FACE_SIMILARITY_THRESHOLD` | Cosine similarity for known | `0.6` |
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
| `scripts/start-dev.sh` | Start dev (kills 3000/8000 if busy) |
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

## Troubleshooting

### Docker build fails: "g++ failed: No such file or directory"
The backend image includes `build-essential` for InsightFace. If you see this, ensure you're using the latest `Dockerfile.backend`.

### Start Stream shows black / no video
- **RTSP unreachable:** In Docker, the backend container may not reach cameras on your LAN. Use `network_mode: host` for the backend, or set RTSP URL to `host.docker.internal` (Mac/Windows) for local cameras.
- **Demo mode:** Use `test://` or `demo://` as the RTSP URL (e.g. `test://1`) to get a test pattern stream without a real camera.

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
