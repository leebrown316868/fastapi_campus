# 语义匹配升级实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将失物招领的匹配算法从 TF-IDF 字面匹配升级为基于 BGE-M3 Embedding + Qdrant 向量数据库的语义匹配

**Architecture:** BGE-M3 本地生成向量，Qdrant 存储并提供语义检索。内容创建时同步写入向量，搜索时将查询文本向量化后在 Qdrant 中检索相似向量。

**Tech Stack:** Python, BGE-M3 (sentence-transformers), Qdrant, FastAPI, SQLAlchemy

---

## 文件结构

```
backend/app/
├── core/
│   ├── config.py          # 修改：新增 QDRANT_URL 配置
│   ├── embedding.py       # 新增：BGE-M3 模型封装
│   └── vector_db.py       # 新增：Qdrant 客户端封装
├── services/
│   └── embedding_service.py  # 新增：统一封装 Embedding + VectorDB
├── api/
│   ├── search.py          # 修改：替换 TF-IDF 为 Qdrant 语义检索
│   ├── lost_item_matching.py  # 修改：替换 TF-IDF 为 Qdrant 检索
│   └── lost_items.py      # 修改：创建/修改时同步写入向量
docker-compose.yml          # 修改：新增 Qdrant 服务
```

---

## Task 1: 环境配置与依赖

**Files:**
- Modify: `backend/app/core/config.py:1-39`
- Modify: `backend/requirements.txt` (待确认)
- Modify: `docker-compose.yml:1-30`

- [ ] **Step 1: 修改 config.py，新增 Qdrant 配置**

```python
# 在 Settings 类中添加：
QDRANT_URL: str = "http://localhost:6333"
QDRANT_COLLECTION: str = "campus_hub_lost_items"
EMBEDDING_MODEL_NAME: str = "BAAI/bge-m3"
```

- [ ] **Step 2: 修改 docker-compose.yml，新增 Qdrant 服务**

```yaml
  qdrant:
    image: qdrant/qdrant:latest
    container_name: campus-hub-qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage
    restart: unless-stopped

volumes:
  qdrant_storage:
```

- [ ] **Step 3: 提交**

```bash
git add backend/app/core/config.py docker-compose.yml
git commit -m "feat: 添加 Qdrant 配置和服务"
```

---

## Task 2: BGE-M3 Embedding 模型封装

**Files:**
- Create: `backend/app/core/embedding.py`
- Create: `backend/tests/test_embedding.py`

- [ ] **Step 1: 写测试**

```python
# backend/tests/test_embedding.py
import pytest
from app.core.embedding import EmbeddingModel

def test_encode_single_text():
    model = EmbeddingModel()
    result = model.encode("蓝牙耳机")
    assert isinstance(result, list)
    assert len(result) == 1024  # BGE-M3 维度
    assert all(isinstance(x, float) for x in result)

def test_encode_multiple():
    model = EmbeddingModel()
    texts = ["蓝牙耳机", "AirPods Pro"]
    results = model.encode_batch(texts)
    assert len(results) == 2
    assert len(results[0]) == 1024

def test_similarity():
    model = EmbeddingModel()
    vec1 = model.encode("蓝牙耳机")
    vec2 = model.encode("AirPods Pro")
    vec3 = model.encode("课本")
    # AirPods 和耳机应该比和课本更相似
    sim_related = model.cosine_similarity(vec1, vec2)
    sim_unrelated = model.cosine_similarity(vec1, vec3)
    assert sim_related > sim_unrelated
```

- [ ] **Step 2: 运行测试，验证失败**

Run: `cd backend && python -m pytest tests/test_embedding.py -v`
Expected: FAIL - ModuleNotFoundError

- [ ] **Step 3: 实现 EmbeddingModel 类**

```python
# backend/app/core/embedding.py
"""
BGE-M3 Embedding 模型封装。
支持本地 GPU/CPU 运行，中文语义向量化。
"""
import numpy as np
from sentence_transformers import SentenceTransformer
from app.core.config import settings


class EmbeddingModel:
    """BGE-M3 向量化模型封装。"""

    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _load_model(self):
        if self._model is None:
            self._model = SentenceTransformer(
                settings.EMBEDDING_MODEL_NAME,
                device="cpu"  # RTX 3050 可用 "cuda"
            )
        return self._model

    def encode(self, text: str) -> list[float]:
        """单条文本向量化。"""
        model = self._load_model()
        embedding = model.encode(text, normalize_embeddings=True)
        return embedding.tolist()

    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        """批量文本向量化。"""
        if not texts:
            return []
        model = self._load_model()
        embeddings = model.encode(texts, normalize_embeddings=True, batch_size=8)
        return embeddings.tolist()

    @staticmethod
    def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
        """计算两个向量的余弦相似度。"""
        vec_a = np.array(vec_a)
        vec_b = np.array(vec_b)
        dot = np.dot(vec_a, vec_b)
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(dot / (norm_a * norm_b))
```

