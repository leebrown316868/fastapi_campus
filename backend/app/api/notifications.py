from typing import List, Optional, Annotated
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete as sql_delete

from app.db.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.models.user_notification import UserNotification
from app.schemas.notification import NotificationCreate, NotificationResponse
from app.api.deps import get_current_user, get_current_admin

CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentAdmin = Annotated[User, Depends(get_current_admin)]
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    created_by: Optional[int] = Query(None, description="Filter by user ID who created the notification"),
    skip: int = 0,
    limit: int = 100,
    db: DatabaseSession = None,
):
    """Get all notifications (public access)."""
    query = select(Notification).order_by(Notification.created_at.desc())

    if created_by is not None:
        query = query.where(Notification.created_by == created_by)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    notifications = result.scalars().all()

    # Format time for display
    response = []
    for n in notifications:
        notification_dict = {
            "id": n.id,
            "title": n.title,
            "content": n.content,
            "course": n.course,
            "author": n.author,
            "avatar": n.avatar,
            "location": n.location,
            "is_important": n.is_important,
            "time": format_time(n.created_at),
            "created_at": n.created_at,
        }
        response.append(NotificationResponse(**notification_dict))

    return response


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: int,
    db: DatabaseSession = None,
):
    """Get a specific notification by ID."""
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    return NotificationResponse(
        id=notification.id,
        title=notification.title,
        content=notification.content,
        course=notification.course,
        author=notification.author,
        avatar=notification.avatar,
        location=notification.location,
        is_important=notification.is_important,
        time=format_time(notification.created_at),
        created_at=notification.created_at,
    )


@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    notification_data: NotificationCreate,
    current_user: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Create a new notification (admin only)."""
    new_notification = Notification(
        **notification_data.model_dump(),
        created_by=current_user.id
    )

    db.add(new_notification)
    await db.commit()
    await db.refresh(new_notification)

    # Create user notifications for all active users
    result = await db.execute(
        select(User).where(User.is_active == True)
    )
    users = result.scalars().all()

    for user in users:
        user_notification = UserNotification(
            user_id=user.id,
            type="course",
            title=f"新课程通知：{new_notification.title}",
            content=f"{new_notification.course or '课程'}发布了新通知：{new_notification.title}",
            link_url="/notifications",
            is_read=False,
            created_at=datetime.utcnow(),
            related_id=new_notification.id,
        )
        db.add(user_notification)

    await db.commit()

    return NotificationResponse(
        id=new_notification.id,
        title=new_notification.title,
        content=new_notification.content,
        course=new_notification.course,
        author=new_notification.author,
        avatar=new_notification.avatar,
        location=new_notification.location,
        is_important=new_notification.is_important,
        time=format_time(new_notification.created_at),
        created_at=new_notification.created_at,
    )


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: int,
    current_user: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Delete a notification (admin only)."""
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    await db.delete(notification)
    await db.commit()


@router.patch("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: int,
    notification_data: NotificationCreate,
    current_user: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Update a notification (admin only)."""
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    # Update fields
    for field, value in notification_data.model_dump(exclude_unset=True).items():
        setattr(notification, field, value)

    await db.commit()
    await db.refresh(notification)

    return NotificationResponse(
        id=notification.id,
        title=notification.title,
        content=notification.content,
        course=notification.course,
        author=notification.author,
        avatar=notification.avatar,
        location=notification.location,
        is_important=notification.is_important,
        time=format_time(notification.created_at),
        created_at=notification.created_at,
    )


@router.post("/batch-delete", response_model=dict)
async def batch_delete_notifications(
    notification_ids: List[int] = Body(..., embed=True),
    current_admin: CurrentAdmin = None,
    db: DatabaseSession = None,
):
    """Delete multiple notifications (admin only)."""
    if not notification_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No notification IDs provided"
        )

    # Delete notifications
    await db.execute(
        sql_delete(Notification).where(Notification.id.in_(notification_ids))
    )
    await db.commit()

    return {"deleted": len(notification_ids)}


def format_time(dt) -> str:
    """Format datetime for display (simplified)."""
    # This is a simplified version - in production use proper formatting
    return "刚刚"
