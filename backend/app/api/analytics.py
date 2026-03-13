"""
Visioryx - Analytics API
System analytics and dashboard metrics.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.database.connection import get_db
from app.database.models import Detection, Camera, User, ObjectDetection

router = APIRouter()


@router.get("/overview")
async def overview(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None,
):
    """Dashboard overview: total users, active cameras, today's detections."""
    users_count = await db.execute(select(func.count(User.id)))
    cameras_count = await db.execute(select(func.count(Camera.id)).where(Camera.is_enabled == True))
    cameras_active = await db.execute(select(func.count(Camera.id)).where(Camera.status == "active"))
    today = datetime.utcnow().date()
    detections_today = await db.execute(
        select(func.count(Detection.id)).where(func.date(Detection.timestamp) == today)
    )
    unknown_today = await db.execute(
        select(func.count(Detection.id)).where(
            and_(
                func.date(Detection.timestamp) == today,
                Detection.status == "unknown"
            )
        )
    )
    return {
        "total_users": users_count.scalar() or 0,
        "total_cameras": cameras_count.scalar() or 0,
        "active_cameras": cameras_active.scalar() or 0,
        "detections_today": detections_today.scalar() or 0,
        "unknown_detections_today": unknown_today.scalar() or 0,
    }


@router.get("/detection-trends")
async def detection_trends(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None,
    days: int = Query(7, le=30),
):
    """Detection counts per day for chart."""
    start = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(
            func.date(Detection.timestamp).label("date"),
            func.count(Detection.id).label("count"),
        )
        .where(Detection.timestamp >= start)
        .group_by(func.date(Detection.timestamp))
        .order_by(func.date(Detection.timestamp))
    )
    return [{"date": str(r.date), "count": r.count} for r in result]


@router.get("/object-stats")
async def object_stats(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None,
    days: int = Query(7, le=30),
):
    """Object detection counts by type."""
    start = datetime.utcnow() - timedelta(days=days)
    result = await db.execute(
        select(ObjectDetection.object_name, func.count(ObjectDetection.id))
        .where(ObjectDetection.timestamp >= start)
        .group_by(ObjectDetection.object_name)
    )
    return [{"object": r[0], "count": r[1]} for r in result]
