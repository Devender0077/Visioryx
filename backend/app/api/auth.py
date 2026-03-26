"""
Visioryx - Auth API
JWT authentication endpoints.
"""
import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.config import get_settings
from app.core.security import Role, create_access_token, get_password_hash, verify_password
from app.database.connection import get_db
from app.database.models import AuthUser, User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserMe,
)

router = APIRouter()


def _role_from_db(role_str: str) -> Role:
    try:
        return Role(role_str)
    except ValueError:
        return Role.OPERATOR


@router.post("/register", response_model=TokenResponse)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create an enrollee account and matching recognition User (or link login if User already exists)."""
    settings = get_settings()
    if not settings.ALLOW_PUBLIC_REGISTRATION:
        raise HTTPException(status_code=403, detail="Public registration is disabled")

    email_norm = data.email.strip().lower()
    existing_auth = await db.execute(select(AuthUser).where(func.lower(AuthUser.email) == email_norm))
    if existing_auth.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    existing_user = await db.execute(select(User).where(func.lower(User.email) == email_norm))
    rec_user = existing_user.scalar_one_or_none()

    pwd_hash = get_password_hash(data.password)
    auth = AuthUser(
        email=email_norm,
        hashed_password=pwd_hash,
        role=Role.ENROLLEE.value,
    )
    db.add(auth)
    if not rec_user:
        name = data.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name is required")
        rec_user = User(
            name=name[:255],
            email=email_norm,
            role=Role.ENROLLEE.value,
        )
        db.add(rec_user)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered") from None

    token = create_access_token(subject=email_norm, role=Role.ENROLLEE)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Login with email and password. Returns JWT."""
    email_norm = data.email.strip().lower()
    arr = _prune_failed_logins(email_norm)
    if len(arr) >= _MAX_FAILED_IN_WINDOW:
        raise HTTPException(
            status_code=429,
            detail="Too many failed login attempts. Try again in 15 minutes.",
        )
    result = await db.execute(select(AuthUser).where(func.lower(AuthUser.email) == email_norm))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        arr.append(time.time())
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account disabled")
    _FAILED_LOGIN_TIMESTAMPS.pop(email_norm, None)
    token = create_access_token(subject=user.email, role=_role_from_db(user.role))
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
