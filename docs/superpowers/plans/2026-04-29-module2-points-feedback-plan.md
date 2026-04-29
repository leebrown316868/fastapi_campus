# 活动积分 + 反馈闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现活动参与积分体系（PointRecord + Leaderboard）和活动反馈数据闭环（ActivityFeedback + 评分统计）。

**Architecture:** 新增 PointRecord、ActivityFeedback 两张表；报名/反馈触发积分写入；反馈 API 提供聚合统计。User 表缓 total_points 反范式字段。

**Tech Stack:** FastAPI + SQLAlchemy 2.0 + aiosqlite + Pydantic v2 + pytest

---

## File Structure

| 操作 | 文件 | 职责 |
|------|------|------|
| 创建 | `backend/migrations/add_points_feedback.py` | 迁移：point_records 表 + activity_feedbacks 表 + users.total_points |
| 创建 | `backend/app/models/point_record.py` | PointRecord 模型 |
| 创建 | `backend/app/models/activity_feedback.py` | ActivityFeedback 模型 |
| 修改 | `backend/app/models/user.py` | User 加 total_points |
| 创建 | `backend/app/schemas/point_record.py` | PointRecordResponse, LeaderboardEntry |
| 创建 | `backend/app/schemas/activity_feedback.py` | FeedbackCreate, FeedbackResponse, FeedbackAggregation |
| 修改 | `backend/app/schemas/user.py` | UserResponse 加 total_points |
| 修改 | `backend/app/schemas/activity.py` | ActivityResponse 加 avg_rating, feedback_count |
| 创建 | `backend/app/api/points.py` | GET /me/points, GET /leaderboard |
| 创建 | `backend/app/api/activity_feedback.py` | POST + GET /api/activities/{id}/feedback |
| 修改 | `backend/app/api/activity_registrations.py` | 报名时发放积分 |
| 修改 | `backend/app/api/activities.py` | ActivityResponse 返回 avg_rating, feedback_count；删除活动时清理反馈 |
| 创建 | `backend/tests/test_points.py` | 积分体系测试 |
| 创建 | `backend/tests/test_feedback.py` | 反馈测试 |

---

### Task 1: 数据库迁移

**Files:**
- Create: `backend/migrations/add_points_feedback.py`

- [ ] **Step 1: 编写迁移脚本**

```python
"""Add points and feedback tables, total_points to users.

Run with: python migrations/add_points_feedback.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from app.db.database import engine


async def migrate():
    async with engine.begin() as conn:
        # Add total_points to users
        try:
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN total_points INTEGER DEFAULT 0"
            ))
            print("  Added users.total_points")
        except Exception:
            print("  Skipped users.total_points (already exists)")

        # Create point_records table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS point_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                points INTEGER NOT NULL,
                reason VARCHAR(50) NOT NULL,
                activity_id INTEGER REFERENCES activities(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        print("  Ensured point_records table")

        # Create index
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_point_records_user_id ON point_records(user_id)"
        ))
        print("  Ensured ix_point_records_user_id")

        # Create activity_feedbacks table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS activity_feedbacks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                activity_id INTEGER NOT NULL REFERENCES activities(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
                comment VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(activity_id, user_id)
            )
        """))
        print("  Ensured activity_feedbacks table")

        # Create indexes
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_activity_feedbacks_activity_id ON activity_feedbacks(activity_id)"
        ))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_activity_feedbacks_user_id ON activity_feedbacks(user_id)"
        ))
        print("  Ensured feedback indexes")

    print("Migration complete.")


if __name__ == "__main__":
    asyncio.run(migrate())
```

- [ ] **Step 2: 运行迁移**

Run: `cd backend && python migrations/add_points_feedback.py`
Expected: 输出 Added/Skipped/Ensured 行

- [ ] **Step 3: Commit**

---

### Task 2: PointRecord 模型

**Files:**
- Create: `backend/app/models/point_record.py`

- [ ] **Step 1: 编写模型**

```python
from datetime import datetime
from sqlalchemy import String, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class PointRecord(Base):
    __tablename__ = "point_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    points: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(50), nullable=False)
    activity_id: Mapped[int | None] = mapped_column(ForeignKey("activities.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
```

- [ ] **Step 2: 验证**

Run: `cd backend && python -c "from app.models.point_record import PointRecord; print('ok')"`

- [ ] **Step 3: Commit**

---

### Task 3: ActivityFeedback 模型

**Files:**
- Create: `backend/app/models/activity_feedback.py`

- [ ] **Step 1: 编写模型**

