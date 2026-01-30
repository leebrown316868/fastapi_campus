from datetime import datetime
from sqlalchemy import String, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class ActivityRegistration(Base):
    """Activity registration model for users signing up for activities.

    Note: Each user can have multiple registration records for the same activity
    with different statuses (e.g., confirmed -> cancelled -> confirmed again).
    Application layer ensures only one 'confirmed' or 'attended' record exists.
    """

    __tablename__ = "activity_registrations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    activity_id: Mapped[int] = mapped_column(ForeignKey("activities.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    # Registration details
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # 报名人姓名
    student_id: Mapped[str] = mapped_column(String(50), nullable=False)  # 学号
    phone: Mapped[str] = mapped_column(String(20), nullable=True)  # 联系电话
    remark: Mapped[str] = mapped_column(String(500), nullable=True)  # 备注

    # Status
    status: Mapped[str] = mapped_column(String(20), default="confirmed")  # confirmed, cancelled, attended

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, index=True)
    cancelled_at: Mapped[datetime] = mapped_column(nullable=True)

    def __repr__(self) -> str:
        return f"<ActivityRegistration(id={self.id}, activity_id={self.activity_id}, user_id={self.user_id})>"
