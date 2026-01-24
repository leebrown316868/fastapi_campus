from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ActivityBase(BaseModel):
    """Base activity schema."""
    title: str
    description: str
    date: str
    location: str
    organizer: str
    image: str
    category: str  # 文艺, 讲座, 体育, 科创
    status: str = "报名中"  # 报名中, 进行中, 已结束


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
    image: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None


class ActivityResponse(ActivityBase):
    """Activity response schema."""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
