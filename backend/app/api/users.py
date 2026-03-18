"""
Visioryx - Users API
User/face registration endpoints.
"""
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AdminUser, CurrentUser
from app.core.security import decode_access_token
from app.database.connection import get_db
from app.database.models import User
from app.schemas.users import UserCreate, UserResponse, UserUpdate

router = APIRouter()


@router.get("", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = None,
):
    """List all registered users."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=UserResponse)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = None,
):
    """Register a new user (face embedding added via upload)."""
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(name=data.name, email=data.email)
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = None,
):
    """Get user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = None,
):
    """Update user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(user, k, v)
    await db.flush()
    await db.refresh(user)
    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = None,
):
    """Delete user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    return {"ok": True}


@router.post("/{user_id}/upload-face")
async def upload_face_image(
    user_id: int,
    file: UploadFile = File(..., description="Face image (jpg, png)"),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = None,
):
    """Upload face image for user. Face embedding is extracted automatically."""
    import os
    from app.core.config import get_settings
    from app.ai.face_embedding import extract_embeddings_from_image

    settings = get_settings()
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    os.makedirs(settings.REGISTERED_FACES_PATH, exist_ok=True)
    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    path = os.path.join(settings.REGISTERED_FACES_PATH, f"user_{user_id}.{ext}")
    with open(path, "wb") as f:
        f.write(await file.read())
    user.image_path = path
    embeddings = extract_embeddings_from_image(path)
    if embeddings:
        user.face_embedding = embeddings[0]
    await db.flush()
    return {"image_path": path, "embedding_extracted": bool(embeddings)}


@router.get("/{user_id}/photo")
async def get_user_photo(
    user_id: int,
    token: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Serve uploaded user photo.
    Uses token query param because <img> cannot send Authorization headers.
    """
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    if decode_access_token(token) is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.image_path:
        raise HTTPException(status_code=404, detail="Photo not found")

    import mimetypes

    media_type, _ = mimetypes.guess_type(user.image_path)
    return FileResponse(
        user.image_path,
        media_type=media_type or "application/octet-stream",
        headers={"Cache-Control": "no-store"},
    )
