from typing import List, Optional, Annotated
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as sql_delete

from app.db.database import get_db
from app.models.user import User
from app.models.activity import Activity
from app.models.user_notification import UserNotification
from app.schemas.activity import ActivityCreate, ActivityUpdate, ActivityResponse
from app.api.deps import get_current_user, get_current_admin

CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentAdmin = Annotated[User, Depends(get_current_admin)]
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]

router = APIRouter(prefix="/api/activities", tags=["Activities"])


@router.get("", response_model=List[ActivityResponse])
async def get_activities(
    category: Optional[str] = Query(None, description="Filter by category"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    created_by: Optional[int] = Query(None, description="Filter by user ID who created the activity"),
    skip: int = 0,
    limit: int = 100,
    db: DatabaseSession = None,
):
    """Get all activities (public access)."""
    query = select(Activity).order_by(Activity.created_at.desc())

    if category:
        query = query.where(Activity.category == category)
    if status_filter:
        query = query.where(Activity.status == status_filter)
    if created_by is not None:
        query = query.where(Activity.created_by == created_by)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    activities = result.scalars().all()

    return [ActivityResponse.model_validate(a) for a in activities]


@router.get("/{activity_id}", response_model=ActivityResponse)
async def get_activity(
    activity_id: int,
    db: DatabaseSession = None,
):
    """Get a specific activity by ID."""
    result = await db.execute(
        select(Activity).where(Activity.id == activity_id)
    )
    activity = result.scalar_one_or_none()

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )

    return ActivityResponse.model_validate(activity)


@router.post("", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
async def create_activity(
    activity_data: ActivityCreate,
    current_user: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Create a new activity (admin only)."""
    # Create activity with provided data
    new_activity = Activity(
        **activity_data.model_dump(),
        created_by=current_user.id
    )

    # Auto-calculate status based on time fields
    new_activity.status = new_activity.calculate_status()

    db.add(new_activity)
    await db.commit()
    await db.refresh(new_activity)

    # Create user notifications for all active users
    result = await db.execute(
        select(User).where(User.is_active == True)
    )
    users = result.scalars().all()

    for user in users:
        user_notification = UserNotification(
            user_id=user.id,
            type="activity",
            title=f"新活动发布：{new_activity.title}",
            content=new_activity.description or f"快来报名参加{new_activity.title}！",
            link_url=f"/activities/{new_activity.id}",
            is_read=False,
            created_at=datetime.utcnow(),
            related_id=new_activity.id,
        )
        db.add(user_notification)

    await db.commit()

    return ActivityResponse.model_validate(new_activity)


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(
    activity_id: int,
    current_user: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Delete an activity (admin only)."""
    result = await db.execute(
        select(Activity).where(Activity.id == activity_id)
    )
    activity = result.scalar_one_or_none()

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )

    await db.delete(activity)
    await db.commit()


@router.patch("/{activity_id}", response_model=ActivityResponse)
async def update_activity(
    activity_id: int,
    activity_data: ActivityUpdate,
    current_user: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Update an activity (admin only)."""
    result = await db.execute(
        select(Activity).where(Activity.id == activity_id)
    )
    activity = result.scalar_one_or_none()

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found"
        )

    # Update fields
    update_data = activity_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(activity, field, value)

    # Recalculate status if time fields were updated
    time_fields_updated = any(
        field in update_data
        for field in ['registration_start', 'registration_end', 'activity_start', 'activity_end']
    )
    if time_fields_updated:
        activity.status = activity.calculate_status()

    await db.commit()
    await db.refresh(activity)

    return ActivityResponse.model_validate(activity)


@router.post("/batch-delete", response_model=dict)
async def batch_delete_activities(
    activity_ids: List[int] = Body(..., embed=True),
    current_admin: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Delete multiple activities (admin only)."""
    if not activity_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No activity IDs provided"
        )

    # Delete activities
    await db.execute(
        sql_delete(Activity).where(Activity.id.in_(activity_ids))
    )
    await db.commit()

    return {"deleted": len(activity_ids)}
