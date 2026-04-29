from typing import Annotated, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.db.database import get_db
from app.models.user import User
from app.models.point_record import PointRecord
from app.models.activity import Activity
from app.api.deps import get_current_user

CurrentUser = Annotated[User, Depends(get_current_user)]
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]

router = APIRouter(tags=["Points"])


@router.get("/api/users/me/points")
async def get_my_points(
    skip: int = 0,
    limit: int = 20,
    current_user: CurrentUser = None,
    db: DatabaseSession = None,
):
    """Get current user's point records."""
    result = await db.execute(
        select(PointRecord)
        .where(PointRecord.user_id == current_user.id)
        .order_by(PointRecord.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    records = result.scalars().all()

    items = []
    for r in records:
        activity_title = None
        if r.activity_id:
            act_result = await db.execute(
                select(Activity.title).where(Activity.id == r.activity_id)
            )
            activity_title = act_result.scalar_one_or_none()
        items.append({
            "id": r.id,
            "points": r.points,
            "reason": r.reason,
            "activity_id": r.activity_id,
            "activity_title": activity_title,
            "created_at": r.created_at,
        })

    return {
        "items": items,
        "total_points": current_user.total_points,
        "total": len(items),
    }


@router.get("/api/leaderboard")
async def get_leaderboard(
    period: str = Query("all", pattern="^(all|month|semester)$"),
    limit: int = 20,
    db: DatabaseSession = None,
):
    """Get point leaderboard. Public access."""
    now = datetime.utcnow()

    if period == "all":
        result = await db.execute(
            select(User)
            .where(User.total_points > 0)
            .order_by(User.total_points.desc())
            .limit(limit)
        )
        users = result.scalars().all()
        leaderboard = []
        for rank, user in enumerate(users, 1):
            leaderboard.append({
                "user_id": user.id,
                "name": user.name,
                "avatar": user.avatar,
                "total_points": user.total_points,
                "rank": rank,
            })
        return {"items": leaderboard, "period": "all"}
    else:
        days = 30 if period == "month" else 180
        date_filter = now - timedelta(days=days)

        query = (
            select(
                PointRecord.user_id,
                func.sum(PointRecord.points).label("period_points"),
            )
            .where(PointRecord.created_at >= date_filter)
            .group_by(PointRecord.user_id)
            .order_by(desc("period_points"))
            .limit(limit)
        )
        result = await db.execute(query)
        rows = result.all()

        user_ids = [row.user_id for row in rows]
        users_map = {}
        if user_ids:
            users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
            users_map = {u.id: u for u in users_result.scalars().all()}

        leaderboard = []
        for rank, row in enumerate(rows, 1):
            user = users_map.get(row.user_id)
            if user:
                leaderboard.append({
                    "user_id": user.id,
                    "name": user.name,
                    "avatar": user.avatar,
                    "total_points": row.period_points,
                    "rank": rank,
                })
        return {"items": leaderboard, "period": period}