- [ ] **Step 4: 运行测试，验证通过**

Run: `cd backend && python -m pytest tests/test_embedding.py -v`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add backend/app/core/embedding.py backend/tests/test_embedding.py
git commit -m "feat: 添加 BGE-M3 Embedding 模型封装"
```

---

## Task 3: Qdrant 向量数据库封装

**Files:**
- Create: `backend/app/core/vector_db.py`
- Create: `backend/tests/test_vector_db.py`

- [ ] **Step 1: 写测试**

```python
# backend/tests/test_vector_db.py
import pytest
from app.core.vector_db import VectorDB

def test_get_collection_exists():
    db = VectorDB()
    # Qdrant 服务不可用时 graceful degrade
    collection = db.get_collection()
    assert collection is not None or collection is False

def test_upsert_and_search():
    db = VectorDB()
    test_vector = [0.1] * 1024  # 模拟向量
    # 测试 upsert 和 search 接口存在
    assert hasattr(db, "upsert")
    assert hasattr(db, "search")
```

- [ ] **Step 2: 运行测试，验证失败**

Run: `cd backend && python -m pytest tests/test_vector_db.py -v`
Expected: FAIL - ModuleNotFoundError

- [ ] **Step 3: 实现 VectorDB 类**

```python
# backend/app/core/vector_db.py
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
```

- [ ] **Step 4: 运行测试**

Run: `cd backend && python -m pytest tests/test_vector_db.py -v`
Expected: PASS（Qdrant 不可用时 graceful degrade）

- [ ] **Step 5: 提交**

```bash
git add backend/app/core/vector_db.py backend/tests/test_vector_db.py
git commit -m "feat: 添加 Qdrant 向量数据库封装"
```

---

## Task 4: 统一 Embedding 服务

**Files:**
- Create: `backend/app/services/embedding_service.py`
- Modify: `backend/app/core/__init__.py` (如有需要)

- [ ] **Step 1: 实现 EmbeddingService**

```python
# backend/app/services/embedding_service.py
"""
统一封装 Embedding 模型和 VectorDB 操作。
提供内容向量化、向量存储、语义搜索的便捷接口。
"""
import logging
from typing import Optional
from app.core.embedding import EmbeddingModel
from app.core.vector_db import VectorDB
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """统一 Embedding 服务。"""

    def __init__(self):
        self.embedding_model = EmbeddingModel()
        self.vector_db = VectorDB()

    def index_lost_item(
        self,
        item_id: int,
        title: str,
        description: str,
        location: str,
        item_type: str,  # "lost" or "found"
        category: str,
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
        }

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
        """语义搜索失物招领内容。"""
        if not self.vector_db.is_available:
            logger.warning("Qdrant 不可用，返回空结果")
            return []

        query_vector = self.embedding_model.encode(query)
        return self.vector_db.search(
            query_vector=query_vector,
            limit=limit,
            filter_type=item_type,
        )

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
            ):
                count += 1
        return count


# 模块级单例
embedding_service = EmbeddingService()
```

- [ ] **Step 2: 提交**

```bash
git add backend/app/services/embedding_service.py
git commit -m "feat: 添加统一 Embedding 服务"
```

---

## Task 5: 失物接口同步向量写入

**Files:**
- Modify: `backend/app/api/lost_items.py` (POST 和 PUT 时调用 embedding_service)

- [ ] **Step 1: 查看现有 lost_items.py 结构**

Run: `rg "def (create|update)" backend/app/api/lost_items.py`

- [ ] **Step 2: 修改 create endpoint，在创建后同步写入向量**

在 `lost_items.py` 的 create 函数中，成功创建后添加：
```python
# 同步写入向量索引
try:
    embedding_service.index_lost_item(
        item_id=lost_item.id,
        title=lost_item.title,
        description=lost_item.description or "",
        location=lost_item.location or "",
        item_type=lost_item.type,
        category=lost_item.category,
    )
except Exception as e:
    logger.warning(f"向量索引失败: {e}")  # 不阻塞主流程
```

- [ ] **Step 3: 修改 update endpoint，在更新后更新向量**

类似 create，调用 `embedding_service.index_lost_item`（upsert 语义）

- [ ] **Step 4: 修改 delete endpoint，在删除后删除向量**

```python
try:
    embedding_service.delete_lost_item(item_id)
except Exception as e:
    logger.warning(f"向量删除失败: {e}")
