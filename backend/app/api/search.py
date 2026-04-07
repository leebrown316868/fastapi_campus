"""
Unified full-text search across notifications, activities, and lost items.
Uses MySQL FULLTEXT indexes for efficient inverted-index search with relevance ranking.
"""
from fastapi import APIRouter, Query, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.database import get_db

router = APIRouter(tags=["search"])


# --- Response Schemas ---

class SearchResultItem(BaseModel):
    id: int
    type: str  # "notification", "activity", "lost_item"
    title: str
    description: str
    score: float
    created_at: Optional[datetime] = None
    extra: dict = {}


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResultItem]
    total: int
    counts: dict


# --- Search Endpoint ---

@router.get("/api/search", response_model=SearchResponse)
async def unified_search(
    q: str = Query(..., min_length=1, description="搜索关键词"),
    type: str = Query("all", pattern="^(all|notifications|activities|lost-items)$"),
    limit: int = Query(20, le=50),
    db: AsyncSession = Depends(get_db),
):
    """
    跨模块统一全文搜索。

    使用 MySQL FULLTEXT 倒排索引，对通知、活动、失物招领三类信息进行
    统一检索，并按相关性评分排序返回结果。
    """
    results: list[SearchResultItem] = []
    counts = {"notifications": 0, "activities": 0, "lost_items": 0}
    keyword = q

    # MySQL ngram parser default token size is 2 (ngram_token_size).
    # For single-character keywords, fall back to LIKE.
    use_fulltext = len(keyword) >= 2

    if type in ("all", "notifications"):
        if use_fulltext:
            sql = text("""
                SELECT id, title, content, course, is_important, created_at,
                       MATCH(title, content, course) AGAINST(:kw IN NATURAL LANGUAGE MODE) AS score
                FROM notifications
                WHERE MATCH(title, content, course) AGAINST(:kw IN NATURAL LANGUAGE MODE)
                ORDER BY score DESC
                LIMIT :lim
            """)
        else:
            sql = text("""
                SELECT id, title, content, course, is_important, created_at, 1.0 AS score
                FROM notifications
                WHERE title LIKE CONCAT('%', :kw, '%')
                   OR content LIKE CONCAT('%', :kw, '%')
                   OR course LIKE CONCAT('%', :kw, '%')
                LIMIT :lim
            """)
        rows = (await db.execute(sql, {"kw": keyword, "lim": limit})).fetchall()
        counts["notifications"] = len(rows)
        for r in rows:
            results.append(SearchResultItem(
                id=r.id, type="notification", title=r.title,
                description=r.content[:200] if r.content else "",
                score=float(r.score),
                created_at=r.created_at,
                extra={"course": r.course, "is_important": r.is_important},
            ))

    if type in ("all", "activities"):
        if use_fulltext:
            sql = text("""
                SELECT id, title, description, category, location, organizer, date,
                       image, status,
                       MATCH(title, description, organizer, location) AGAINST(:kw IN NATURAL LANGUAGE MODE) AS score
                FROM activities
                WHERE MATCH(title, description, organizer, location) AGAINST(:kw IN NATURAL LANGUAGE MODE)
                ORDER BY score DESC
                LIMIT :lim
            """)
        else:
            sql = text("""
                SELECT id, title, description, category, location, organizer, date,
                       image, status, 1.0 AS score
                FROM activities
                WHERE title LIKE CONCAT('%', :kw, '%')
                   OR description LIKE CONCAT('%', :kw, '%')
                   OR organizer LIKE CONCAT('%', :kw, '%')
                   OR location LIKE CONCAT('%', :kw, '%')
                LIMIT :lim
            """)
        rows = (await db.execute(sql, {"kw": keyword, "lim": limit})).fetchall()
        counts["activities"] = len(rows)
        for r in rows:
            results.append(SearchResultItem(
                id=r.id, type="activity", title=r.title,
                description=r.description[:200] if r.description else "",
                score=float(r.score),
                extra={
                    "category": r.category, "location": r.location,
                    "organizer": r.organizer, "date": r.date,
                    "image": r.image, "status": r.status,
                },
            ))

    if type in ("all", "lost-items"):
        if use_fulltext:
            sql = text("""
                SELECT id, title, description, category, location, type AS item_type,
                       status, images,
                       MATCH(title, description, location) AGAINST(:kw IN NATURAL LANGUAGE MODE) AS score
                FROM lost_items
                WHERE MATCH(title, description, location) AGAINST(:kw IN NATURAL LANGUAGE MODE)
                ORDER BY score DESC
                LIMIT :lim
            """)
        else:
            sql = text("""
                SELECT id, title, description, category, location, type AS item_type,
                       status, images, 1.0 AS score
                FROM lost_items
                WHERE title LIKE CONCAT('%', :kw, '%')
                   OR description LIKE CONCAT('%', :kw, '%')
                   OR location LIKE CONCAT('%', :kw, '%')
                LIMIT :lim
            """)
        rows = (await db.execute(sql, {"kw": keyword, "lim": limit})).fetchall()
        counts["lost_items"] = len(rows)
        for r in rows:
            results.append(SearchResultItem(
                id=r.id, type="lost_item", title=r.title,
                description=r.description[:200] if r.description else "",
                score=float(r.score),
                extra={
                    "category": r.category, "location": r.location,
                    "item_type": r.item_type, "status": r.status,
                    "images": r.images,
                },
            ))

    # Global sort by relevance score
    results.sort(key=lambda x: x.score, reverse=True)

    return SearchResponse(
        query=q,
        results=results[:limit],
        total=len(results),
        counts=counts,
    )