```python
from datetime import datetime
from sqlalchemy import String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class ActivityFeedback(Base):
    __tablename__ = "activity_feedbacks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    activity_id: Mapped[int] = mapped_column(ForeignKey("activities.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    rating: Mapped[int] = mapped_column(nullable=False)
    comment: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("activity_id", "user_id", name="uq_activity_feedback_user"),
    )
```

- [ ] **Step 2: 验证**

Run: `cd backend && python -c "from app.models.activity_feedback import ActivityFeedback; print('ok')"`

- [ ] **Step 3: Commit**

---

### Task 4: User 模型加 total_points

**Files:**
- Modify: `backend/app/models/user.py`

- [ ] **Step 1: 加字段**

在 `is_verified` 之后插入：

```python
    total_points: Mapped[int] = mapped_column(default=0)
```

- [ ] **Step 2: 验证**

Run: `cd backend && python -c "from app.models.user import User; print('total_points' in User.__table__.columns)"`

- [ ] **Step 3: Commit**

---

### Task 5: Point Schema

**Files:**
- Create: `backend/app/schemas/point_record.py`

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PointRecordResponse(BaseModel):
    id: int
    points: int
    reason: str
    activity_id: Optional[int] = None
    activity_title: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class LeaderboardEntry(BaseModel):
    user_id: int
    name: str
    avatar: Optional[str] = None
    total_points: int
    rank: int
```

---

### Task 6: Feedback Schema

**Files:**
- Create: `backend/app/schemas/activity_feedback.py`

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class FeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=500)


class FeedbackResponse(BaseModel):
    id: int
    activity_id: int
    user_id: int
    user_name: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FeedbackAggregation(BaseModel):
    avg_rating: float
    count: int
    distribution: dict[str, int]  # {"1": 1, "2": 3, ...}
    recent_comments: list[FeedbackResponse]
```

---

### Task 7: User + Activity Schema 更新

**Files:**
- Modify: `backend/app/schemas/user.py`
- Modify: `backend/app/schemas/activity.py`

**UserResponse** — 在 `created_at` 前加:
```python
    total_points: int = 0
```

**ActivityResponse** — 在 `created_at` 前加:
```python
    avg_rating: Optional[float] = None
    feedback_count: int = 0
```

---

### Task 8: Points API

**Files:**
- Create: `backend/app/api/points.py`

```python
from typing import Annotated, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.db.database import get_db
from app.models.user import User
from app.models.point_record import PointRecord
from app.models.activity import Activity
from app.api.deps import get_current_user

CurrentUser = Annotated[User, Depends(get_current_user)]
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]

router = APIRouter(tags=["Points"])


@router.get("/api/users/me/points")
async def get_my_points(
    skip: int = 0,
    limit: int = 20,
    current_user: CurrentUser = None,
    db: DatabaseSession = None,
):
    """Get current user's point records."""
    result = await db.execute(
        select(PointRecord)
        .where(PointRecord.user_id == current_user.id)
        .order_by(PointRecord.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    records = result.scalars().all()

    items = []
    for r in records:
        activity_title = None
        if r.activity_id:
            act_result = await db.execute(select(Activity.title).where(Activity.id == r.activity_id))
            activity_title = act_result.scalar_one_or_none()

        items.append({
            "id": r.id,
            "points": r.points,
            "reason": r.reason,
            "activity_id": r.activity_id,
            "activity_title": activity_title,
            "created_at": r.created_at,
        })

    return {
        "items": items,
        "total_points": current_user.total_points,
        "total": len(items),
    }


@router.get("/api/leaderboard")
async def get_leaderboard(
    period: str = Query("all", regex="^(all|month|semester)$"),
    limit: int = 20,
    db: DatabaseSession = None,
):
    """Get point leaderboard."""
    now = datetime.utcnow()

    # Build date filter
    date_filter = None
    if period == "month":
        date_filter = now - timedelta(days=30)
    elif period == "semester":
        date_filter = now - timedelta(days=180)

    if date_filter is not None:
        query = (
            select(
                PointRecord.user_id,
                func.sum(PointRecord.points).label("period_points"),
            )
            .where(PointRecord.created_at >= date_filter)
            .group_by(PointRecord.user_id)
            .order_by(desc("period_points"))
            .limit(limit)
        )
        result = await db.execute(query)
        rows = result.all()

        user_ids = [row.user_id for row in rows]
        users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        users = {u.id: u for u in users_result.scalars().all()}

        leaderboard = []
        for rank, row in enumerate(rows, 1):
            user = users.get(row.user_id)
            if user:
                leaderboard.append({
                    "user_id": user.id,
                    "name": user.name,
                    "avatar": user.avatar,
                    "total_points": row.period_points,
                    "rank": rank,
                })
        return {"items": leaderboard, "period": period}
    else:
        result = await db.execute(
            select(User)
            .where(User.total_points > 0)
            .order_by(User.total_points.desc())
            .limit(limit)
        )
        users = result.scalars().all()

        leaderboard = []
        for rank, user in enumerate(users, 1):
            leaderboard.append({
                "user_id": user.id,
                "name": user.name,
                "avatar": user.avatar,
                "total_points": user.total_points,
                "rank": rank,
            })
        return {"items": leaderboard, "period": "all"}
```

