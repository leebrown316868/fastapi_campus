from datetime import datetime
from sqlalchemy import String, Boolean, Text, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class UserNotification(Base):
    """User notification model for personal notifications."""

    __tablename__ = "user_notifications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    # Notification type and content
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # system, activity, lost_found, course
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Optional: link to navigate when clicked
    link_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Metadata
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, index=True)

    # Optional reference to related entity
    related_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # e.g., activity_id, lost_item_id

    def __repr__(self) -> str:
        return f"<UserNotification(id={self.id}, user_id={self.user_id}, type={self.type})>"
