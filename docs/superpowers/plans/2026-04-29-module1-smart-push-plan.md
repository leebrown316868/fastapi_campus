# 课程通知智能推送 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现通知定向推送（按年级/院系/专业过滤）和 Feed 个性化排序（按用户画像加权）。

**Architecture:** 在现有 Notification + User 模型上加字段，创建通知时按 target 过滤推送范围，Feed 接口对登录用户计算相关性分数重排序。两功能共享 User 画像数据（grade/department/major），无新表。

**Tech Stack:** FastAPI + SQLAlchemy 2.0 + aiosqlite + Pydantic v2 + pytest

---

## File Structure

| 操作 | 文件 | 职责 |
|------|------|------|
| 创建 | `backend/migrations/add_targeting_fields.py` | 迁移脚本：给 users 和 notifications 表加新列 |
| 修改 | `backend/app/models/user.py` | User 模型加 grade, department |
| 修改 | `backend/app/models/notification.py` | Notification 模型加 target_grades/departments/majors |
| 修改 | `backend/app/schemas/user.py` | UserUpdate, UserResponse 加 grade, department |
| 修改 | `backend/app/schemas/notification.py` | NotificationCreate/Update/Response 加 target 字段 |
| 修改 | `backend/app/api/users.py` | PATCH /me、POST /import、GET /export 支持 grade/department |
| 修改 | `backend/app/api/notifications.py` | 创建通知时按 target 过滤推送，更新时同步修改 |
| 修改 | `backend/app/api/feed.py` | GET /latest 加可选认证和个性化排序 |
| 创建 | `backend/tests/test_targeted_push.py` | 定向推送测试 |
| 创建 | `backend/tests/test_feed_ranking.py` | Feed 个性化排序测试 |

---

### Task 1: 数据库迁移脚本

**Files:**
- Create: `backend/migrations/add_targeting_fields.py`

- [ ] **Step 1: 编写迁移脚本**

```python
"""Add targeting fields to users and notifications tables.

Run with: python migrations/add_targeting_fields.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from app.db.database import async_engine


async def migrate():
    async with async_engine.begin() as conn:
        # User table: add grade and department
        for col, col_type in [
            ("grade", "VARCHAR(20)"),
            ("department", "VARCHAR(100)"),
        ]:
            try:
                await conn.execute(text(
                    f"ALTER TABLE users ADD COLUMN {col} {col_type}"
                ))
                print(f"  Added users.{col}")
            except Exception:
                print(f"  Skipped users.{col} (already exists)")

        # Notification table: add target fields (JSON in SQLite = TEXT)
        for col in ["target_grades", "target_departments", "target_majors"]:
            try:
                await conn.execute(text(
                    f"ALTER TABLE notifications ADD COLUMN {col} TEXT DEFAULT '[]'"
                ))
                print(f"  Added notifications.{col}")
            except Exception:
                print(f"  Skipped notifications.{col} (already exists)")

    print("Migration complete.")


if __name__ == "__main__":
    asyncio.run(migrate())
```

- [ ] **Step 2: 运行迁移**

Run: `cd backend && python migrations/add_targeting_fields.py`
Expected: 输出 5 行 "Added ..." 或 "Skipped ..."

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/add_targeting_fields.py
git commit -m "feat: 添加定向推送相关数据库字段迁移脚本"
```

---

### Task 2: User 模型新增字段

**Files:**
- Modify: `backend/app/models/user.py`

- [ ] **Step 1: 加 grade 和 department 列**

在 `show_phone_in_lost_item` 之后、`created_at` 之前插入：

```python
    grade: Mapped[str | None] = mapped_column(String(20), nullable=True)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
```

- [ ] **Step 2: 运行迁移验证模型和数据库一致**

Run: `cd backend && python -c "from app.models.user import User; print('grade' in User.__table__.columns)"`
Expected: `True`

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/user.py
git commit -m "feat: User模型添加grade和department字段"
```

---

### Task 3: Notification 模型新增 target 字段

**Files:**
- Modify: `backend/app/models/notification.py`

- [ ] **Step 1: 加三个 target JSON 列**

在 `created_by` 之后、`created_at` 之前插入：

```python
    target_grades: Mapped[list] = mapped_column(JSON, default=list)
    target_departments: Mapped[list] = mapped_column(JSON, default=list)
    target_majors: Mapped[list] = mapped_column(JSON, default=list)
```

- [ ] **Step 2: 验证**

Run: `cd backend && python -c "from app.models.notification import Notification; print(all(c in Notification.__table__.columns for c in ['target_grades','target_departments','target_majors']))"`
Expected: `True`

- [ ] **Step 3: Commit**

```bash
git add backend/app/models/notification.py
git commit -m "feat: Notification模型添加target推送字段"
```

---

