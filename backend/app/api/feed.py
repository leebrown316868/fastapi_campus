from typing import Annotated, List, Literal, Optional
from fastapi import APIRouter, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

router = APIRouter(prefix="/api/feed", tags=["feed"])


def _score_item(item: dict, user: User | None) -> float:
    """Calculate relevance score for a feed item. Higher = more relevant."""
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
        match_level = item.get("_match_level", 0)
        boost += match_level * 3.0

    # Important notification boost
    if item.get("tag") == "重要":
        boost += 1.0

    return recency + boost


@router.get("/latest")
async def get_latest_feed(
    limit: int = 10,
    personalized: bool = True,
    current_user: User | None = Depends(_get_optional_user),
    db: DatabaseSession = None,
):
    """
    获取最新动态聚合信息
    整合通知、活动和失物招领，按时间排序返回
    """
    # 获取最新通知
    notif_result = await db.execute(
        select(Notification)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    notifications = notif_result.scalars().all()

    # 获取最新活动
    activity_result = await db.execute(
        select(Activity)
        .order_by(Activity.created_at.desc())
        .limit(limit)
    )
    activities = activity_result.scalars().all()

    # Update activity statuses to ensure they're current
    status_updated = False
    for activity in activities:
        new_status = activity.calculate_status()
        if activity.status != new_status:
            activity.status = new_status
            status_updated = True

    if status_updated:
        await db.commit()

    # 获取最新失物招领（仅已审核通过的）
    lost_result = await db.execute(
        select(LostItem)
        .where(LostItem.review_status == "approved")
        .order_by(LostItem.created_at.desc())
        .limit(limit)
    )
    lost_items = lost_result.scalars().all()

    # 批量查询失物招领的发布者信息
    user_ids = {item.created_by for item in lost_items if item.created_by}
    users_map: dict[int, User] = {}
    if user_ids:
        user_result = await db.execute(
            select(User).where(User.id.in_(user_ids))
        )
        for u in user_result.scalars().all():
            users_map[u.id] = u

    # 聚合并转换为统一格式
    feed_items = []

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
            "author_name": notif.author or "系统",
            "author_avatar": notif.avatar or None,
        })

    # 添加活动
    for activity in activities:
        # Status colors
        status_colors = {
            "进行中": "bg-blue-100 text-blue-700",
            "已结束": "bg-slate-100 text-slate-700",
            "报名中": "bg-emerald-100 text-emerald-700",
            "报名截止": "bg-amber-100 text-amber-700",
            "即将开始报名": "bg-purple-100 text-purple-700",
        }

        feed_items.append({
            "id": f"activity-{activity.id}",
            "type": "activity",
            "tag": activity.status,  # Show current status instead of category
            "tag_color": status_colors.get(activity.status, "bg-emerald-100 text-emerald-700"),
            "title": activity.title,
            "description": activity.description[:100] + "..." if len(activity.description) > 100 else activity.description,
            "created_at": activity.created_at.isoformat(),
            "link_url": f"/activities/{activity.id}",
            "author_name": activity.organizer or "系统",
            "author_avatar": None,
        })

    # 添加失物招领
    for item in lost_items:
        tag_map = {
            "lost": "遗失",
            "found": "招领"
        }
        publisher = users_map.get(item.created_by) if item.created_by else None
        feed_items.append({
            "id": f"lost-{item.id}",
            "type": "lost_item",
            "tag": tag_map.get(item.type, "其他"),
            "tag_color": "bg-amber-100 text-amber-700",
            "title": item.title,
            "description": item.description[:100] + "..." if len(item.description) > 100 else item.description,
            "created_at": item.created_at.isoformat(),
            "link_url": f"/lost-and-found/{item.id}",
            "author_name": publisher.name if publisher else "匿名用户",
            "author_avatar": publisher.avatar if publisher and publisher.show_avatar_in_lost_item else None,
        })

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

    # 格式化时间显示（简化版）
    for item in feed_items:
        from datetime import datetime, timezone

        # Handle both naive and aware datetimes
        created = datetime.fromisoformat(item["created_at"])
        if created.tzinfo is None:
            # Naive datetime - assume UTC
            now = datetime.utcnow()
        else:
            # Aware datetime - use current time with same timezone
            now = datetime.now(timezone.utc)

        diff = now - created

        # Calculate total seconds for proper comparison
        total_seconds = diff.total_seconds()
        days = int(total_seconds // 86400)
        hours = int(total_seconds // 3600)
        minutes = int(total_seconds // 60)

        if days > 0:
            item["time"] = f"{days}天前"
        elif hours > 0:
            item["time"] = f"{hours}小时前"
        elif minutes > 0:
            item["time"] = f"{minutes}分钟前"
        else:
            item["time"] = "刚刚"

    return {
        "items": feed_items,
        "total": len(feed_items)
    }