---

### Task 9: Feedback API

**Files:**
- Create: `backend/app/api/activity_feedback.py`

```python
from typing import Annotated
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.database import get_db
from app.models.user import User
from app.models.activity import Activity
from app.models.activity_feedback import ActivityFeedback
from app.models.activity_registration import ActivityRegistration
from app.models.point_record import PointRecord
from app.schemas.activity_feedback import FeedbackCreate, FeedbackResponse, FeedbackAggregation
from app.api.deps import get_current_user

CurrentUser = Annotated[User, Depends(get_current_user)]
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]

router = APIRouter(prefix="/api/activities", tags=["Activity-Feedback"])


def _award_points(user_id: int, activity_id: int, points: int, reason: str, db):
    """Award points to a user and update their total_points cache."""
    record = PointRecord(
        user_id=user_id,
        points=points,
        reason=reason,
        activity_id=activity_id,
    )
    db.add(record)
    return record


@router.post("/{activity_id}/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    activity_id: int,
    feedback_data: FeedbackCreate,
    current_user: CurrentUser = None,
    db: DatabaseSession = None,
):
    """Submit feedback for an activity. Only after activity ended, must be registered."""
    # Check activity exists and has ended
    result = await db.execute(select(Activity).where(Activity.id == activity_id))
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Activity not found")

    if activity.calculate_status() != "已结束":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "活动结束后才能提交反馈")

    # Check user is registered
    reg_result = await db.execute(
        select(ActivityRegistration).where(
            ActivityRegistration.activity_id == activity_id,
            ActivityRegistration.user_id == current_user.id,
            ActivityRegistration.status.in_(["confirmed", "attended"]),
        )
    )
    if not reg_result.scalar_one_or_none():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "只有已报名的用户才能提交反馈")

    # Check no existing feedback
    existing = await db.execute(
        select(ActivityFeedback).where(
            ActivityFeedback.activity_id == activity_id,
            ActivityFeedback.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "您已经提交过反馈")

    # Create feedback
    feedback = ActivityFeedback(
        activity_id=activity_id,
        user_id=current_user.id,
        rating=feedback_data.rating,
        comment=feedback_data.comment,
    )
    db.add(feedback)

    # Award points for feedback
    point_record = _award_points(current_user.id, activity_id, 5, "feedback", db)

    # Update user's total_points cache
    user_result = await db.execute(select(User).where(User.id == current_user.id))
    user = user_result.scalar_one()
    user.total_points += 5

    await db.commit()
    await db.refresh(feedback)

    return FeedbackResponse(
        id=feedback.id,
        activity_id=feedback.activity_id,
        user_id=feedback.user_id,
        user_name=current_user.name,
        rating=feedback.rating,
        comment=feedback.comment,
        created_at=feedback.created_at,
    )


@router.get("/{activity_id}/feedback", response_model=FeedbackAggregation)
async def get_activity_feedback(
    activity_id: int,
    db: DatabaseSession = None,
):
    """Get aggregated feedback stats for an activity (public)."""
    # Get all feedback for this activity
    result = await db.execute(
        select(ActivityFeedback)
        .where(ActivityFeedback.activity_id == activity_id)
        .order_by(ActivityFeedback.created_at.desc())
    )
    feedbacks = result.scalars().all()

    if not feedbacks:
        return FeedbackAggregation(
            avg_rating=0.0,
            count=0,
            distribution={"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
            recent_comments=[],
        )

    # Calculate stats
    ratings = [f.rating for f in feedbacks]
    avg_rating = round(sum(ratings) / len(ratings), 1)
    distribution = {str(i): ratings.count(i) for i in range(1, 6)}

    # Recent comments (with user names, limited to 10)
    user_ids = list(set(f.user_id for f in feedbacks if f.comment))
    users = {}
    if user_ids:
        user_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        users = {u.id: u for u in user_result.scalars().all()}

    recent_comments = []
    for f in feedbacks:
        if f.comment:
            u = users.get(f.user_id)
            recent_comments.append(FeedbackResponse(
                id=f.id,
                activity_id=f.activity_id,
                user_id=f.user_id,
                user_name=u.name if u else "Unknown",
                rating=f.rating,
                comment=f.comment,
                created_at=f.created_at,
            ))

    return FeedbackAggregation(
        avg_rating=avg_rating,
        count=len(feedbacks),
        distribution=distribution,
        recent_comments=recent_comments[:10],
    )
```

