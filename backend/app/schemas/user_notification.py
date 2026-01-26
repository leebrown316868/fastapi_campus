from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserNotificationBase(BaseModel):
    """Base user notification schema."""
    type: str
    title: str
    content: str
    link_url: Optional[str] = None


class UserNotificationCreate(UserNotificationBase):
    """User notification creation schema."""
    user_id: int
    related_id: Optional[int] = None


class UserNotificationUpdate(BaseModel):
    """User notification update schema."""
    is_read: bool


class UserNotificationResponse(UserNotificationBase):
    """User notification response schema."""
    id: int
    user_id: int
    is_read: bool
    created_at: datetime
    related_id: Optional[int] = None

    class Config:
        from_attributes = True


class UnreadCountResponse(BaseModel):
    """Unread count response schema."""
    unread_count: int
