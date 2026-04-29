from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PointRecordResponse(BaseModel):
    id: int
    points: int
    reason: str
    activity_id: Optional[int] = None
    activity_title: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LeaderboardEntry(BaseModel):
    user_id: int
    name: str
    avatar: Optional[str] = None
    total_points: int
    rank: int
