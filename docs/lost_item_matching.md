# 失物招领智能匹配 — 设计与实现文档

> 创新点：基于 FULLTEXT 全文索引 + 多维加权的失物/招领交叉匹配
> 日期：2026-04-06

---

## 1. 功能定位

失物招领是校园高频需求，传统平台中"遗失"和"招领"信息独立展示，用户需要手动搜索发现关联信息。本功能实现了**跨类型自动匹配**——发布"遗失 AirPods"时，系统自动关联已发布的"拾到 AirPods Pro"，体现了信息聚合平台从"聚合展示"到"智能关联"的进阶。

```
信息聚合进阶形态：
聚合展示（Feed） → 聚合检索（搜索） → 智能关联（匹配）
```

## 2. 技术方案

### 2.1 匹配算法设计

采用 **两阶段匹配架构**：第一阶段利用 MySQL FULLTEXT 索引快速召回候选集，第二阶段基于 TF-IDF 余弦相似度计算精确匹配分。

#### 综合评分公式

```
Score = 0.4 × CategoryMatch + 0.4 × CosineSim(TF-IDF) + 0.2 × LocationSim
```

| 维度 | 权重 | 计算方式 | 取值范围 |
|------|------|---------|---------|
| 分类匹配 | 40% | 同分类（如"电子数码"）为 1.0，否则 0.0 | {0.0, 1.0} |
| 文本相似度 | 40% | TF-IDF 向量 + 余弦相似度 | [0.0, 1.0] |
| 地点相似度 | 20% | 完全相同 1.0，包含 0.8，关键词重叠 0.5，无 0.0 | {0.0, 0.5, 0.8, 1.0} |

### 2.2 TF-IDF 余弦相似度

#### 分词策略

与 MySQL ngram 分词器保持一致，使用双字词切分（bigram），英文按完整单词切分：

```
"Apple AirPods 蓝牙耳机" → ["apple", "airpods", "蓝牙", "牙耳", "耳机"]
```

#### TF-IDF 计算公式

以 FULLTEXT 召回的候选集为**微语料库** D（约10个文档），计算：

**词频（TF）：**

$$TF(t, d) = \frac{count(t \in d)}{|d|}$$

**逆文档频率（IDF），使用平滑版本：**

$$IDF(t, D) = \ln\frac{1 + |D|}{1 + df(t)} + 1$$

其中 $|D|$ 为微语料库文档总数，$df(t)$ 为包含词 $t$ 的文档数。

**TF-IDF 权重：**

$$TF\text{-}IDF(t, d, D) = TF(t, d) \times IDF(t, D)$$

#### 余弦相似度

$$\text{cos}(A, B) = \frac{A \cdot B}{||A|| \times ||B||} = \frac{\sum_{t} TF\text{-}IDF(t, A) \times TF\text{-}IDF(t, B)}{\sqrt{\sum_{t} TF\text{-}IDF(t, A)^2} \times \sqrt{\sum_{t} TF\text{-}IDF(t, B)^2}}$$

### 2.3 权重选择依据

- **分类权重最高**（40%）：校园失物招领中，物品分类是最强的匹配信号（耳机不可能匹配到钥匙）
- **文本相似度同权重**（40%）：标题和描述中的具体信息（品牌、型号、颜色）是精准匹配的关键
- **地点权重较低**（20%）：校园面积有限，地点匹配是辅助信号

### 2.4 匹配流程

```
发布失物/招领 ──► 等待管理员审批 ──► 审批通过
                                       │
                                       ▼
                    ┌─────── 阶段一：FULLTEXT 候选召回 ──────┐
                    │  复用 MySQL ngram 索引快速检索           │
                    │  opposite_type + 状态="寻找中" + 已审核  │
                    │  返回 top 10 候选                        │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌─────── 阶段二：TF-IDF 精确评分 ───────┐
                    │  构建微语料库 D（源 + 候选集）         │
                    │  计算 IDF（在 D 上的逆文档频率）       │
                    │  逐候选计算 TF-IDF 余弦相似度           │
                    │  多维加权 → 阈值过滤 → Top-5           │
                    └───────────────────┬────────────────────┘
                                        │
                              ┌────────┴────────┐
                              │ 有匹配结果      │ 无匹配结果
                              ▼                 ▼
                     创建通知 + WebSocket推送   （无操作）
                     物品详情页展示匹配列表
```

