#!/usr/bin/env python3
"""
Visioryx - Face Training Script
Batch extract face embeddings for users with image_path but no embedding.
Usage: python scripts/train_faces.py
"""
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.database.models import User
from app.ai.face_embedding import extract_embeddings_from_image


async def train():
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        result = await db.execute(select(User).where(User.image_path.isnot(None)))
        users = result.scalars().all()
        updated = 0
        for user in users:
            if user.face_embedding:
                continue
            if not user.image_path or not os.path.exists(user.image_path):
                print(f"Skip {user.email}: image not found")
                continue
            embeddings = extract_embeddings_from_image(user.image_path)
            if not embeddings:
                print(f"Skip {user.email}: no face detected")
                continue
            user.face_embedding = embeddings[0]
            updated += 1
            print(f"Updated: {user.email}")
        await db.commit()
        print(f"Updated {updated} users")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(train())
