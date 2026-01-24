from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class LostItemBase(BaseModel):
    """Base lost item schema."""
    title: str
    type: str  # lost, found
    category: str
    description: str
    location: str
    time: str


class LostItemCreate(LostItemBase):
    """Lost item creation schema."""
    images: List[str] = []
    tags: List[str] = []


class LostItemUpdate(BaseModel):
    """Lost item update schema."""
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    images: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None


class LostItemResponse(LostItemBase):
    """Lost item response schema."""
    id: int
    images: List[str]
    tags: List[str]
    status: str
    created_at: datetime

    # Publisher info
    publisher: Optional[dict] = None

    class Config:
        from_attributes = True


class PublisherInfo(BaseModel):
    """Publisher info for lost items."""
    name: str
    avatar: str
