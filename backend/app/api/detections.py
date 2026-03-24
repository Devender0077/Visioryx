"""
Visioryx - Detections API
Detection history and search endpoints.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import SurveillanceUser
from app.database.connection import get_db
from app.database.models import Detection, UnknownFace
from app.schemas.detections import DetectionListItem

router = APIRouter()


def _detection_to_item(d: Detection) -> DetectionListItem:
    cam = d.camera
    usr = d.user
    return DetectionListItem(
        id=d.id,
        camera_id=d.camera_id,
        camera_name=cam.camera_name if cam else None,
        user_id=d.user_id,
        user_name=usr.name if usr else None,
        status=d.status,
        confidence=d.confidence,
        timestamp=d.timestamp,
    )


@router.get("", response_model=list[DetectionListItem])
async def list_detections(
    db: AsyncSession = Depends(get_db),
    current_user: SurveillanceUser = None,
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
    q = q.options(selectinload(Detection.user), selectinload(Detection.camera))
    q = q.limit(limit).offset(offset)
    result = await db.execute(q)
    rows = result.scalars().unique().all()
    return [_detection_to_item(d) for d in rows]


@router.get("/unknown-faces")
async def list_unknown_faces(
    db: AsyncSession = Depends(get_db),
    current_user: SurveillanceUser = None,
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
    current_user: SurveillanceUser = None,
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
