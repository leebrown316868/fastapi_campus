# 语义匹配升级设计

## 目标

将失物招领的匹配算法从 TF-IDF 字面匹配升级为基于 Embedding 的语义匹配，使"AirPods"能匹配到"蓝牙耳机"，"丢失物品"能匹配到"失物招领"。

## 技术选型

| 组件 | 选择 | 理由 |
|------|------|------|
| 向量数据库 | Qdrant | 轻量、Python友好、Docker部署 |
| Embedding 模型 | BGE-M3 | 中文开源最强、本地运行、RTX 3050 可用 |
| 写入策略 | 同步写入 | 逻辑简单、延迟低 |

## 架构

### 搜索流程

```
用户查询 "耳机"
       ↓
  BGE-M3 生成查询向量（本地）
       ↓
  Qdrant 语义检索（Top-K）
       ↓
  返回匹配结果
```

### 向量生成策略

- **字段组合**：title + description + location 拼接为一个向量
- **维度**：BGE-M3 默认 1024 维
- **时机**：内容创建/修改时同步生成并入库

### 匹配评分

Qdrant 返回 relevance_score（余弦相似度），直接作为排序依据。

## 改动范围

### 新增文件

| 文件 | 职责 |
|------|------|
| `backend/app/core/embedding.py` | BGE-M3 模型封装，encode 方法 |
| `backend/app/core/vector_db.py` | Qdrant 客户端封装，upsert/search 方法 |
| `backend/app/services/embedding_service.py` | 统一封装 Embedding + VectorDB 操作 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `backend/app/api/search.py` | 替换 TF-IDF 为 Qdrant 语义检索 |
| `backend/app/api/lost_item_matching.py` | 替换 TF-IDF 匹配为 Qdrant 检索 |
| `backend/app/api/lost_items.py` | 创建/修改失物时同步写入向量 |
| `docker-compose.yml` | 添加 Qdrant 服务 |

### 不改动的文件

- `backend/app/models/*` - 数据模型不变
- `backend/app/schemas/*` - 接口格式不变

## 降级机制

当 Qdrant 服务不可用时，搜索降级到 LIKE 模糊匹配，保证系统可用性。

## 部署依赖

```yaml
# docker-compose.yml 新增
qdrant:
  image: qdrant/qdrant:latest
  ports:
    - "6333:6333"
  volumes:
    - qdrant_storage:/qdrant/storage
```

环境变量新增：
- `EMBEDDING_MODEL_PATH` - BGE-M3 模型本地路径
- `QDRANT_URL` - Qdrant 服务地址（默认 http://localhost:6333）
