from datetime import datetime
from sqlalchemy import String, Boolean, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Notification(Base):
    """Course notification model."""

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    course: Mapped[str] = mapped_column(String(100), nullable=False)
    author: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar: Mapped[str] = mapped_column(String(500), nullable=True)
    location: Mapped[str] = mapped_column(String(200), nullable=True)
    is_important: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, title={self.title})>"