### Task 4: User Schema 更新

**Files:**
- Modify: `backend/app/schemas/user.py`

- [ ] **Step 1: UserUpdate 加 grade, department**

在 `UserUpdate` 的 `phone` 之后加：

```python
    grade: Optional[str] = None
    department: Optional[str] = None
```

- [ ] **Step 2: UserResponse 加 grade, department**

在 `UserResponse` 的 `phone` 之后加：

```python
    grade: Optional[str] = None
    department: Optional[str] = None
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/user.py
git commit -m "feat: UserSchema添加grade和department字段"
```

---

### Task 5: Notification Schema 更新

**Files:**
- Modify: `backend/app/schemas/notification.py`

- [ ] **Step 1: NotificationBase 加 target 可选字段**

```python
class NotificationBase(BaseModel):
    """Base notification schema."""
    title: str
    content: str
    course: str
    location: Optional[str] = None
    is_important: bool = False
    attachment: Optional[str] = None
    attachment_name: Optional[str] = None
    target_grades: Optional[list[str]] = None
    target_departments: Optional[list[str]] = None
    target_majors: Optional[list[str]] = None
```

- [ ] **Step 2: NotificationResponse 加 target 字段**

```python
class NotificationResponse(NotificationBase):
    """Notification response schema."""
    id: int
    author: str
    avatar: Optional[str] = None
    time: str
    created_at: datetime
    attachment: Optional[str] = None
    attachment_name: Optional[str] = None
    target_grades: Optional[list[str]] = None
    target_departments: Optional[list[str]] = None
    target_majors: Optional[list[str]] = None

    class Config:
        from_attributes = True
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/notification.py
git commit -m "feat: NotificationSchema添加target推送字段"
```

---

### Task 6: User API 支持 grade/department

**Files:**
- Modify: `backend/app/api/users.py`

- [ ] **Step 1: PATCH /me — grade/department 已自动支持**

`UserUpdate` schema 的新字段通过 `exclude_unset=True` 自动写入，无需改代码。仅需验证：

Run: `cd backend && python -c "from app.schemas.user import UserUpdate; print('grade' in UserUpdate.model_fields)"`
Expected: `True`

- [ ] **Step 2: POST /import — 导入时支持 grade, department**

在 `users.py:187-195` 的 User 构造中，找到 `major=str(row.get('major', '')).strip()...` 行后追加：

```python
                    grade=str(row.get('grade', '')).strip() or None if pd.notna(row.get('grade')) else None,
                    department=str(row.get('department', '')).strip() or None if pd.notna(row.get('department')) else None,
```

- [ ] **Step 3: GET /export — 导出时包含 grade, department**

在 `users.py:326-333` 的 data 字典中加：

```python
            "年级": user.grade or "",
            "院系": user.department or "",
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/users.py
git commit -m "feat: 用户导入导出支持grade和department字段"
```

---

### Task 7: Notification API 定向推送过滤

**Files:**
- Modify: `backend/app/api/notifications.py`

- [ ] **Step 1: 在 notifications.py 顶部添加过滤辅助函数**

```python
def _filter_target_users(users: list[User], target_grades: list | None, target_departments: list | None, target_majors: list | None) -> list[User]:
    """Filter users by target criteria. If all targets are empty, return all users (broadcast)."""
    has_targets = bool(target_grades or target_departments or target_majors)
    if not has_targets:
        return users

    filtered = []
    for user in users:
        if target_grades and user.grade in target_grades:
            filtered.append(user)
        elif target_departments and user.department in target_departments:
            filtered.append(user)
        elif target_majors and user.major in target_majors:
            filtered.append(user)
    return filtered
```

- [ ] **Step 2: 修改 create_notification — 过滤推送用户**

替换 `users = result.scalars().all()` 之后的推送循环。找到约第 113 行：

```python
    users = result.scalars().all()

    # 按目标人群过滤
    target_users = _filter_target_users(
        users,
        getattr(new_notification, 'target_grades', None),
        getattr(new_notification, 'target_departments', None),
        getattr(new_notification, 'target_majors', None),
    )

    for user in target_users:
        user_notification = UserNotification(
```

将后续的 `for user in users:` 改为 `for user in target_users:`（两处：UserNotification 创建 和 WebSocket 推送）。

- [ ] **Step 3: 修改 update_notification — NotificationCreate 已是完整替换**

`update_notification` 使用 `NotificationCreate` 做全量替换，target 字段已在 schema 中，无需额外代码。验证：

