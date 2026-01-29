from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class NotificationBase(BaseModel):
    """Base notification schema."""
    title: str
    content: str
    course: str
    location: Optional[str] = None
    is_important: bool = False
    attachment: Optional[str] = None
    attachment_name: Optional[str] = None


class NotificationCreate(NotificationBase):
    """Notification creation schema."""
    author: str
    avatar: Optional[str] = None


class NotificationUpdate(NotificationBase):
    """Notification update schema."""
    pass


class NotificationResponse(NotificationBase):
    """Notification response schema."""
    id: int
    author: str
    avatar: Optional[str] = None
    time: str  # Formatted time string for display
    created_at: datetime
    attachment: Optional[str] = None
    attachment_name: Optional[str] = None

    class Config:
        from_attributes = True
