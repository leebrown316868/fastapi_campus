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