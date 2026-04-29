from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class FeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=500)


class FeedbackResponse(BaseModel):
    id: int
    activity_id: int
    user_id: int
    user_name: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FeedbackAggregation(BaseModel):
    avg_rating: float
    count: int
    distribution: dict[str, int]
    recent_comments: list[FeedbackResponse]