Run: `cd backend && python -c "from app.schemas.notification import NotificationCreate; print('target_grades' in NotificationCreate.model_fields)"`
Expected: `True`

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/notifications.py
git commit -m "feat: 通知创建时按target字段过滤推送用户"
```

---

### Task 8: Feed 个性化排序

**Files:**
- Modify: `backend/app/api/feed.py`

- [ ] **Step 1: 导入必要模块**

在 feed.py 顶部替换旧导入，添加：

```python
from typing import Annotated, List, Literal, Optional
from fastapi import APIRouter, Depends, Query
from fastapi.security import HTTPBearer
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.notification import Notification
from app.models.activity import Activity
from app.models.lost_item import LostItem
from app.models.user import User
from app.core.security import decode_access_token

security_optional = HTTPBearer(auto_error=False)

DatabaseSession = Annotated[AsyncSession, Depends(get_db)]
router = APIRouter(prefix="/api/feed", tags=["feed"])


async def _get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Optional auth — returns User if token is valid, None otherwise."""
    if credentials is None:
        return None
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        return None
    return user
```

- [ ] **Step 2: 实现评分函数**

在 `get_latest_feed` 函数前添加：

```python
def _score_item(item: dict, user: User | None) -> float:
    """Calculate relevance score for a feed item. Higher = more relevant."""
    import time
    from datetime import datetime

    # Base recency score (0-10, newer = higher)
    created = datetime.fromisoformat(item["created_at"])
    age_hours = (datetime.utcnow() - created.replace(tzinfo=None)).total_seconds() / 3600
    recency = max(0, 10 - age_hours / 24)  # decays to 0 over 10 days

    if user is None:
        return recency

    boost = 0.0

    # Profile match boost for notifications
    if item["type"] == "notification":
        notif_id = int(item["id"].replace("notification-", ""))
        # Match based on item metadata — we'll store match info during feed construction
        match_level = item.get("_match_level", 0)
        boost += match_level * 3.0

    # Important notification boost
    if item.get("tag") == "重要":
        boost += 1.0

    return recency + boost
```

- [ ] **Step 3: 修改 get_latest_feed 端点签名和逻辑**

```python
@router.get("/latest")
async def get_latest_feed(
    limit: int = 10,
    personalized: bool = True,
    current_user: User | None = Depends(_get_optional_user),
    db: DatabaseSession = None,
):
    """获取最新动态聚合信息。登录用户默认启用个性化排序。"""
```

在构造 feed_items 时，对 notification 项增加匹配标记：

```python
    # 添加通知
    for notif in notifications:
        match_level = 0
        if current_user and personalized:
            tg = notif.target_grades or []
            td = notif.target_departments or []
            tm = notif.target_majors or []
            has_targets = bool(tg or td or tm)
            if has_targets:
                if current_user.grade in tg:
                    match_level += 1
                if current_user.department in td:
                    match_level += 1
                if current_user.major in tm:
                    match_level += 1
            else:
                match_level = 1  # broadcast notification = neutral match

        feed_items.append({
            "id": f"notification-{notif.id}",
            "type": "notification",
            "tag": "重要" if notif.is_important else "通知",
            "tag_color": "bg-blue-100 text-blue-700" if notif.is_important else "bg-slate-100 text-slate-700",
            "title": notif.title,
            "description": notif.content[:100] + "..." if len(notif.content) > 100 else notif.content,
            "created_at": notif.created_at.isoformat(),
            "link_url": "/notifications",
            "_match_level": match_level,
        })
```

末尾排序替换：

```python
    # 个性化排序：登录用户按相关性分数排，匿名用户按时间排
    if current_user and personalized:
        for item in feed_items:
            item["_score"] = _score_item(item, current_user)
        feed_items.sort(key=lambda x: x["_score"], reverse=True)
    else:
        feed_items.sort(key=lambda x: x["created_at"], reverse=True)

    feed_items = feed_items[:limit]

    # 清理内部字段
    for item in feed_items:
        item.pop("_match_level", None)
        item.pop("_score", None)
```

注意：删除旧的 `feed_items.sort(key=lambda x: x["created_at"], reverse=True)` 行（在 activity loop 后面那个）和后面的 `feed_items = feed_items[:limit]`。

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/feed.py
git commit -m "feat: Feed接口添加用户画像个性化排序"
```

---

### Task 9: 定向推送测试

**Files:**
- Create: `backend/tests/test_targeted_push.py`

- [ ] **Step 1: 编写测试**

```python
"""Test targeted notification push filtering."""
import pytest
from app.api.notifications import _filter_target_users


class MockUser:
    def __init__(self, id, grade=None, department=None, major=None):
        self.id = id
        self.grade = grade
        self.department = department
        self.major = major


def make_users():
    return [
        MockUser(1, grade="2024级", department="计算机学院", major="计算机科学与技术"),
        MockUser(2, grade="2024级", department="经管学院", major="工商管理"),
        MockUser(3, grade="2025级", department="计算机学院", major="软件工程"),
        MockUser(4, grade="2023级", department="外语学院", major="英语"),
    ]


class TestFilterTargetUsers:
    def test_empty_targets_returns_all(self):
        users = make_users()
        result = _filter_target_users(users, [], [], [])
        assert len(result) == 4

    def test_none_targets_returns_all(self):
        users = make_users()
        result = _filter_target_users(users, None, None, None)
        assert len(result) == 4

    def test_filter_by_grade(self):
        users = make_users()
        result = _filter_target_users(users, ["2024级"], [], [])
        assert len(result) == 2
        assert {u.id for u in result} == {1, 2}

    def test_filter_by_department(self):
        users = make_users()
        result = _filter_target_users(users, [], ["计算机学院"], [])
        assert len(result) == 2
        assert {u.id for u in result} == {1, 3}

    def test_filter_by_major(self):
        users = make_users()
        result = _filter_target_users(users, [], [], ["英语"])
        assert len(result) == 1
        assert result[0].id == 4

    def test_or_logic_across_fields(self):
        users = make_users()
        result = _filter_target_users(users, ["2025级"], ["外语学院"], [])
        assert len(result) == 2
        assert {u.id for u in result} == {3, 4}

    def test_no_match_returns_empty(self):
        users = make_users()
        result = _filter_target_users(users, ["2020级"], [], [])
        assert len(result) == 0

    def test_multiple_values_in_field(self):
        users = make_users()
        result = _filter_target_users(users, ["2024级", "2025级"], [], [])
        assert len(result) == 3
        assert {u.id for u in result} == {1, 2, 3}
```

- [ ] **Step 2: 运行测试**

Run: `cd backend && python -m pytest tests/test_targeted_push.py -v`
Expected: 7 tests pass

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_targeted_push.py
git commit -m "test: 定向推送用户过滤逻辑单元测试"
```

---

### Task 10: Feed 排序测试

**Files:**
- Create: `backend/tests/test_feed_ranking.py`

- [ ] **Step 1: 编写测试**

```python
"""Test feed personalized ranking."""
import pytest
from datetime import datetime, timedelta
from app.api.feed import _score_item


class MockUser:
    def __init__(self, grade=None, department=None, major=None):
        self.grade = grade
        self.department = department
        self.major = major


def make_item(item_type="notification", hours_ago=1, match_level=0, is_important=False):
    created = datetime.utcnow() - timedelta(hours=hours_ago)
    return {
        "id": f"{item_type}-1",
        "type": item_type,
        "tag": "重要" if is_important else "通知",
        "created_at": created.isoformat(),
        "_match_level": match_level,
    }


class TestScoreItem:
    def test_anonymous_user_gets_recency_only(self):
        item = make_item(hours_ago=1)
        score = _score_item(item, None)
        assert score > 0

    def test_newer_items_score_higher_anonymous(self):
        old = make_item(hours_ago=100)
        new = make_item(hours_ago=1)
        assert _score_item(new, None) > _score_item(old, None)

    def test_matched_item_scores_higher(self):
        user = MockUser(grade="2024级")
        item_matched = make_item(match_level=1)
        item_unmatched = make_item(match_level=0)
        assert _score_item(item_matched, user) > _score_item(item_unmatched, user)

    def test_important_gets_boost(self):
        user = MockUser()
        important = make_item(is_important=True)
        normal = make_item(is_important=False)
        important["_match_level"] = 0
        normal["_match_level"] = 0
        assert _score_item(important, user) > _score_item(normal, user)

    def test_double_match_beats_single(self):
        user = MockUser(grade="2024级")
        single = make_item(match_level=1)
        double = make_item(match_level=2)
        assert _score_item(double, user) > _score_item(single, user)

    def test_recency_beats_old_match(self):
        user = MockUser(grade="2024级")
        recent_unmatched = make_item(hours_ago=0.1, match_level=0)
        old_matched = make_item(hours_ago=240, match_level=2)  # 10 days old
        assert _score_item(recent_unmatched, user) > _score_item(old_matched, user)
```

- [ ] **Step 2: 运行测试**

Run: `cd backend && python -m pytest tests/test_feed_ranking.py -v`
Expected: 6 tests pass

- [ ] **Step 3: 运行全部测试确保无回归**

Run: `cd backend && python -m pytest tests/ -v`
Expected: 全部通过（含新测试 13 个）

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_feed_ranking.py
git commit -m "test: Feed个性化排序算法单元测试"
```

---

## 前端变更（参考）

前端改动较小，可作为单独任务追踪：

- **通知发布页（AdminDashboard）**：在通知表单添加年级/院系/专业多选下拉，提交时包含 target 字段
- **个人设置页（Profile）**：允许用户设置自己的年级和院系
- **首页 Feed**：无需改动——个性化排序对前端透明，API 响应格式不变
