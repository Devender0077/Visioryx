#!/usr/bin/env python3
"""Seed initial admin user. Run: python scripts/seed_admin.py"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.database.connection import Base
from app.database.models import AuthUser


async def seed():
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        result = await db.execute(select(AuthUser).where(AuthUser.email == "admin@visioryx.dev"))
        if result.scalar_one_or_none():
            print("Admin already exists")
            return
        admin = AuthUser(
            email="admin@visioryx.dev",
            hashed_password=get_password_hash("admin123"),
            role="admin",
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print("Created admin: admin@visioryx.dev / admin123")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
