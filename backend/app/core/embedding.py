"""
BGE-M3 Embedding 模型封装。
支持本地 GPU/CPU 运行，中文语义向量化。
"""
import numpy as np
import threading
from sentence_transformers import SentenceTransformer
from app.core.config import settings


class EmbeddingModel:
    """BGE-M3 向量化模型封装。"""

    _instance = None
    _model = None
    _lock = threading.Lock()  # LLM API 不支持并发，加锁保护

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
        with self._lock:  # 串行执行
            model = self._load_model()
            embedding = model.encode(text, normalize_embeddings=True)
            return embedding.tolist()

    def encode_batch(self, texts: list[str]) -> list[list[float]]:
        """批量文本向量化。"""
        if not texts:
            return []
        with self._lock:  # 串行执行
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