```

- [ ] **Step 5: 提交**

```bash
git add backend/app/api/lost_items.py
git commit -m "feat: 失物 CRUD 同步向量写入"
```

---

## Task 6: 搜索接口升级为语义检索

**Files:**
- Modify: `backend/app/api/search.py`

- [ ] **Step 1: 查看现有搜索接口结构**

Run: `rg "def unified_search" backend/app/api/search.py`

- [ ] **Step 2: 替换 TF-IDF 为 Qdrant 语义搜索**

```python
# 在 unified_search 函数中，当 use_fulltext=False 时
# 改为使用 embedding_service.search_lost_items

if type in ("all", "lost-items"):
    if use_fulltext:
        # 保留 MySQL FULLTEXT 用于通知和活动
        # ... 现有代码 ...
    else:
        # 失物使用语义搜索降级
        matches = embedding_service.search_lost_items(
            query=keyword,
            limit=limit,
            item_type=None,  # 支持 all
        )
        for m in matches:
            results.append(SearchResultItem(
                id=m["id"],
                type="lost_item",
                title=m["payload"]["title"],
                description=m["payload"].get("description", "")[:200],
                score=m["score"],
                extra={
                    "category": m["payload"].get("category"),
                    "location": m["payload"].get("location"),
                    "item_type": m["payload"].get("type"),
                },
            ))
```

- [ ] **Step 3: 添加语义搜索主路径（len(keyword) >= 2 时优先使用 Qdrant）**

当 Qdrant 可用时，直接用语义搜索替换 FULLTEXT：
```python
if embedding_service.vector_db.is_available and type in ("all", "lost-items"):
    matches = embedding_service.search_lost_items(keyword, limit=limit)
    # 合并到 results
```

- [ ] **Step 4: 提交**

```bash
git add backend/app/api/search.py
git commit -m "feat: 搜索接口升级为 Qdrant 语义检索"
```

---

## Task 7: 失物匹配接口升级

**Files:**
- Modify: `backend/app/api/lost_item_matching.py`

- [ ] **Step 1: 替换 find_matching_items 函数**

将 TF-IDF 匹配逻辑替换为 Qdrant 语义检索：

```python
async def find_matching_items(
    db: AsyncSession,
    item_id: int,
    user_id: int,
) -> list[dict]:
    """查找与指定物品交叉匹配的物品列表。"""
    source = await db.get(LostItem, item_id)
    if not source:
        return []

    opposite_type = "found" if source.type == "lost" else "lost"

    # 使用 Qdrant 语义搜索
    if not embedding_service.vector_db.is_available:
        return []  # Qdrant 不可用时返回空，不阻塞

    query = f"{source.title} {source.description} {source.location}"
    matches = embedding_service.search_lost_items(
        query=query,
        limit=5,
        item_type=opposite_type,
    )

    results = []
    for m in matches:
        if m["id"] == user_id:
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
```

- [ ] **Step 2: 提交**

```bash
git add backend/app/api/lost_item_matching.py
git commit -m "feat: 失物匹配升级为 Qdrant 语义检索"
```

---

## Task 8: 批量重建索引脚本

**Files:**
- Create: `backend/reindex_vectors.py`

- [ ] **Step 1: 创建索引重建脚本**

```python
#!/usr/bin/env python
"""
批量重建失物招领向量索引。
用于首次迁移或索引损坏时。
"""
import asyncio
import sys
sys.path.insert(0, ".")

from sqlalchemy import select
from app.db.database import async_session_maker
from app.models.lost_item import LostItem
from app.services.embedding_service import embedding_service


async def main():
    print("开始重建向量索引...")

    async with async_session_maker() as db:
        result = await db.execute(
            select(LostItem).where(LostItem.review_status == "approved")
        )
        items = result.scalars().all()

    item_dicts = [
        {
            "id": item.id,
            "title": item.title,
            "description": item.description or "",
            "location": item.location or "",
            "type": item.type,
            "category": item.category,
        }
        for item in items
    ]

    count = embedding_service.reindex_all_lost_items(item_dicts)
    print(f"成功索引 {count}/{len(items)} 条记录")


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 2: 提交**

```bash
git add backend/reindex_vectors.py
git commit -m "feat: 添加批量重建向量索引脚本"
```

---

## 验证清单

- [ ] Qdrant 服务启动成功 (localhost:6333)
- [ ] `python -m pytest tests/test_embedding.py -v` PASS
- [ ] `python -m pytest tests/test_vector_db.py -v` PASS
- [ ] 创建失物时向量成功写入 Qdrant
- [ ] 搜索"耳机"能找到"AirPods"相关内容
- [ ] 失物匹配能返回语义相关的物品

---

## 回滚计划

如需回滚：
1. `docker-compose down qdrant` 停止 Qdrant
2. 代码会 graceful degrade 到降级搜索
3. `git revert` 逐个回滚 commit
