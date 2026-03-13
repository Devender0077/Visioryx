#!/usr/bin/env python3
"""
Visioryx - User Registration Script
Register a new user with face image and extract embedding.
Usage: python scripts/register_user.py --name "John Doe" --email john@example.com --image path/to/face.jpg
"""
import argparse
import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.database.connection import Base
from app.database.models import User
from app.ai.face_embedding import extract_embeddings_from_image


async def register(name: str, email: str, image_path: str):
    settings = get_settings()
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        result = await db.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            print(f"User with email {email} already exists")
            return
        embeddings = extract_embeddings_from_image(image_path)
        if not embeddings:
            print("No face detected in image. Use a clear frontal face photo.")
            return
        emb = embeddings[0]
        os.makedirs(settings.REGISTERED_FACES_PATH, exist_ok=True)
        dest = os.path.join(settings.REGISTERED_FACES_PATH, f"{email.replace('@', '_')}.jpg")
        import shutil
        shutil.copy(image_path, dest)
        user = User(name=name, email=email, image_path=dest, face_embedding=emb)
        db.add(user)
        await db.commit()
        print(f"Registered: {name} <{email}>")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", required=True)
    parser.add_argument("--email", required=True)
    parser.add_argument("--image", required=True)
    args = parser.parse_args()
    asyncio.run(register(args.name, args.email, args.image))
