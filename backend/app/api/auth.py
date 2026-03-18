"""
Visioryx - Auth API
JWT authentication endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.security import Role, create_access_token, get_password_hash, verify_password
from app.database.connection import get_db
from app.database.models import AuthUser
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserMe,
)

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Login with email and password. Returns JWT."""
    result = await db.execute(select(AuthUser).where(AuthUser.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account disabled")
    token = create_access_token(subject=user.email, role=Role(user.role))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserMe)
async def get_me(current_user: CurrentUser):
    """Get current authenticated user."""
    return UserMe(id=current_user.id, email=current_user.email, role=current_user.role)


@router.patch("/me", response_model=UserMe)
async def update_profile(
    data: UpdateProfileRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Update email. Requires current password."""
    result = await db.execute(select(AuthUser).where(AuthUser.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid password")
    if data.email and data.email != user.email:
        existing = await db.execute(select(AuthUser).where(AuthUser.email == data.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = data.email
    await db.commit()
    await db.refresh(user)
    return UserMe(id=user.id, email=user.email, role=user.role)


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Change password. Requires current password."""
    result = await db.execute(select(AuthUser).where(AuthUser.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid current password")
    user.hashed_password = get_password_hash(data.new_password)
    await db.commit()
    return {"message": "Password updated successfully"}
