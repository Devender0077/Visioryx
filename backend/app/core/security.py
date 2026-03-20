"""
Visioryx - Security Module
JWT authentication and password hashing.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from enum import Enum
from typing import Optional

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings


class Role(str, Enum):
    """User roles for RBAC."""

    ADMIN = "admin"
    OPERATOR = "operator"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash."""
    try:
        return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hash password for storage."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def create_access_token(
    subject: str | int,
    role: Role = Role.OPERATOR,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create JWT access token."""
    settings = get_settings()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "role": role.value,
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate JWT token."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
