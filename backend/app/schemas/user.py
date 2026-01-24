from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    name: str


class UserCreate(UserBase):
    """User creation schema."""
    student_id: str
    password: str


class UserLogin(BaseModel):
    """User login schema."""
    username: str  # Can be email or student_id
    password: str


class UserUpdate(BaseModel):
    """User profile update schema."""
    name: Optional[str] = None
    major: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    avatar: Optional[str] = None


class PasswordUpdate(BaseModel):
    """Password update schema."""
    old_password: str
    new_password: str


class UserResponse(UserBase):
    """User response schema."""
    id: int
    student_id: str
    role: str
    avatar: Optional[str] = None
    major: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Token data schema."""
    user_id: Optional[int] = None
    role: Optional[str] = None
