"""失物招领智能匹配模块。

匹配算法：基于 TF-IDF 余弦相似度 + 分类权重 + 地点相似度的多维综合匹配。

算法流程：
1. FULLTEXT 候选召回：利用 MySQL ngram 全文索引快速检索 opposite_type 候选集
2. TF-IDF 向量化：以候选集为微语料库，计算源物品与每个候选的文本相似度
3. 多维加权评分：category(40%) + cosine_similarity(40%) + location(20%)
4. 阈值过滤 + Top-K 返回
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


# ── 文本处理工具函数 ──


def _tokenize(text: str) -> list[str]:
    """文本分词。

    中文：双字词切分（与 MySQL ngram tokenizer 的 ngram_token_size=2 一致）。
    英文/数字：按完整单词作为 token。
    示例："Apple AirPods 蓝牙耳机" → ["apple", "airpods", "蓝牙", "牙耳", "耳机"]
    """
    tokens = []
    segments = re.findall(r'[\u4e00-\u9fff]+|[a-zA-Z0-9]+', text.lower())
    for segment in segments:
        if re.match(r'[\u4e00-\u9fff]+', segment):
            # 中文：bigram 切分
            if len(segment) >= 2:
                tokens.extend(segment[i:i + 2] for i in range(len(segment) - 1))
            else:
                tokens.append(segment)
        else:
            tokens.append(segment.lower())
    return tokens


def _compute_tf(token_list: list[str]) -> dict[str, float]:
    """计算词频 TF（Term Frequency）。

    TF(t, d) = count(t in d) / |d|
    """
    if not token_list:
        return {}
    counts = Counter(token_list)
    total = len(token_list)
    return {term: count / total for term, count in counts.items()}


def _compute_idf(documents: list[list[str]]) -> dict[str, float]:
    """计算逆文档频率 IDF（Inverse Document Frequency）。

    IDF(t, D) = ln((1 + |D|) / (1 + df(t))) + 1

    其中 |D| 为文档总数，df(t) 为包含词 t 的文档数。
    使用平滑版本避免 IDF 为负值，与 scikit-learn 的 smooth_idf 一致。
    """
    n = len(documents)
    if n == 0:
        return {}
    df: Counter = Counter()
    for doc in documents:
        for term in set(doc):
            df[term] += 1
    return {term: math.log((1 + n) / (1 + count)) + 1 for term, count in df.items()}


def _compute_tfidf(tf: dict[str, float], idf: dict[str, float]) -> dict[str, float]:
    """计算 TF-IDF 权重向量。

    TF-IDF(t, d, D) = TF(t, d) × IDF(t, D)
    """
    return {term: tf_val * idf.get(term, 1.0) for term, tf_val in tf.items()}


def _cosine_similarity(vec_a: dict[str, float], vec_b: dict[str, float]) -> float:
    """计算两个稀疏向量的余弦相似度。

    cos(A, B) = (A · B) / (||A|| × ||B||)
    """
    common_terms = set(vec_a.keys()) & set(vec_b.keys())
    if not common_terms:
        return 0.0
    dot = sum(vec_a[t] * vec_b[t] for t in common_terms)
    mag_a = math.sqrt(sum(v * v for v in vec_a.values()))
    mag_b = math.sqrt(sum(v * v for v in vec_b.values()))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def _text_similarity(text_a: str, text_b: str, corpus: list[str]) -> float:
    """基于微语料库的 TF-IDF 余弦相似度。

    将源文本、目标文本和其余候选文本组成微语料库 D，
    在 D 上计算 IDF，然后计算源与目标的 TF-IDF 余弦相似度。
    """
    all_tokenized = [_tokenize(text_a), _tokenize(text_b)] + [_tokenize(t) for t in corpus]
    idf = _compute_idf(all_tokenized)

    tfidf_a = _compute_tfidf(_compute_tf(all_tokenized[0]), idf)
    tfidf_b = _compute_tfidf(_compute_tf(all_tokenized[1]), idf)

    return _cosine_similarity(tfidf_a, tfidf_b)


def _location_similarity(loc1: str, loc2: str) -> float:
    """计算地点相似度（0.0 ~ 1.0）。

    规则：
    - 完全相同 → 1.0
    - 包含关系 → 0.8
    - 关键词重叠 → 0.5
    - 无交集 → 0.0
    """
    if not loc1 or not loc2:
        return 0.0
    a, b = loc1.lower(), loc2.lower()
    if a == b:
        return 1.0
    if a in b or b in a:
        return 0.8
    # 去掉常见后缀后分词匹配
    for sep in ["楼", "室", "层", "区", "栋", "号"]:
        a = a.replace(sep, " ")
        b = b.replace(sep, " ")
    words_a = set(a.split())
    words_b = set(b.split())
    if words_a & words_b:
        return 0.5
    return 0.0


# ── 匹配核心函数 ──


async def find_matching_items(
    db: AsyncSession,
    item_id: int,
    user_id: int,
) -> list[dict]:
    """查找与指定物品交叉匹配的物品列表。

    算法步骤：
    1. FULLTEXT 候选召回：在 opposite_type 中检索状态为"寻找中"且已审核的物品（最多10条）
    2. 构建微语料库：源文本 + 所有候选文本
    3. 逐个计算 TF-IDF 余弦相似度
    4. 多维加权：final_score = 0.4 × category + 0.4 × cosine_sim + 0.2 × location
    5. 过滤 score > 0.1，返回 top 5
    """
    source = await db.get(LostItem, item_id)
    if not source:
        return []

    opposite_type = "found" if source.type == "lost" else "lost"
    source_text = f"{source.title} {source.description} {source.location}"

    # Step 1: FULLTEXT 候选召回
    sql = text("""
        SELECT id, title, type, category, location, description
        FROM lost_items
        WHERE type = :otype
          AND status = '寻找中'
          AND review_status = 'approved'
          AND created_by != :uid
          AND MATCH(title, description, location) AGAINST(:kw IN NATURAL LANGUAGE MODE)
        ORDER BY MATCH(title, description, location) AGAINST(:kw IN NATURAL LANGUAGE MODE) DESC
        LIMIT 10
    """)
    rows = (await db.execute(sql, {
        "kw": source_text,
        "otype": opposite_type,
        "uid": user_id,
    })).fetchall()

    if not rows:
        return []

    # Step 2: 构建候选文本列表（用于 IDF 计算的微语料库）
    candidate_texts = [f"{r.title} {r.description} {r.location}" for r in rows]

    # Step 3: 逐个计算综合评分
    results = []
    for i, row in enumerate(rows):
        # TF-IDF 余弦相似度
        cosine_sim = _text_similarity(source_text, candidate_texts[i], candidate_texts[:i] + candidate_texts[i + 1:])

        # 分类匹配
        category_match = 1.0 if row.category == source.category else 0.0

        # 地点相似度
        loc_sim = _location_similarity(row.location, source.location)

        # 多维加权评分
        final_score = 0.4 * category_match + 0.4 * cosine_sim + 0.2 * loc_sim

        if final_score > 0.1:
            results.append({
                "id": row.id,
                "title": row.title,
                "type": row.type,
                "category": row.category,
                "location": row.location,
                "score": round(final_score, 4),
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:5]


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
    """获取指定失物/招领物品的潜在匹配列表。"""
    item = (await db.execute(
        select(LostItem).where(LostItem.id == item_id)
    )).scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="物品不存在")

    matches = await find_matching_items(db, item_id, item.created_by)
    return matches
