"""
Visioryx - Alerts API
Alert management and listing.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.database.connection import get_db
from app.database.models import Alert

router = APIRouter()


@router.get("")
async def list_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None,
    unread_only: bool = False,
    limit: int = Query(50, le=200),
    offset: int = 0,
):
    """List alerts."""
    q = select(Alert).order_by(Alert.timestamp.desc())
    if unread_only:
        q = q.where(Alert.is_read == False)
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


@router.patch("/{alert_id}/read")
async def mark_read(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None,
):
    """Mark alert as read."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        return {"ok": False}
    alert.is_read = True
    await db.flush()
    return {"ok": True}