---

### Task 10: 报名触发积分 + ActivityResponse 加反馈字段 + 删除活动清理

**Files:**
- Modify: `backend/app/api/activity_registrations.py`
- Modify: `backend/app/api/activities.py`

**activity_registrations.py** — 报名成功后发积分。在 `register_for_activity` 的 `db.add(registration)` 和 `await db.commit()` 之间插入:

```python
    # Award registration points
    point_record = PointRecord(
        user_id=current_user.id,
        points=5,
        reason="registration",
        activity_id=activity_id,
    )
    db.add(point_record)

    # Update user's total_points
    current_user.total_points += 5
```

导入区加: `from app.models.point_record import PointRecord`

**activities.py** — 两处修改:

1. `get_activities` 和 `get_activity` 的 ActivityResponse 构造前，查询活动的反馈统计:

在 listing handler 中，收集活动 ID 后批量查询:
```python
    # Calculate feedback stats for each activity
    from app.models.activity_feedback import ActivityFeedback
    activity_ids = [a.id for a in activities]
    feedback_stats = {}
    if activity_ids:
        fb_result = await db.execute(
            select(
                ActivityFeedback.activity_id,
                func.avg(ActivityFeedback.rating).label("avg_r"),
                func.count(ActivityFeedback.id).label("cnt"),
            )
            .where(ActivityFeedback.activity_id.in_(activity_ids))
            .group_by(ActivityFeedback.activity_id)
        )
        for row in fb_result:
            feedback_stats[row.activity_id] = {
                "avg_rating": round(float(row.avg_r), 1) if row.avg_r else None,
                "feedback_count": row.cnt,
            }

    return [
        ActivityResponse(
            **a.__dict__,
            avg_rating=feedback_stats.get(a.id, {}).get("avg_rating"),
            feedback_count=feedback_stats.get(a.id, {}).get("feedback_count", 0),
        )
        for a in activities
    ]
```

`get_activity` (single) 类似但更简单。

2. `delete_activity` 和 `batch_delete_activities` — 删除活动时同时清理反馈:

在删除 registration 之后、删除 activity 之前加:
```python
    await db.execute(
        sql_delete(ActivityFeedback).where(ActivityFeedback.activity_id == activity_id)
    )
```
导入加: `from app.models.activity_feedback import ActivityFeedback`

---

### Task 11: 主应用注册路由

**Files:**
- Modify: `backend/main.py`

注册新路由（在 activity_registrations 之前，因为 feedback 是 /api/activities/{id}/feedback，是更具体的路由）:

```python
from app.api import points
from app.api import activity_feedback

# Before activity_registrations:
app.include_router(activity_feedback.router)
app.include_router(activity_registrations.router)
app.include_router(points.router)
```

---

### Task 12: 测试 — 积分

**Files:**
- Create: `backend/tests/test_points.py`

```python
"""Test points system."""
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestPointRecord:
    def test_point_record_creation(self):
        from app.models.point_record import PointRecord
        r = PointRecord(user_id=1, points=5, reason="registration", activity_id=1)
        assert r.points == 5
        assert r.reason == "registration"

    def test_total_points_on_user(self):
        from app.models.user import User
        assert "total_points" in User.__table__.columns
```

---

### Task 13: 测试 — 反馈

**Files:**
- Create: `backend/tests/test_feedback.py`

```python
"""Test activity feedback system."""
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestActivityFeedback:
    def test_feedback_model(self):
        from app.models.activity_feedback import ActivityFeedback
        f = ActivityFeedback(activity_id=1, user_id=1, rating=4, comment="不错")
        assert f.rating == 4
        assert f.comment == "不错"

    def test_feedback_unique_constraint(self):
        from app.models.activity_feedback import ActivityFeedback
        from sqlalchemy import UniqueConstraint
        args = ActivityFeedback.__table_args__
        assert any(isinstance(a, UniqueConstraint) for a in (args if isinstance(args, tuple) else [args]))


class TestFeedbackSchema:
    def test_feedback_create_validation(self):
        from app.schemas.activity_feedback import FeedbackCreate
        # Valid
        fc = FeedbackCreate(rating=3, comment="还行")
        assert fc.rating == 3

        # Invalid rating (should raise)
        import pytest as pt
        from pydantic import ValidationError
        with pt.raises(ValidationError):
            FeedbackCreate(rating=6)
        with pt.raises(ValidationError):
            FeedbackCreate(rating=0)
```
