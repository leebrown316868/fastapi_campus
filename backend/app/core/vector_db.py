"""
Qdrant 向量数据库客户端封装。
提供向量 upsert 和语义搜索能力。
"""
import logging
from typing import Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.exceptions import UnexpectedResponse
from app.core.config import settings

logger = logging.getLogger(__name__)


class VectorDB:
    """Qdrant 客户端封装。"""

    _instance = None
    _client = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _get_client(self) -> Optional[QdrantClient]:
        if self._client is None:
            try:
                self._client = QdrantClient(
                    url=settings.QDRANT_URL,
                    timeout=5,
                )
                # 验证连接
                self._client.get_collections()
            except Exception as e:
                logger.warning(f"Qdrant 不可用: {e}")
                self._client = None
        return self._client

    @property
    def is_available(self) -> bool:
        """检查 Qdrant 服务是否可用。"""
        return self._get_client() is not None

    def ensure_collection(self):
        """确保 collection 存在，不存在则创建。"""
        client = self._get_client()
        if client is None:
            return False

        try:
            client.get_collection(settings.QDRANT_COLLECTION)
        except UnexpectedResponse:
            client.create_collection(
                collection_name=settings.QDRANT_COLLECTION,
                vectors_config=models.VectorParams(
                    size=1024,  # BGE-M3 向量维度
                    distance=models.Distance.COSINE,
                ),
            )
            logger.info(f"创建 Qdrant collection: {settings.QDRANT_COLLECTION}")
        return True

    def upsert(
        self,
        id: int,
        vector: list[float],
        payload: dict,
    ):
        """写入/更新向量。"""
        client = self._get_client()
        if client is None:
            return False

        self.ensure_collection()
        client.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=[
                models.PointStruct(
                    id=id,
                    vector=vector,
                    payload=payload,
                )
            ],
        )
        return True

    def search(
        self,
        query_vector: list[float],
        limit: int = 5,
        filter_type: Optional[str] = None,  # "lost" or "found"
    ) -> list[dict]:
        """语义搜索。"""
        client = self._get_client()
        if client is None:
            return []

        try:
            filter_condition = None
            if filter_type:
                filter_condition = models.Filter(
                    must=[
                        models.FieldCondition(
                            key="type",
                            match=models.MatchValue(value=filter_type),
                        )
                    ]
                )

            results = client.search(
                collection_name=settings.QDRANT_COLLECTION,
                query_vector=query_vector,
                limit=limit,
                query_filter=filter_condition,
                score_threshold=0.3,  # 相似度阈值
            )
            return [
                {
                    "id": hit.id,
                    "score": hit.score,
                    "payload": hit.payload,
                }
                for hit in results
            ]
        except Exception as e:
            logger.error(f"Qdrant 搜索失败: {e}")
            return []

    def delete(self, id: int):
        """删除向量。"""
        client = self._get_client()
        if client is None:
            return False

        try:
            client.delete(
                collection_name=settings.QDRANT_COLLECTION,
                points_selector=models.PointIdsList(points=[id]),
            )
            return True
        except Exception as e:
            logger.error(f"Qdrant 删除失败: {e}")
            return False

    def get_collection(self):
        """获取 collection 信息，Qdrant 不可用时返回 False。"""
        client = self._get_client()
        if client is None:
            return False
        try:
            return client.get_collection(settings.QDRANT_COLLECTION)
        except Exception as e:
            logger.warning(f"获取 collection 失败: {e}")
            return False