# CampusHub 智能推送 + 积分 + 反馈 设计方案

**日期**: 2026-04-29
**版本**: 1.0
**状态**: 已确认

## 概述

四个功能，分两模块分批实现：

| # | 功能 | 模块 | 难度 | 答辩亮点 |
|---|------|------|------|----------|
| 1 | 通知定向推送 | 课程通知 | 低 | "千人千面"个性化订阅 |
| 2 | Feed 个性化排序 | 课程通知 | 低 | "从人找信息到信息找人" |
| 3 | 活动参与积分 | 活动公告 | 中 | "游戏化设计激励参与" |
| 4 | 活动反馈闭环 | 活动公告 | 低 | "数据驱动活动运营" |

---

## 模块一：课程通知智能推送

### 功能 1 — 定向推送

#### 数据模型变更

**User 表新增字段：**

```python
grade: Mapped[str | None] = mapped_column(String(20), nullable=True)       # "2024级"
department: Mapped[str | None] = mapped_column(String(100), nullable=True)  # "计算机学院"
```

**Notification 表新增字段：**

```python
target_grades: Mapped[list] = mapped_column(JSON, default=list)        # ["2024级", "2025级"]
target_departments: Mapped[list] = mapped_column(JSON, default=list)   # ["计算机学院"]
target_majors: Mapped[list] = mapped_column(JSON, default=list)        # ["计算机科学与技术"]
```

#### 匹配逻辑

- 三个 target 全部为空 → 广播全体（向后兼容）
- 任一有值 → OR 匹配：`grade IN target_grades OR department IN target_departments OR major IN target_majors`
- 创建 Notification 时过滤 UserNotification 创建和 WebSocket 推送的目标用户

#### Schema 变更

- `NotificationCreate` / `NotificationUpdate` 新增 `target_grades`、`target_departments`、`target_majors` 可选字段
- `NotificationResponse` 返回 target 字段
- `UserUpdate` 新增 `grade`、`department` 可选字段

#### API 变更

- POST/PATCH `/api/notifications` — 接受并存储 target 字段
- POST `/api/notifications` — UserNotification 创建和 WebSocket 推送按 target 过滤
- PATCH `/api/users/me` — 允许用户修改 grade、department
- GET `/api/users/me` — 返回 grade、department

---

### 功能 2 — Feed 个性化排序

#### 算法

GET `/api/feed/latest` 登录用户计算相关性分数：

```
score = base_recency + profile_match_boost + registration_boost + important_boost
```

- `base_recency`: 时间衰减因子，越新越高
- `profile_match_boost`: 通知类 item，用户 grade/department/major 匹配 target 字段 +3
- `registration_boost`: 活动类 item，用户已报名 +2
- `important_boost`: 通知标为重要 +1
- 匿名用户保持纯时间倒序
- 查询参数 `?personalized=false` 可关闭个性化

#### 实现点

- `app/api/feed.py` 的 `get_latest` 端点追加排序逻辑
- 需要 `current_user: Optional[CurrentUser]` 依赖（用户可选登录）

---

## 模块二：活动公告增强

### 功能 3 — 积分体系

#### 新增模型

**PointRecord 表：**

```python
class PointRecord(Base):
    __tablename__ = "point_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    points: Mapped[int] = mapped_column(nullable=False)
    reason: Mapped[str] = mapped_column(String(50), nullable=False)  # registration/attendance/feedback
    activity_id: Mapped[int | None] = mapped_column(ForeignKey("activities.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
```

**User 表新增：**

```python
total_points: Mapped[int] = mapped_column(default=0)  # 反范式缓存，创建 PointRecord 时同步更新
```

#### 积分规则

| 动作 | 积分 | 触发时机 |
|------|------|----------|
| 报名活动 | +5 | POST `/api/activities/{id}/register` |
| 签到 | +10 | 管理端标记出席（暂不实现前端，预留接口） |
| 提交反馈 | +5 | POST `/api/activities/{id}/feedback` |

#### API

- `GET /api/users/me/points?skip=0&limit=20` — 当前用户积分流水（分页）
- `GET /api/leaderboard?period=all|month|semester&limit=20` — 排行榜

#### Schema

- `PointRecordResponse`: id, points, reason, activity_id, activity_title, created_at
- `UserResponse` 新增 `total_points`
- `LeaderboardEntry`: user_id, name, avatar, total_points, rank

---

### 功能 4 — 活动反馈

#### 新增模型

**ActivityFeedback 表：**

```python
class ActivityFeedback(Base):
    __tablename__ = "activity_feedbacks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    activity_id: Mapped[int] = mapped_column(ForeignKey("activities.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    rating: Mapped[int] = mapped_column(nullable=False)  # 1-5
    comment: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("activity_id", "user_id", name="uq_activity_feedback_user"),
    )
```

#### 业务规则

- 仅活动结束后可提交反馈
- 仅已报名用户可提交
- 每个用户每活动只能提交一次
- 修改反馈：先删旧再插新（或 UPDATE + onupdate）

#### API

- `POST /api/activities/{id}/feedback` — 提交反馈（需登录、已报名、活动已结束、未评过）
- `GET /api/activities/{id}/feedback` — 公开聚合数据：
  ```json
  {
    "avg_rating": 4.3,
    "count": 42,
    "distribution": {"1": 1, "2": 3, "3": 8, "4": 15, "5": 15},
    "recent_comments": [
      {"user_name": "张三", "rating": 5, "comment": "很棒", "created_at": "..."}
    ]
  }
  ```
- `ActivityResponse` 新增 `avg_rating`、`feedback_count`

---

## 前端变更

| 页面 | 变更 |
|------|------|
| 通知发布页（AdminDashboard） | 目标人群选择器：年级/院系/专业多选下拉 |
| 首页 Feed | 无感——个性化排序自动生效 |
| 活动详情页 | 活动结束后显示评分区（星级+评语输入）+ 已有反馈列表 |
| 个人主页 | 积分展示 + 积分流水列表 |
| 新增：排行榜页面 | Top N 排行，按 all/month/semester 切换 |

---

## 实现顺序

1. **模块一**：数据迁移 → 模型 → Schema → API → 前端
2. **模块二**：数据迁移 → 模型 → Schema → API → 前端
