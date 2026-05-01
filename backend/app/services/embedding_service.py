"""
统一封装 Embedding 模型和 VectorDB 操作。
提供内容向量化、向量存储、语义搜索的便捷接口。
"""
import logging
import time
from collections import OrderedDict
from typing import Optional
from app.core.embedding import EmbeddingModel
from app.core.vector_db import VectorDB
from app.core.config import settings

logger = logging.getLogger(__name__)


class QueryCache:
    """LRU 查询缓存，避免相同搜索词重复编码。"""

    def __init__(self, max_size: int = 100, ttl: int = 300):
        self.cache: OrderedDict[str, tuple[float, list[dict]]] = OrderedDict()
        self.max_size = max_size
        self.ttl = ttl  # 缓存有效期（秒）

    def get(self, key: str) -> Optional[list[dict]]:
        if key not in self.cache:
            return None
        timestamp, result = self.cache[key]
        if time.time() - timestamp > self.ttl:
            del self.cache[key]
            return None
        self.cache.move_to_end(key)
        return result

    def set(self, key: str, result: list[dict]):
        self.cache[key] = (time.time(), result)
        self.cache.move_to_end(key)
        if len(self.cache) > self.max_size:
            self.cache.popitem(last=False)


class EmbeddingService:
    """统一 Embedding 服务。"""

    def __init__(self):
        self.embedding_model = EmbeddingModel()
        self.vector_db = VectorDB()
        self._query_cache = QueryCache(max_size=100, ttl=300)

    def index_lost_item(
        self,
        item_id: int,
        title: str,
        description: str,
        location: str,
        item_type: str,  # "lost" or "found"
        category: str,
        created_by: int,
        images: str = "[]",  # JSON string of image list
    ) -> bool:
        """为失物招领内容生成并存储向量。"""
        if not self.vector_db.is_available:
            logger.warning("Qdrant 不可用，跳过向量索引")
            return False

        text = f"{title} {description} {location}"
        vector = self.embedding_model.encode(text)

        payload = {
            "title": title,
            "description": description,
            "location": location,
            "type": item_type,
            "category": category,
            "created_by": created_by,
            "images": images,  # JSON string
        }

        self._query_cache.cache.clear()  # 新增/修改数据时清空缓存
        return self.vector_db.upsert(id=item_id, vector=vector, payload=payload)

    def delete_lost_item(self, item_id: int) -> bool:
        """删除失物招领的向量索引。"""
        if not self.vector_db.is_available:
            return False
        return self.vector_db.delete(item_id)

    def search_lost_items(
        self,
        query: str,
        limit: int = 5,
        item_type: Optional[str] = None,  # "lost" or "found"
    ) -> list[dict]:
        """语义搜索失物招领内容（带查询缓存）。"""
        if not self.vector_db.is_available:
            logger.warning("Qdrant 不可用，返回空结果")
            return []

        # 缓存 key = query + limit + item_type
        cache_key = f"{query}:{limit}:{item_type}"
        cached = self._query_cache.get(cache_key)
        if cached is not None:
            logger.debug(f"缓存命中: {query}")
            return cached

        query_vector = self.embedding_model.encode(query)
        results = self.vector_db.search(
            query_vector=query_vector,
            limit=limit,
            filter_type=item_type,
        )

        self._query_cache.set(cache_key, results)
        return results

    def reindex_all_lost_items(self, items: list[dict]) -> int:
        """批量重建索引，返回成功数量。"""
        if not self.vector_db.is_available:
            return 0

        self.vector_db.ensure_collection()
        count = 0
        for item in items:
            if self.index_lost_item(
                item_id=item["id"],
                title=item["title"],
                description=item.get("description", ""),
                location=item.get("location", ""),
                item_type=item["type"],
                category=item.get("category", ""),
                created_by=item.get("created_by", 0),
            ):
                count += 1
        return count


# 模块级单例
embedding_service = EmbeddingService()
