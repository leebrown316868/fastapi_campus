from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ActivityRegistrationBase(BaseModel):
    """Base activity registration schema."""
    name: str
    student_id: str
    phone: Optional[str] = None
    remark: Optional[str] = None


class ActivityRegistrationCreate(ActivityRegistrationBase):
    """Activity registration creation schema."""
    activity_id: int


class ActivityRegistrationUpdate(BaseModel):
    """Activity registration update schema."""
    status: Optional[str] = None
    remark: Optional[str] = None


class ActivityRegistrationResponse(ActivityRegistrationBase):
    """Activity registration response schema."""
    id: int
    activity_id: int
    user_id: int
    status: str
    created_at: datetime
    cancelled_at: Optional[datetime] = None

    # Include user info for admin view
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    class Config:
        from_attributes = True


class RegistrationListResponse(BaseModel):
    """Response schema for registration list."""
    registrations: list[ActivityRegistrationResponse]
    total: int
    activity_name: Optional[str] = None
