from typing import Annotated
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db
from app.models.user import User
from app.models.activity import Activity
from app.models.activity_feedback import ActivityFeedback
from app.models.activity_registration import ActivityRegistration
from app.models.point_record import PointRecord
from app.schemas.activity_feedback import FeedbackCreate, FeedbackResponse, FeedbackAggregation
from app.api.deps import get_current_user

CurrentUser = Annotated[User, Depends(get_current_user)]
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]

router = APIRouter(prefix="/api/activities", tags=["Activity-Feedback"])


@router.post("/{activity_id}/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    activity_id: int,
    feedback_data: FeedbackCreate,
    current_user: CurrentUser = None,
    db: DatabaseSession = None,
):
    """Submit feedback. Activity must be ended, user must be registered."""
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Activity not found")

    if activity.calculate_status() != "已结束":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "活动结束后才能提交反馈")

    reg_result = await db.execute(
        select(ActivityRegistration).where(
            ActivityRegistration.activity_id == activity_id,
            ActivityRegistration.user_id == current_user.id,
            ActivityRegistration.status.in_(["confirmed", "attended"]),
        )
    )
    if not reg_result.scalar_one_or_none():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "只有已报名的用户才能提交反馈")

    existing = await db.execute(
        select(ActivityFeedback).where(
            ActivityFeedback.activity_id == activity_id,
            ActivityFeedback.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "您已经提交过反馈")

    feedback = ActivityFeedback(
        activity_id=activity_id,
        user_id=current_user.id,
        rating=feedback_data.rating,
        comment=feedback_data.comment,
    )
    db.add(feedback)

    # Award points
    db.add(PointRecord(
        user_id=current_user.id, points=5, reason="feedback", activity_id=activity_id,
    ))
    user_result = await db.execute(select(User).where(User.id == current_user.id))
    user = user_result.scalar_one()
    user.total_points += 5

    await db.commit()
    await db.refresh(feedback)

    return FeedbackResponse(
        id=feedback.id, activity_id=feedback.activity_id, user_id=feedback.user_id,
        user_name=current_user.name, rating=feedback.rating, comment=feedback.comment,
        created_at=feedback.created_at,
    )


@router.get("/{activity_id}/feedback", response_model=FeedbackAggregation)
async def get_activity_feedback(activity_id: int, db: DatabaseSession = None):
    """Get aggregated feedback (public)."""
    result = await db.execute(
        select(ActivityFeedback)
        .where(ActivityFeedback.activity_id == activity_id)
        .order_by(ActivityFeedback.created_at.desc())
    )
    feedbacks = result.scalars().all()

    if not feedbacks:
        return FeedbackAggregation(
            avg_rating=0.0, count=0,
            distribution={"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
            recent_comments=[],
        )

    ratings = [f.rating for f in feedbacks]
    avg_rating = round(sum(ratings) / len(ratings), 1)
    distribution = {str(i): ratings.count(i) for i in range(1, 6)}

    user_ids = list(set(f.user_id for f in feedbacks if f.comment))
    users_map = {}
    if user_ids:
        user_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        users_map = {u.id: u for u in user_result.scalars().all()}

    recent_comments = []
    for f in feedbacks:
        if f.comment:
            u = users_map.get(f.user_id)
            recent_comments.append(FeedbackResponse(
                id=f.id, activity_id=f.activity_id, user_id=f.user_id,
                user_name=u.name if u else "Unknown", rating=f.rating,
                comment=f.comment, created_at=f.created_at,
            ))

    return FeedbackAggregation(
        avg_rating=avg_rating, count=len(feedbacks),
        distribution=distribution, recent_comments=recent_comments[:10],
    )
