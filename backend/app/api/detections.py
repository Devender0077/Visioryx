"""
Visioryx - Detections API
Detection history and search endpoints.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.database.connection import get_db
from app.database.models import Detection, Camera, User, UnknownFace

router = APIRouter()


@router.get("")
async def list_detections(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None,
    camera_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
):
    """List detections with filters."""
    q = select(Detection).order_by(Detection.timestamp.desc())
    if camera_id:
        q = q.where(Detection.camera_id == camera_id)
    if status_filter:
        q = q.where(Detection.status == status_filter)
    if from_date:
        q = q.where(Detection.timestamp >= from_date)
    if to_date:
        q = q.where(Detection.timestamp <= to_date)
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/unknown-faces")
async def list_unknown_faces(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None,
    cluster_id: Optional[int] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
):
    """List unknown face snapshots."""
    q = select(UnknownFace).order_by(UnknownFace.timestamp.desc())
    if cluster_id is not None:
        q = q.where(UnknownFace.cluster_id == cluster_id)
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/stats")
async def detection_stats(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None,
):
    """Today's detection counts."""
    today = datetime.utcnow().date()
    total = await db.execute(
        select(func.count(Detection.id)).where(
            func.date(Detection.timestamp) == today
        )
    )
    unknown = await db.execute(
        select(func.count(Detection.id)).where(
            and_(
                func.date(Detection.timestamp) == today,
                Detection.status == "unknown"
            )
        )
    )
    return {
        "today_total": total.scalar() or 0,
        "today_unknown": unknown.scalar() or 0,
    }
