from datetime import datetime
from sqlalchemy import String, Text, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Activity(Base):
    """Activity announcement model."""

    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Time fields for better activity management
    registration_start: Mapped[datetime] = mapped_column(DateTime, nullable=True)  # 报名开始时间
    registration_end: Mapped[datetime] = mapped_column(DateTime, nullable=True)    # 报名结束时间
    activity_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)     # 活动开始时间
    activity_end: Mapped[datetime] = mapped_column(DateTime, nullable=True)        # 活动结束时间

    # Legacy date field for display (kept for backward compatibility)
    date: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "2023年11月15日 19:00"

    location: Mapped[str] = mapped_column(String(200), nullable=False)
    organizer: Mapped[str] = mapped_column(String(100), nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=True)  # 注意事项
    image: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # 文艺, 讲座, 体育, 科创
    capacity: Mapped[int] = mapped_column(default=0)  # 人数上限，0表示不限

    # Status is automatically calculated from time fields
    status: Mapped[str] = mapped_column(String(20), default="报名中")  # 即将开始报名, 报名中, 报名截止, 进行中, 已结束

    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=True)

    def calculate_status(self) -> str:
        """Calculate activity status based on current time and time fields.

        Note: Database stores local time (without timezone), so we use
        datetime.now() for comparison, not datetime.utcnow().
        """
        now = datetime.now()

        # Check if activity has ended
        if self.activity_end and now >= self.activity_end:
            return "已结束"

        # Check if activity is in progress
        if now >= self.activity_start:
            return "进行中"

        # Check registration period
        if self.registration_start and self.registration_end:
            if now < self.registration_start:
                return "即将开始报名"
            elif now < self.registration_end:
                return "报名中"
            else:
                return "报名截止"

        # Default fallback
        return "报名中"

    def __repr__(self) -> str:
        return f"<Activity(id={self.id}, title={self.title})>"
