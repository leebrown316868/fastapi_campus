"""
Unified full-text search across notifications, activities, and lost items.
Uses MySQL FULLTEXT indexes for efficient inverted-index search with relevance ranking.
Lost items use hybrid search: MySQL keyword match + Qdrant semantic similarity.
"""
from fastapi import APIRouter, Query, Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json

from app.db.database import get_db
from app.services.embedding_service import embedding_service

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
        # 混合搜索：MySQL LIKE 关键词匹配 + Qdrant 语义相似度
        # 关键词命中标题/描述时获得加成，解决纯语义搜索中标题精确匹配被埋没的问题

        # Step 1: MySQL 关键词搜索（仅已审核通过的）
        kw_sql = text("""
            SELECT id, title, description, category, location, type AS item_type,
                   status, images, created_at
            FROM lost_items
            WHERE review_status = 'approved'
              AND (title LIKE CONCAT('%', :kw, '%')
                OR description LIKE CONCAT('%', :kw, '%')
                OR location LIKE CONCAT('%', :kw, '%'))
            LIMIT :lim
        """)
        kw_rows = (await db.execute(kw_sql, {"kw": keyword, "lim": limit * 2})).fetchall()

        keyword_hits: dict[int, dict] = {}
        for r in kw_rows:
            kw_lower = keyword.lower()
            title_match = kw_lower in (r.title or "").lower()
            desc_match = kw_lower in (r.description or "").lower()
            loc_match = kw_lower in (r.location or "").lower()
            keyword_hits[r.id] = {
                "title_match": title_match,
                "desc_match": desc_match or loc_match,
                "row": r,
            }

        # Step 2: Qdrant 语义搜索（不限阈值，召回后由 Python 混合打分排序）
        qdrant_hits: dict[int, dict] = {}
        if embedding_service.vector_db.is_available:
            matches = embedding_service.search_lost_items(
                query=keyword,
                limit=limit,
                item_type=None,
                score_threshold=None,  # 搜索管道不过滤，交给下游混合打分
            )
            for m in matches:
                qdrant_hits[m["id"]] = m

        # Step 2.5: 标题语义加成 (解决跨语言查询如 "ring" → "戒指" 的排名问题)
        if qdrant_hits:
            titles = [m["payload"]["title"] for m in qdrant_hits.values()]
            query_vec = embedding_service.embedding_model.encode(keyword)
            title_vecs = embedding_service.embedding_model.encode_batch(titles)
            for (item_id, m), title_vec in zip(qdrant_hits.items(), title_vecs):
                m["title_sim"] = embedding_service.embedding_model.cosine_similarity(
                    query_vec, title_vec
                )

        # Step 2.6: 过滤 Qdrant 中已删除/被拒绝（MySQL 不存在或未审核通过的）物品
        qdrant_only_ids = set(qdrant_hits.keys()) - set(keyword_hits.keys())
        if qdrant_only_ids:
            from app.models.lost_item import LostItem
            exist_rows = (await db.execute(
                select(LostItem.id).where(
                    LostItem.id.in_(qdrant_only_ids),
                    LostItem.review_status == "approved",
                )
            )).fetchall()
            exist_ids = {r.id for r in exist_rows}
            for sid in qdrant_only_ids - exist_ids:
                qdrant_hits.pop(sid, None)

        # Step 3: 合并打分
        #   score = 0.5 * 全文语义分 + 0.5 * 标题语义分 + 关键词加成
        # 标题和全文各占一半权重，避免跨语言查询时全文偏向干扰项
        all_ids = set(keyword_hits.keys()) | set(qdrant_hits.keys())
        items: list[SearchResultItem] = []
        for item_id in all_ids:
            full_text_score = qdrant_hits[item_id]["score"] if item_id in qdrant_hits else 0.0
            title_score = qdrant_hits[item_id].get("title_sim", full_text_score) \
                if item_id in qdrant_hits else 0.0

            # 全文 + 标题 各 50%，无标题向量时退化为纯全文分
            semantic_score = 0.5 * full_text_score + 0.5 * title_score

            kw = keyword_hits.get(item_id, {})
            keyword_boost = 0.0
            if kw.get("title_match"):
                keyword_boost += 0.3
            elif kw.get("desc_match"):
                keyword_boost += 0.15

            final_score = semantic_score + keyword_boost

            if item_id in keyword_hits:
                r = kw["row"]
                items.append(SearchResultItem(
                    id=r.id, type="lost_item", title=r.title,
                    description=(r.description or "")[:200],
                    score=final_score,
                    created_at=r.created_at,
                    extra={
                        "category": r.category, "location": r.location,
                        "item_type": r.item_type, "status": r.status,
                        "images": json.loads(r.images) if r.images else [],
                    },
                ))
            else:
                m = qdrant_hits[item_id]
                items.append(SearchResultItem(
                    id=m["id"], type="lost_item",
                    title=m["payload"]["title"],
                    description=m["payload"].get("description", "")[:200],
                    score=final_score,
                    extra={
                        "category": m["payload"].get("category"),
                        "location": m["payload"].get("location"),
                        "item_type": m["payload"].get("type"),
                        "images": m["payload"].get("images", "[]"),
                    },
                ))

        items.sort(key=lambda x: x.score, reverse=True)
        counts["lost_items"] = len(items)
        results.extend(items[:limit])

    # Global sort by relevance score
    results.sort(key=lambda x: x.score, reverse=True)

    return SearchResponse(
        query=q,
        results=results[:limit],
        total=len(results),
        counts=counts,
    )
