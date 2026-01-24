from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class LostItem(Base):
    """Lost and found item model."""

    __tablename__ = "lost_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # lost, found
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # 电子数码, 生活用品, etc.
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str] = mapped_column(String(200), nullable=False)
    images: Mapped[list] = mapped_column(JSON, default=list)  # List of image URLs
    tags: Mapped[list] = mapped_column(JSON, default=list)  # List of tag strings
    status: Mapped[str] = mapped_column(String(20), default="寻找中")  # 寻找中, 已找到
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)

    # For display time
    time: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "2023年10月24日 下午2:00"

    def __repr__(self) -> str:
        return f"<LostItem(id={self.id}, title={self.title}, type={self.type})>"
