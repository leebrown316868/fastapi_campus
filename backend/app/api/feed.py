from typing import Annotated, List, Literal
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.notification import Notification
from app.models.activity import Activity
from app.models.lost_item import LostItem
from app.models.user import User

# Type aliases for this file
CurrentUser = Annotated[User, Depends(lambda: None)]  # Optional auth
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]

router = APIRouter(prefix="/api/feed", tags=["feed"])


@router.get("/latest")
async def get_latest_feed(
    limit: int = 10,
    db: DatabaseSession = None
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

    # 获取最新失物招领
    lost_result = await db.execute(
        select(LostItem)
        .order_by(LostItem.created_at.desc())
        .limit(limit)
    )
    lost_items = lost_result.scalars().all()

    # 聚合并转换为统一格式
    feed_items = []

    # 添加通知
    for notif in notifications:
        feed_items.append({
            "id": f"notification-{notif.id}",
            "type": "notification",
            "tag": "重要" if notif.is_important else "通知",
            "tag_color": "bg-blue-100 text-blue-700" if notif.is_important else "bg-slate-100 text-slate-700",
            "title": notif.title,
            "description": notif.content[:100] + "..." if len(notif.content) > 100 else notif.content,
            "created_at": notif.created_at.isoformat(),
            "link_url": f"/notifications",
        })

    # 添加活动
    for activity in activities:
        feed_items.append({
            "id": f"activity-{activity.id}",
            "type": "activity",
            "tag": activity.category,
            "tag_color": "bg-emerald-100 text-emerald-700",
            "title": activity.title,
            "description": activity.description[:100] + "..." if len(activity.description) > 100 else activity.description,
            "created_at": activity.created_at.isoformat(),
            "link_url": f"/activities/{activity.id}",
        })

    # 添加失物招领
    for item in lost_items:
        tag_map = {
            "lost": "遗失",
            "found": "招领"
        }
        feed_items.append({
            "id": f"lost-{item.id}",
            "type": "lost_item",
            "tag": tag_map.get(item.item_type, "其他"),
            "tag_color": "bg-amber-100 text-amber-700",
            "title": item.title,
            "description": item.description[:100] + "..." if len(item.description) > 100 else item.description,
            "created_at": item.created_at.isoformat(),
            "link_url": f"/lost-and-found/{item.id}",
        })

    # 按时间排序（最新的在前）
    feed_items.sort(key=lambda x: x["created_at"], reverse=True)

    # 限制返回数量
    feed_items = feed_items[:limit]

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
