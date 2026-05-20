"""失物招领智能匹配模块。

匹配算法：基于 Qdrant 语义向量检索的交叉匹配。

算法流程：
1. Qdrant 语义搜索：使用 BGE-M3 embedding 向量相似度搜索 opposite_type 候选集
2. 过滤逻辑：排除当前用户自己发布的物品（通过 payload.created_by 判断）
3. Top-K 返回：按 score 降序返回匹配结果
"""
import math
import re
import logging
from collections import Counter
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.models.lost_item import LostItem
from app.models.user_notification import UserNotification
from app.api.deps import get_current_user
from app.api.ws import manager
from app.services.embedding_service import embedding_service

logger = logging.getLogger(__name__)

CurrentUser = Annotated[User, Depends(get_current_user)]
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]

router = APIRouter(prefix="/api/lost-items", tags=["Lost-Item-Matching"])


class MatchResultResponse(BaseModel):
    """匹配结果响应。"""
    id: int
    title: str
    type: str
    category: str
    location: str
    score: float


# ── 匹配核心函数 ──


async def find_matching_items(
    db: AsyncSession,
    item_id: int,
    user_id: int,
    score_threshold: float | None = 0.6,
) -> list[dict]:
    """查找与指定物品交叉匹配的物品列表。"""
    source = await db.get(LostItem, item_id)
    if not source:
        return []

    opposite_type = "found" if source.type == "lost" else "lost"

    if not embedding_service.vector_db.is_available:
        return []

    query = f"{source.title} {source.description} {source.location}"
    matches = embedding_service.search_lost_items(
        query=query,
        limit=5,
        item_type=opposite_type,
        score_threshold=score_threshold,
    )

    results = []
    for m in matches:
        if m["payload"].get("created_by") == user_id:
            continue
        results.append({
            "id": m["id"],
            "title": m["payload"]["title"],
            "type": m["payload"]["type"],
            "category": m["payload"]["category"],
            "location": m["payload"]["location"],
            "score": round(m["score"], 4),
        })

    return results


async def notify_matches(db: AsyncSession, item: LostItem, matches: list[dict]):
    """为匹配结果创建用户通知并通过 WebSocket 推送。"""
    if not matches:
        return

    type_label = "寻物" if item.type == "lost" else "招领"
    notification = UserNotification(
        user_id=item.created_by,
        type="lost_found",
        title=f"发现{len(matches)}个潜在匹配",
        content=f"您发布的{type_label}信息「{item.title}」有{len(matches)}个潜在匹配，点击查看详情",
        link_url=f"/lost-and-found/{item.id}",
        is_read=False,
        created_at=datetime.utcnow(),
        related_id=item.id,
    )
    db.add(notification)
    await db.commit()

    # WebSocket 推送
    await manager.send_to_user(item.created_by, {
        "type": "new_notification",
        "data": {
            "type": "lost_found",
            "title": notification.title,
            "content": notification.content,
            "link_url": notification.link_url,
        },
    })


@router.get("/{item_id}/matches", response_model=list[MatchResultResponse])
async def get_item_matches(
    item_id: int,
    current_user: CurrentUser = None,
    db: DatabaseSession = None,
):
    """获取指定失物/招领物品的潜在匹配列表（不限阈值，按相似度降序）。"""
    item = (await db.execute(
        select(LostItem).where(LostItem.id == item_id)
    )).scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="物品不存在")

    matches = await find_matching_items(db, item_id, item.created_by, score_threshold=None)
    return matches
