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