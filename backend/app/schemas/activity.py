from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ActivityBase(BaseModel):
    """Base activity schema."""
    title: str
    description: str
    date: str  # Legacy display date (kept for compatibility)
    location: str
    organizer: str
    notes: Optional[str] = None  # 注意事项
    image: str
    category: str  # lecture, competition, performance, sports, other
    capacity: int = 0  # 人数上限，0表示不限

    # New time fields
    registration_start: Optional[datetime] = None  # 报名开始时间
    registration_end: Optional[datetime] = None    # 报名结束时间
    activity_start: datetime                       # 活动开始时间
    activity_end: Optional[datetime] = None        # 活动结束时间

    # Status is calculated automatically
    status: str = "报名中"


class ActivityCreate(ActivityBase):
    """Activity creation schema."""
    pass


class ActivityUpdate(BaseModel):
    """Activity update schema."""
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    location: Optional[str] = None
    organizer: Optional[str] = None
    notes: Optional[str] = None
    image: Optional[str] = None
    category: Optional[str] = None
    capacity: Optional[int] = None
    registration_start: Optional[datetime] = None
    registration_end: Optional[datetime] = None
    activity_start: Optional[datetime] = None
    activity_end: Optional[datetime] = None
    status: Optional[str] = None


class ActivityResponse(ActivityBase):
    """Activity response schema."""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
