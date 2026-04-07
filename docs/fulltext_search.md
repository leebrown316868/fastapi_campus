# 统一全文搜索 — 设计与实现文档

> 创新点：基于 MySQL ngram 全文索引的跨模块统一搜索
> 日期：2026-04-06

---

## 1. 功能定位

信息聚合平台的核心能力不仅是**聚合展示**（Feed 信息流），还应包含**聚合检索**。本功能实现了跨通知、活动、失物招领三大模块的统一全文搜索，作为论文第4章的创新点支撑。

```
信息聚合 = 聚合展示（Feed） + 聚合检索（统一搜索）
```

## 2. 技术方案

### 2.1 为什么选择 MySQL FULLTEXT

| 方案 | 优点 | 缺点 |
|------|------|------|
| 前端 LIKE 过滤 | 实现简单 | 拉取全量数据，无法利用索引 |
| 后端 LIKE 查询 | 服务端过滤 | 无法利用索引，无法排序相关性 |
| MySQL FULLTEXT | 倒排索引、相关性评分、中文支持 | 仅限 MySQL |
| Elasticsearch | 功能最强 | 架构复杂，本科毕设过重 |

选择 MySQL FULLTEXT 的理由：项目已迁移至 MySQL 8.0+，ngram 分词器原生支持中文，无需引入额外中间件。

### 2.2 ngram 分词器

MySQL 8.0 内置 ngram 分词器，专为中日韩语言设计：

- 默认 `ngram_token_size=2`，将文本切分为双字词
- 例如："期中考试时间调整通知" → ["期中", "中考", "考试", "试时", "时间", "间调", "调整", "整通", "通知"]
- 搜索"考试"时，匹配到包含"考试"token 的记录

### 2.3 FULLTEXT 索引设计

```sql
-- 通知表：对标题、内容、课程名建索引
ALTER TABLE notifications ADD FULLTEXT INDEX ft_notifications
  (title, content, course) WITH PARSER ngram;

-- 活动表：对标题、描述、主办方、地点建索引
ALTER TABLE activities ADD FULLTEXT INDEX ft_activities
  (title, description, organizer, location) WITH PARSER ngram;

-- 失物招领表：对标题、描述、地点建索引
ALTER TABLE lost_items ADD FULLTEXT INDEX ft_lost_items
  (title, description, location) WITH PARSER ngram;
```

### 2.4 搜索模式

| 关键词长度 | 搜索模式 | 原因 |
|-----------|---------|------|
| ≥ 2 字符 | `NATURAL LANGUAGE MODE` | 利用 FULLTEXT 倒排索引，返回相关性评分 |
| 1 字符 | `LIKE` 回退 | ngram 最小 token 为 2，单字无法利用索引 |

## 3. API 设计

### 端点

```
GET /api/search?q={关键词}&type={类型}&limit={数量}
```

### 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| q | string | 必填 | 搜索关键词（最少1字符） |
| type | string | "all" | 类型过滤：all / notifications / activities / lost-items |
| limit | int | 20 | 最大返回数量（上限50） |

### 响应格式

```json
{
  "query": "校园",
  "total": 5,
  "counts": {
    "notifications": 0,
    "activities": 2,
    "lost_items": 3
  },
  "results": [
    {
      "id": 1,
      "type": "activity",
      "title": "2024 校园春季音乐节",
      "description": "汇集校园顶尖乐队与歌手...",
      "score": 0.0620,
      "created_at": "2026-04-06T12:00:00",
      "extra": {
        "category": "文艺",
        "location": "大礼堂",
        "organizer": "学生艺术团",
        "date": "2024年11月15日 19:00",
        "image": "https://...",
        "status": "报名中"
      }
    }
  ]
}
```

### 设计要点

- **统一格式**：三种数据类型映射为统一的 `SearchResultItem` 格式，`type` 字段区分来源
- **全局排序**：先按各模块分别检索，然后合并后按 `score` 降序排列，确保最相关结果排在前面
- **类型特定字段**：通过 `extra` 字典存放各类型特有属性，保持主结构简洁

## 4. 代码结构

```
后端:
  backend/app/api/search.py          # 搜索 API 路由
  backend/app/models/notification.py  # FULLTEXT 索引定义
  backend/app/models/activity.py      # FULLTEXT 索引定义
  backend/app/models/lost_item.py     # FULLTEXT 索引定义

前端:
  fronted/services/search.service.ts  # 搜索服务（调用后端 API）
  fronted/pages/SearchResults.tsx     # 搜索结果页（使用后端 API）
```

### 前后端对比

| 对比项 | 改造前 | 改造后 |
|--------|--------|--------|
| 搜索方式 | 前端拉取全量数据 + `includes()` 过滤 | 后端 FULLTEXT 索引查询 |
| 数据传输 | 下载所有通知/活动/失物 | 仅传输匹配结果 |
| 相关性排序 | 无 | FULLTEXT 自然语言评分 |
| 中文支持 | `toLowerCase().includes()` 精确子串 | ngram 双字词分词匹配 |

## 5. 搜索效果验证

| 搜索词 | 匹配结果 | 评分 |
|--------|---------|------|
| 考试 | 期中考试时间调整通知 | 0.1812 |
| 音乐 | 2024 校园春季音乐节 | 0.2276 |
| 耳机 | 苹果 AirPods Pro 耳机 (第二代) | 0.1812 |
| 校园 | 2024 校园春季音乐节 (0.0620) + 校园马拉松接力赛 (0.0310) | 按评分排序 |

## 6. 论文叙事建议

第4章标题建议：**"多源信息聚合与统一检索设计"**

- 4.1 Feed 聚合信息流设计（聚合展示，已有）
- 4.2 基于全文索引的统一检索设计（聚合检索，本功能）
- 4.3 ngram 中文分词与相关性排序（技术细节）
- 4.4 聚合效果展示与分析（搜索效果对比数据）