### 2.4 过滤规则

| 规则 | 说明 |
|------|------|
| 反向类型 | "lost" 只匹配 "found"，反之亦然 |
| 状态过滤 | 仅匹配 status="寻找中" 的物品 |
| 审核过滤 | 仅匹配 review_status="approved" 的物品 |
| 排除自身 | 不匹配 created_by 相同的物品 |
| 最低阈值 | final_score > 0.1 才计入结果 |
| 数量限制 | 最多返回 5 条匹配结果 |

## 3. API 设计

### 端点

```
GET /api/lost-items/{item_id}/matches
```

### 参数

| 参数 | 类型 | 说明 |
|------|------|------|
| item_id | path | 物品 ID |
| Authorization | header | JWT Token（登录用户） |

### 响应格式

```json
[
  {
    "id": 15,
    "title": "苹果 AirPods Pro (第二代)",
    "type": "found",
    "category": "electronics",
    "location": "图书馆二楼自习室",
    "score": 0.82
  },
  {
    "id": 23,
    "title": "白色蓝牙耳机",
    "type": "found",
    "category": "electronics",
    "location": "教学楼A栋3楼",
    "score": 0.45
  }
]
```

### 匹配度展示规则

| 匹配度 | 颜色 | 说明 |
|--------|------|------|
| ≥ 70% | 绿色 | 高度匹配 |
| 40%~70% | 橙色 | 中度匹配 |
| < 40% | 灰色 | 低度匹配 |

## 4. 代码结构

```
后端:
  backend/app/api/lost_item_matching.py   # 匹配算法 + API 端点
  backend/app/api/lost_items.py           # 审批通过后触发匹配（+10行）

前端:
  fronted/services/lostItems.service.ts   # getMatches() 方法
  fronted/components/MatchedItems.tsx     # 匹配结果展示组件
  fronted/pages/ItemDetail.tsx           # 物品详情页嵌入匹配区域
```

### 核心函数

| 函数 | 文件 | 说明 |
|------|------|------|
| `find_matching_items()` | `lost_item_matching.py` | 执行 FULLTEXT 搜索 + 计算综合评分 |
| `_calculate_location_similarity()` | `lost_item_matching.py` | 地点相似度计算 |
| `notify_matches()` | `lost_item_matching.py` | 创建通知 + WebSocket 推送 |

## 5. 智能匹配 + 实时推送协同

两个创新点通过以下链路协同工作：

```
管理员审批通过
    │
    ▼
find_matching_items()  ←── 复用 FULLTEXT 索引（搜索创新点的延伸）
    │
    ▼
notify_matches()
    ├── 创建 UserNotification（DB持久化）
    └── manager.send_to_user()  ←── WebSocket 实时推送（推送创新点的应用）
            │
            ▼
        前端 NotificationBell 实时更新
        前端 ItemDetail 展示匹配列表
```

## 6. 地点相似度算法细节

```python
def _calculate_location_similarity(loc1: str, loc2: str) -> float:
    """校园地点相似度计算。

    "图书馆二楼" vs "图书馆二楼"    → 1.0（完全相同）
    "图书馆二楼" vs "图书馆一楼"    → 0.8（包含关系）
    "图书馆二楼" vs "教学楼二楼"    → 0.5（关键词"二楼"重叠）
    "图书馆" vs "食堂"              → 0.0（无交集）
    """
```

去除"楼/室/层/区/栋/号"等后缀后分词匹配，适应校园地点描述的多样性。

## 7. 论文叙事建议

第4章新增小节：**"4.x 失物招领智能匹配设计"**

- 匹配算法设计（加权评分公式、权重选择依据）
- FULLTEXT 索引在匹配场景中的复用（体现搜索创新点的延伸价值）
- 匹配效果示例（真实数据展示）
- 智能匹配 + 实时推送的协同架构
- 与传统"手动搜索"方式的对比分析
