"""
User notification API endpoints for personal notifications.
"""
from typing import List, Annotated
from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db
from app.models.user import User
from app.models.user_notification import UserNotification
from app.schemas.user_notification import (
    UserNotificationResponse,
    UserNotificationUpdate,
    UnreadCountResponse,
)
from app.api.deps import get_current_user


# Type aliases for this file
CurrentUser = Annotated[User, Depends(get_current_user)]
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]

router = APIRouter(prefix="/api/notifications/me", tags=["user-notifications"])


@router.get("", response_model=List[UserNotificationResponse])
async def get_my_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 10,
):
    """Get current user's notifications."""
    result = await db.execute(
        select(UserNotification)
        .where(UserNotification.user_id == current_user.id)
        .order_by(UserNotification.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    notifications = result.scalars().all()
    return [UserNotificationResponse.model_validate(n) for n in notifications]


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: CurrentUser = None,
    db: DatabaseSession = None,
):
    """Get current user's unread notification count."""
    result = await db.execute(
        select(func.count(UserNotification.id))
        .where(UserNotification.user_id == current_user.id)
        .where(UserNotification.is_read == False)
    )
    count = result.scalar() or 0
    return UnreadCountResponse(unread_count=count)


@router.patch("/{notification_id}/read", response_model=UserNotificationResponse)
async def mark_notification_read(
    notification_id: int,
    current_user: CurrentUser = None,
    db: DatabaseSession = None,
):
    """Mark a notification as read."""
    result = await db.execute(
        select(UserNotification)
        .where(UserNotification.id == notification_id)
        .where(UserNotification.user_id == current_user.id)
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    notification.is_read = True
    await db.commit()
    await db.refresh(notification)

    return UserNotificationResponse.model_validate(notification)


@router.post("/read-all")
async def mark_all_read(
    current_user: CurrentUser = None,
    db: DatabaseSession = None,
):
    """Mark all notifications as read for current user."""
    result = await db.execute(
        select(UserNotification)
        .where(UserNotification.user_id == current_user.id)
        .where(UserNotification.is_read == False)
    )
    notifications = result.scalars().all()

    for notification in notifications:
        notification.is_read = True

    await db.commit()

    return {"message": f"Marked {len(notifications)} notifications as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: CurrentUser = None,
    db: DatabaseSession = None,
):
    """Delete a notification."""
    result = await db.execute(
        select(UserNotification)
        .where(UserNotification.id == notification_id)
        .where(UserNotification.user_id == current_user.id)
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    await db.delete(notification)
    await db.commit()

    return {"message": "Notification deleted"}
