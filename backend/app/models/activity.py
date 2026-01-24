from datetime import datetime
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Activity(Base):
    """Activity announcement model."""

    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    date: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "2023年11月15日 19:00"
    location: Mapped[str] = mapped_column(String(200), nullable=False)
    organizer: Mapped[str] = mapped_column(String(100), nullable=False)
    image: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # 文艺, 讲座, 体育, 科创
    status: Mapped[str] = mapped_column(String(20), default="报名中")  # 报名中, 进行中, 已结束
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)

    def __repr__(self) -> str:
        return f"<Activity(id={self.id}, title={self.title})>"
