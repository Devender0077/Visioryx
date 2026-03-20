#!/usr/bin/env python3
"""
Verify PostgreSQL connectivity, Alembic revision, and expected tables.
Uses DATABASE_URL / DATABASE_URL_SYNC from backend/.env when present.
Run with backend venv: backend/venv/bin/python scripts/check_setup.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# Project root = parent of scripts/
ROOT = Path(__file__).resolve().parent.parent
ENV_PATH = ROOT / "backend" / ".env"

# Tables created by 001_initial_schema (+ alembic_version from migrations)
EXPECTED_TABLES = frozenset(
    {
        "alembic_version",
        "auth_users",
        "users",
        "cameras",
        "detections",
        "objects",
        "unknown_faces",
        "alerts",
    }
)


def load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v


def sync_database_url() -> str:
    load_dotenv(ENV_PATH)
    url = os.environ.get("DATABASE_URL_SYNC") or os.environ.get("DATABASE_URL", "")
    if not url:
        url = "postgresql://postgres:postgres@localhost:5432/visioryx"
    if url.startswith("postgresql+asyncpg://"):
        return "postgresql://" + url.split("postgresql+asyncpg://", 1)[1]
    return url


def main() -> int:
    try:
        from sqlalchemy import create_engine, text
    except ImportError:
        print("FAIL: sqlalchemy not installed (activate backend venv and: pip install -r requirements.txt)")
        return 1

    url = sync_database_url()
    try:
        engine = create_engine(url, connect_args={"connect_timeout": 5})
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            r = conn.execute(
                text(
                    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
                )
            )
            tables = {row[0] for row in r}
            ver = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
    except Exception as e:
        print(f"FAIL: Database: {e}")
        print("      Ensure PostgreSQL is running and backend/.env has correct DATABASE_URL / DATABASE_URL_SYNC.")
        print("      Quick DB: docker compose -f docker/docker-compose.dev.yml up -d")
        return 1

    missing = EXPECTED_TABLES - tables
    if missing:
        print(f"FAIL: Missing tables: {', '.join(sorted(missing))}")
        print("      Run: cd backend && PYTHONPATH=. alembic upgrade head")
        return 1

    print(f"OK: PostgreSQL — {len(tables)} public tables, alembic revision: {ver}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
