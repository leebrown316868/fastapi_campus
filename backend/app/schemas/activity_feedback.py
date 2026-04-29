from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class FeedbackCreate(BaseModel):
    """Feedback creation schema."""
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class FeedbackResponse(BaseModel):
    """Feedback response schema."""
    id: int
    activity_id: int
    user_id: int
    user_name: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FeedbackAggregation(BaseModel):
    """Aggregated feedback statistics."""
    avg_rating: float
    count: int
    distribution: dict
    recent_comments: list[FeedbackResponse]
