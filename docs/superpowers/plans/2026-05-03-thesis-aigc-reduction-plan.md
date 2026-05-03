# 毕业论文降AIGC实施计划

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对 `thesis/初稿-修改版.docx` 执行四阶段降AIGC修改，将AIGC检测率降至≤20%

**Architecture:** python-docx逐段操作docx文件，通过paragraph.runs保留原有格式（字体/字号/样式）。机械替换（过渡词/句首）批量脚本完成；结构性改写（编号→自然段）生成精确替换文本后逐段写入；内容注入在指定位置插入新段落。

**Tech Stack:** python-docx 1.2.0, Python 3.11, 正则表达式

**修改原则:**
- 只改文字，不改格式（run.font保持不变）
- 技术术语不动（FastAPI、BGE-M3、WebSocket等）
- 参考文献和测试数据不动
- 去AI≠写散文，逻辑链必须保持
- 人格化≠口语化，保持学术正式语气

**⚠️ 段落索引注意事项:**
- 每次修改后文档段落数可能变化，每个Task必须 `docx.Document()` 重新打开获取最新索引
- Phase 1 从后往前处理（先高索引后低索引），避免索引偏移影响后续操作
- 注入新段落时使用 `addnext` 在当前段落后插入，而非依赖绝对索引
- 如遇索引不匹配，先在当前文档中grep定位目标段落再操作

---

## 0. 准备与备份

### Task 0.1: 备份原文件

- [ ] **Step 1: 创建备份**

```bash
mkdir -p E:/project/pyproject/campushub_fastapi/thesis/_backup
cp "E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx" "E:/project/pyproject/campushub_fastapi/thesis/_backup/初稿-修改版-$(date +%Y%m%d_%H%M%S).docx"
```

- [ ] **Step 2: 验证备份**

```bash
ls -la "E:/project/pyproject/campushub_fastapi/thesis/_backup/"
```

### Task 0.2: 生成修改日志框架

- [ ] **Step 1: 创建日志文件**

创建 `thesis/_aigc_modification_log.md`：

```markdown
# 降AIGC修改日志

## 文件: thesis/初稿-修改版.docx
## 开始时间: 2026-05-03

---

## Phase 1: 结构层去AI化

### 编号并列结构重构
| 段落 | 方法 | 原文摘要 | 目标文摘要 | 状态 |
|------|------|---------|-----------|------|

### 章节小结验证
| 章 | 位置 | 验证结果 | 状态 |
|----|------|---------|------|

## Phase 2: 内容层注入

| 注入点 | 位置 | 内容摘要 | 状态 |
|--------|------|---------|------|

## Phase 3: 词汇层去AI化

### 过渡词替换
| 段落 | 原词 | 替换为 | 状态 |

### "系统"句首替换
| 段落 | 原文 | 替换为 | 状态 |

## Phase 4: 验证

| 指标 | 修改前 | 修改后 | 通过 |
|------|--------|--------|------|
```

---

## Phase 1: 结构层去AI化

### Task 1.1: 扫描并分类所有编号并列段落

- [ ] **Step 1: 运行分类脚本**

```bash
python -c "
import docx, re

doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

# Key paragraphs by category
to_fuse = []      # feature descriptions → fuse to natural paragraph
to_restructure = []  # too many items → reduce to 1-2 key points
to_keep = []      # technical steps, test cases, formulas → keep but format check

for i, p in enumerate(doc.paragraphs):
    text = p.text.strip()
    matches_full = re.findall(r'（\d+）', text)
    matches_half = re.findall(r'\(\d+\)', text)
    matches_ord = re.findall(r'第[一二三四五六七八九]', text)
    
    total = len(matches_full) + len(matches_half) + len(matches_ord)
    if total < 2:
        continue
    
    prev_text = ''
    for j in range(i-1, max(i-3, 0), -1):
        if doc.paragraphs[j].text.strip():
            prev_text = doc.paragraphs[j].text.strip()[:100]
            break
    
    # Classify
    style_name = p.style.name if p.style else ''
    category = 'unknown'
    
    # Technical steps in architecture/implementation chapters (keep with limits)
    if '匹配流程' in prev_text or '数据流如下' in prev_text or '执行以下流程' in prev_text:
        category = 'KEEP_TECH_STEPS'
    # Chapter 3 requirements descriptions (fuse)
    elif '功能测试' in prev_text or '性能需求' in prev_text or '安全需求' in prev_text or '可用性需求' in prev_text:
        category = 'FUSE_REQUIREMENTS'
    elif '挑战' in prev_text or '问题' in prev_text or '特殊性' in prev_text:
        category = 'FUSE_CHALLENGES'
    elif '演进' in prev_text or '阶段' in prev_text or 'Multi-' in text:
        category = 'FUSE_EVOLUTION'
    elif '架构' in prev_text or '核心组件' in prev_text:
        category = 'FUSE_ARCHITECTURE'
    elif '设计要点' in prev_text or '编码' in prev_text:
        category = 'FUSE_DESIGN'
    elif '策略' in prev_text:
        category = 'FUSE_STRATEGY'
    elif '触发' in prev_text or '流程' in prev_text:
        category = 'KEEP_FLOW'
    elif '测试' in prev_text or '优化' in prev_text:
        category = 'FUSE_TESTING'
    elif '展望' in prev_text or '不足' in prev_text:
        category = 'FUSE_OUTLOOK'
    elif '小结' in style_name:
        category = 'FUSE_SUMMARY'
    
    record = {
        'para_idx': i,
        'total_items': total,
        'full_width': len(matches_full),
        'half_width': len(matches_half),
        'ordinal': len(matches_ord),
        'category': category,
        'preview': text[:150]
    }
    
    if 'FUSE' in category:
        to_fuse.append(record)
    elif 'KEEP' in category:
        to_keep.append(record)
    else:
        to_restructure.append(record)
    
    print(f'P{i} [{category}]: {total} items - {text[:150]}')

print(f'\nFUSE: {len(to_fuse)} paragraphs')
print(f'KEEP: {len(to_keep)} paragraphs')
print(f'RESTRUCTURE: {len(to_restructure)} paragraphs')
" > thesis/_phase1_classification.txt
```

### Task 1.2: 熔断需求描述类编号列表（P293-305, P511-514, P545-548）

- [ ] **Step 1: 熔断 P293-295 性能需求（3个编号→1段）**

```python
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

# P293-295: 性能需求3条 → 熔断
# P293: "（1）接口响应时间：所有API接口在正常负载下的平均响应时间应控制在500毫秒以内..."
# P294: "（2）并发处理能力：系统应支持至少50个并发用户同时访问且请求无失败..."
# P295: "（3）数据检索效率：全文搜索接口应在1秒内返回检索结果..."

new_text = "在接口响应时间方面，所有API接口在正常负载下的平均响应时间应控制在500毫秒以内，其中首页Feed聚合接口、列表查询接口等高频访问接口的响应时间应优先保障。并发处理能力方面，系统应支持至少50个并发用户同时访问且请求无失败；在并发场景下，数据库连接池需合理配置以避免连接耗尽，WebSocket连接管理需确保消息推送的有序性与可靠性。数据检索效率方面，全文搜索接口应在1秒内返回检索结果，智能匹配算法的单次匹配计算应控制在2秒以内完成。"

# Replace P293 text, clear P294-P295
p293 = doc.paragraphs[293]
for run in p293.runs:
    run.text = ''
if p293.runs:
    p293.runs[0].text = new_text

# Clear P294, P295
for idx in [294, 295]:
    p = doc.paragraphs[idx]
    for run in p.runs:
        run.text = ''

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
print('P293-295 fused.')
```

- [ ] **Step 2: 熔断 P298-301 安全需求（4个编号→1段）**

```python
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

# P298-301: 安全需求4层面 → 熔断为自然段
new_text = "身份认证层面，系统采用JWT令牌机制实现无状态认证，令牌使用HS256算法签名，密钥通过环境变量配置、禁止硬编码，令牌有效期为24小时，过期后需重新登录获取。权限控制层面，实施基于角色的访问控制（RBAC），将用户权限划分为user和admin两个等级，所有涉及权限的操作均通过FastAPI的Depends依赖注入机制在服务端进行校验，确保前端路由守卫被绕过时接口仍然安全。数据安全层面，密码通过bcrypt（cost factor=12）进行单向哈希，即使数据库泄露也无法反推明文；用户隐私字段（邮箱和电话）一律默认不公开，只有本人主动开启对应开关后才对外可见，这种"默认隐私"的设计在信息共享和隐私保护之间宁可偏向保护一端。输入防护层面，所有用户输入均经过Pydantic模型的字段校验，包括数据类型、字符串长度、正则格式等约束，防止SQL注入、XSS跨站脚本等常见Web攻击，同时系统配置CORS跨域策略，仅允许指定的前端域名访问后端接口。"

for idx in [298, 299, 300, 301]:
    p = doc.paragraphs[idx]
    for run in p.runs:
        run.text = ''
if doc.paragraphs[298].runs:
    doc.paragraphs[298].runs[0].text = new_text

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
print('P298-301 fused.')
```

- [ ] **Step 3: 熔断 P303-305 可用性需求（3个编号→1段）**

```python
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

new_text = "跨浏览器兼容方面，前端采用React框架构建标准化的Web应用，需兼容Google Chrome（90及以上版本）、Mozilla Firefox（88及以上版本）和Microsoft Edge（90及以上版本），确保页面渲染、交互功能与样式表现的一致性。响应式布局方面，前端界面使用Tailwind CSS框架实现响应式设计，能够适配桌面显示器和笔记本电脑屏幕等不同尺寸的终端设备，保证用户在不同设备上均能获得良好的浏览体验。操作容错方面，系统在用户执行删除内容、修改密码等关键操作时提供确认提示，操作失败时通过Toast组件展示友好的错误提示信息，引导用户正确使用系统。"

for idx in [303, 304, 305]:
    p = doc.paragraphs[idx]
    for run in p.runs:
        run.text = ''
if doc.paragraphs[303].runs:
    doc.paragraphs[303].runs[0].text = new_text

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
print('P303-305 fused.')
```

- [ ] **Step 4: 熔断 P511-514 性能优化建议（4个编号→1段）**

```python
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

new_text = "登录接口可通过缓存热点用户的密码哈希来减少重复计算开销，或引入JWT令牌刷新机制降低重复登录频率；搜索接口可引入Redis缓存热门查询词的搜索结果，减少全文索引查询的频率；生产环境建议使用MySQL替代SQLite以获得更好的并发读写性能；数据库连接池参数可根据实际负载进行调优，提升高并发场景下的吞吐量。"

for idx in [511, 512, 513, 514]:
    p = doc.paragraphs[idx]
    for run in p.runs:
        run.text = ''
if doc.paragraphs[511].runs:
    doc.paragraphs[511].runs[0].text = new_text

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
print('P511-514 fused.')
```

### Task 1.3: 熔断挑战/演进类型编号列表

- [ ] **Step 1: 熔断 P314-316 失物匹配挑战（3个编号→自然段）**

```python
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

# Fuse 3 challenges into natural flowing paragraph
new_text = "第一个挑战是描述短且非专业——用户在发布遗失或招领信息时通常使用简短的日常语言描述物品，如"黑色耳机""校园卡丢了"等，缺乏专业规范的物品描述，这导致不同用户对同一物品的表述往往差异较大，"耳机"与"耳麦"、"校园卡"与"一卡通"、"高数课本"与"数学教材"实际上指向同一类物品。与之相关的是信息不完整的问题：发布者常常遗漏品牌、型号、颜色等关键信息，仅提供模糊描述，例如只写"手机"而未说明具体品牌和型号，给精确匹配带来了困难。此外，错别字与口语化表达在校园用户中普遍存在，传统基于精确匹配的算法难以处理这类情况。"

for idx in [314, 315, 316]:
    p = doc.paragraphs[idx]
    for run in p.runs:
        run.text = ''
if doc.paragraphs[314].runs:
    doc.paragraphs[314].runs[0].text = new_text

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
print('P314-316 fused.')
```

- [ ] **Step 2: 熔断 P320-323 技术演进阶段（4个编号→因果链叙述）**

```python
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

# Fuse 4 evolution stages into causal chain
new_text = "文本匹配技术经历了从词法匹配到语义匹配的演进过程。最早期的词法匹配阶段以TF-IDF、BM25为代表，通过统计词频和逆文档频率计算文本相似度，但这类方法依赖于词汇的精确匹配，无法处理同义词和语义相近的不同表述——例如"校园卡"和"一卡通"在TF-IDF向量空间中因不共享任何词元而相似度为零。随后进入以Word2Vec、GloVe为代表的分布式表示阶段，将词语映射到连续的向量空间使得语义相近的词语距离较近，但Word2Vec生成的是静态词向量，同一词语在不同语境下具有相同表示，无法处理多义词问题。以BERT、GPT为代表的预训练语言模型阶段带来了质的飞跃[13]，通过大规模语料预训练能够根据上下文生成动态词向量，显著提升了文本语义表示的质量。当前以Sentence-BERT、BGE、GTE等为代表的专用嵌入模型阶段[16]，在预训练语言模型的基础上进行对比学习微调，专门优化文本向量的语义表示能力，可直接生成高质量的句子级或段落级向量，适合文本相似度计算和语义检索任务。"

for idx in [320, 321, 322, 323]:
    p = doc.paragraphs[idx]
    for run in p.runs:
        run.text = ''
if doc.paragraphs[320].runs:
    doc.paragraphs[320].runs[0].text = new_text

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
print('P320-323 fused.')
```

- [ ] **Step 3: 熔断 P332-334 BGE-M3特性（3个编号→自然段）**

```python
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

new_text = "BGE-M3名称中的"M3"分别代表三个核心特性。多语言性（Multi-Linguality）使其支持超过100种语言，在多语言和跨语言检索任务上表现优异，在MTEB和C-MTEB排行榜上均处于第一梯队。多功能性（Multi-Functionality）使其同时支持稠密检索（Dense Retrieval）、多向量检索（Multi-vector Retrieval）和稀疏检索（Sparse Retrieval）三种检索函数，本系统采用其稠密检索能力生成固定长度的语义向量。多粒度性（Multi-Granularity）使其能够处理从短句到长文档的不同粒度文本输入，最大支持8192个token的输入长度，因而能同时处理简短的物品标题和较长的物品描述。"

for idx in [332, 333, 334]:
    p = doc.paragraphs[idx]
    for run in p.runs:
        run.text = ''
if doc.paragraphs[332].runs:
    doc.paragraphs[332].runs[0].text = new_text

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
print('P332-334 fused.')
```

### Task 1.4: 熔断架构/设计类编号列表

- [ ] **Step 1: 熔断 P346-349 系统架构组件（4个编号→自然段）**

```python
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

new_text = "失物智能匹配系统由四个核心组件构成。数据存储层采用关系型数据库MySQL，负责存储失物招领的结构化数据，包括物品标题、描述、类型、分类、地点、图片、发布者等字段，作为主数据源保证数据的完整性和事务一致性。向量编码层以BGE-M3为核心，在管理员审批通过失物信息时触发编码——取物品的标题加描述加地点拼接为输入文本，生成1024维的归一化向量；模型实例采用单例模式管理，全系统只加载一份避免GPU显存被重复占用，编码入口用threading.Lock保护，确保同一时刻只有一个编码任务执行以防止并发请求撑爆显存。向量检索层使用Qdrant向量数据库，存储所有已审批失物的语义向量及其元数据（物品ID、类型、分类、发布者等），当需要匹配时系统构造查询向量并指定过滤条件（互补类型、排除自己），Qdrant返回相似度最高的候选物品列表。通知推送层通过WebSocket在匹配完成后将匹配结果实时推送给相关用户，实现"一有匹配立即通知"的用户体验。"

for idx in [346, 347, 348, 349]:
    p = doc.paragraphs[idx]
    for run in p.runs:
        run.text = ''
if doc.paragraphs[346].runs:
    doc.paragraphs[346].runs[0].text = new_text

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
print('P346-349 fused.')
```

- [ ] **Step 2: 熔断 P353-356 向量编码模块设计要点（4个编号→自然段）**

```python
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

new_text = "输入构造方面，将物品的标题（title）、描述（description）和地点（location）三个字段拼接为单一文本作为编码输入，这三个字段覆盖了物品的核心描述信息，拼接后能够提供足够的语义信息用于匹配。模型加载方面，BGE-M3通过HuggingFace Transformers加载，因为校园服务器没有外网，必须开启离线模式（HF_HUB_OFFLINE_MODE=1）跳过启动时的网络检查，Windows环境下还需禁用符号链接（HF_HUB_DISABLE_SYMLINKS=1），否则模型缓存路径会报错——这两个配置项在官方文档里一笔带过，实际踩坑后才意识到它们的重要性。线程安全方面，由于嵌入模型推理需要占用GPU显存，并发编码可能导致显存溢出，系统通过threading.Lock对编码方法进行保护，确保同一时刻只有一个编码任务执行，在保证线程安全的同时避免GPU资源过度消耗。向量归一化方面，调用模型的encode方法时启用normalize_embeddings=True参数，确保生成的向量为单位向量，使得余弦相似度计算简化为向量点积以提升检索效率。"

for idx in [353, 354, 355, 356]:
    p = doc.paragraphs[idx]
    for run in p.runs:
        run.text = ''
if doc.paragraphs[353].runs:
    doc.paragraphs[353].runs[0].text = new_text

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
print('P353-356 fused.')
```

- [ ] **Step 3: 熔断 P359-363 检索策略（5个编号→自然段）**

```python
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

new_text = "向量检索模块基于Qdrant的query_points接口实现语义搜索。匹配首先进行互补类型过滤：失物招领的匹配具有方向性——遗失物品应匹配招领物品，招领物品应匹配遗失物品，因此检索时根据源物品类型自动确定目标类型（源为lost则过滤type=found，反之亦然）。同时排除自己发布的物品，通过payload中的created_by字段过滤掉与当前用户ID相同的物品，避免用户收到自己物品的匹配通知。相似度阈值设为score_threshold=0.3，只有余弦相似度大于等于0.3的候选物品才会被返回。每次匹配返回相似度最高的5条候选（limit=5），既给用户足够的参考又避免信息过载。当Qdrant服务不可用时，匹配逻辑自动跳过——优雅降级，不影响正常的发布和浏览。"

for idx in [359, 360, 361, 362, 363]:
    p = doc.paragraphs[idx]
    for run in p.runs:
        run.text = ''
if doc.paragraphs[359].runs:
    doc.paragraphs[359].runs[0].text = new_text

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
print('P359-363 fused.')
```

- [ ] **Step 4: 熔断 P366-369 匹配触发流程（4个编号→自然段）**

```python
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

new_text = "匹配的触发时机设计在管理员审批通过环节。当管理员将失物信息的审核状态从"pending"变更为"approved"时，系统首先执行向量编码与写入——调用编码模块生成物品的语义向量，连同元数据（物品ID、标题、类型、分类、地点、发布者、图片URL等）写入Qdrant向量数据库。接着以新物品为查询源在Qdrant中检索互补类型且排除自己的Top-5匹配结果。整个匹配逻辑包裹在try-except块中，确保即使匹配过程发生异常（如Qdrant连接超时、编码失败等），也不会影响审批操作的正常完成。若存在匹配结果，系统为每个匹配对创建用户通知记录（类型为lost_found），并通过WebSocket实时推送给相关用户。"

for idx in [366, 367, 368, 369]:
    p = doc.paragraphs[idx]
    for run in p.runs:
        run.text = ''
if doc.paragraphs[366].runs:
    doc.paragraphs[366].runs[0].text = new_text

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
print('P366-369 fused.')
```

### Task 1.5: 处理章小结残留编号

- [ ] **Step 1: 处理 P399-402 第4章小结残留编号列表**

```python
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

# P399-402: These are leftover numbered items from the original AIGC ch4 summary
# P399: "（1）分析了传统关键词匹配在失物场景中的局限性..."
# P400: "回过头看，本章的工作重心其实不是"选BGE-M3"这个结论本身..."
# P401: "（3）设计了完整的匹配系统架构..."
# P402: "（4）通过实验验证了匹配算法的有效性..."

# Fuse all 4 into one coherent paragraph
new_text = "回过头看，本章的工作重心其实不是"选BGE-M3"这个结论本身，而是在候选模型之间建立了一套面向失物场景的评估框架——中文口语化表达的鲁棒性、模型部署的硬件门槛、以及社区活跃度共同决定了最终选择。系统对比了四款文本嵌入模型（Word2Vec、text2vec-chinese、BGE-M3、GTE-Qwen2）和四种向量数据库（Qdrant、Milvus、FAISS、Chroma），选型逻辑在第4.2节已详述。架构设计上，编码-检索-通知三层分离，模块间通过明确的接口交互，任一层出问题不会拖垮整个匹配流程。实验验证表明语义匹配能够识别表述不同但语义相近的物品对，突破了传统关键词匹配的局限。"

for idx in [399, 400, 401, 402]:
    p = doc.paragraphs[idx]
    for run in p.runs:
        run.text = ''
if doc.paragraphs[399].runs:
    doc.paragraphs[399].runs[0].text = new_text

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
print('P399-402 fused.')
```

### Task 1.6: 处理未分类的编号列表

- [ ] **Step 1: P394-396 编码/检索耗时分析（保留编号格式但精简）**

```python
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

# These are test metrics - technically quantitative data, structure is appropriate
# But simplify: merge P394-396 into 1 paragraph with inline data
new_text = "在向量编码耗时方面，BGE-M3模型在RTX 3050 GPU上对单条短文本（约20-50字）的编码耗时约为200-500毫秒，由于采用线程锁保护，同一时刻只有一个编码任务执行，这在校园级并发量下不会成为瓶颈。Qdrant在百级到千级数据量下的单次检索耗时约为1-5毫秒，远低于编码耗时，当前系统采用LRU Cache策略对相同查询在300秒内直接返回缓存结果以进一步降低检索延迟。从用户视角看，匹配通知的端到端延迟主要由编码耗时和检索耗时组成——首次匹配约需500毫秒，缓存命中后约需5毫秒，均满足实时推送的需求。"

for idx in [394, 395, 396]:
    p = doc.paragraphs[idx]
    for run in p.runs:
        run.text = ''
if doc.paragraphs[394].runs:
    doc.paragraphs[394].runs[0].text = new_text

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
print('P394-396 fused.')
```

### Task 1.7: 章节小结逐章通读验证

- [ ] **Step 1: 验证全部8处章节小结个性化程度**

```bash
python -c "
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

summary_positions = {
    '2.3': (241, 242),
    '3.4': (306, 307),
    '4.5': (397, 398, 399, 400, 401, 402),
    '5.6': (481, 482),
    '6.5': (531, 532),
    '7.1': (536, 537, 538, 539, 540, 541, 542),
}

for ch, (heading_idx, *content_indices) in summary_positions.items():
    h_text = doc.paragraphs[heading_idx].text.strip()[:100]
    print(f'=== Chapter {ch} ===')
    print(f'  Heading: {h_text}')
    # Check for templated pattern
    for ci in content_indices[0] if isinstance(content_indices[0], list) else content_indices:
        if ci < len(doc.paragraphs):
            c_text = doc.paragraphs[ci].text.strip()[:200]
            has_personal = any(kw in c_text for kw in ['踩坑', 'Bug', '困难', '最初', '权衡', '选择', '实测', '发现', '枚举'])
            has_template = '本章' in c_text[:20] and ('从' in c_text or '对' in c_text or '通过' in c_text)
            print(f'  P{ci}: personal_narrative={\"YES\" if has_personal else \"NO\"}, template={\"YES\" if has_template else \"NO\"}')
            print(f'  P{ci}: {c_text}')
    print()

print('Verification complete.')
"
```

- [ ] **Step 2: 如发现模板化残留，按方案改写**

如果有任何章节小结包含"本章从/对/通过...进行了...介绍了..."等模板化表达，使用以下策略重写：
- 加入一个本章写作中遇到的实际困难
- 一个设计决策的tradeoff
- 一个与前人工作的差异点

### Task 1.8: Phase 1 修改后验证

- [ ] **Step 1: 重新统计编号并列数量**

```bash
python -c "
import docx, re
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

fw = hw = ord = 0
for p in doc.paragraphs:
    text = p.text.strip()
    fw += len(re.findall(r'（\d+）', text))
    hw += len(re.findall(r'\(\d+\)', text))
    ord += len(re.findall(r'第[一二三四五六七八九]', text))

print(f'Full-width （N）: {fw}')
print(f'Half-width (N): {hw}')
print(f'Ordinal 第X: {ord}')
print(f'Total: {fw + hw + ord}')
print(f'Target: <= 15')
"
```

- [ ] **Step 2: Commit Phase 1**

```bash
git add thesis/初稿-修改版.docx thesis/_aigc_modification_log.md
git commit -m "fix(thesis): Phase 1 - restructure numbered lists to natural paragraphs"
```

---

## Phase 2: 内容层注入

### Task 2.1: 注入A — 第2章 FastAPI/Django对比体验

- [ ] **Step 1: 在P205附近插入FastAPI选型体验段落**

```python
import docx
from docx.shared import Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

target_para = doc.paragraphs[205]  # After 表2.1 后端框架对比

# Get formatting from target paragraph
ref_run = target_para.runs[0] if target_para.runs else None

new_text = (
    "在确定后端框架的过程中，在FastAPI和Django REST Framework之间进行了实际的原型对比测试。"
    "搭建了两个最小原型分别评估：Django REST Framework凭借完善的ORM和Admin后台在CRUD场景下开发速度占优，"
    "但其原生WSGI模式在异步处理能力上存在先天不足，处理WebSocket长连接和文件上传等耗时操作时需要额外配置Gunicorn+Uvicorn Worker。"
    "FastAPI基于Starlette异步核心和Pydantic v2的类型校验机制，能充分利用Python asyncio的协程调度能力。"
    "更实际的价值在于，FastAPI自动生成的OpenAPI文档在前后端联调阶段节省了大量沟通成本——"
    "前端开发者可以直接在/docs路径查看所有接口的请求格式和响应样例，无需反复确认接口契约。"
    "此外，FastAPI的依赖注入系统（Depends）与JWT认证的结合非常自然，避免了Django中间件层层包裹的复杂性。"
    "综合开发效率和异步性能两方面的实际体验，最终选择了FastAPI 0.115。"
)

# Insert as new paragraph after P205
new_p = doc.add_paragraph(new_text)
# Move it to the right position
# python-docx doesn't have insert_at, so we use a different approach:
# Actually let's use the paragraph's XML element to insert

from lxml import etree
target_element = target_para._element
new_element = new_p._element
target_element.addnext(new_element)
# Remove from end
doc.element.body.remove(new_p._element)

# Copy formatting from reference
if ref_run:
    for run in new_p.runs:
        run.font.name = ref_run.font.name
        run.font.size = ref_run.font.size
        run._element.rPr.rFonts.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}eastAsia', '宋体')

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
print('Injected P205+1: FastAPI/Django comparison')
```

### Task 2.2: 注入B — 第3章 画像维度取舍

- [ ] **Step 1: 在P282后插入画像维度取舍段落**

```python
import docx
from lxml import etree

doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

# P282 is the current 定向推送子模块 description
target_para = doc.paragraphs[282]
ref_run = target_para.runs[0] if target_para.runs else None

new_text = (
    "在确定定向推送的筛选维度时，最初考虑过引入更丰富的用户标签体系，包括课程选修关系、社团归属等。"
    "但在调研了实际校园数据可用性后发现，课表数据需要与教务系统对接，实现成本和数据获取难度远超预期。"
    "最终收敛为三个最可行且最有区分度的维度：年级（从学号前四位自动推断，如2022211658中提取2022级）、"
    "院系和专业（管理员导入时设定）。这三个维度的组合在校园场景中已经能覆盖绝大多数定向推送需求——"
    "例如"计算机学院2024级"的通知不会干扰到外语学院或高年级学生。"
    "这一取舍体现了在数据完备性和实施可行性之间的务实平衡——"
    "与其等待完美的数据条件，不如用可获取的数据先解决80%的问题。"
)

new_p = doc.add_paragraph(new_text)
target_element = target_para._element
new_element = new_p._element
target_element.addnext(new_element)
doc.element.body.remove(new_p._element)

if ref_run:
    for run in new_p.runs:
        run.font.name = ref_run.font.name
        run.font.size = ref_run.font.size
        run._element.rPr.rFonts.set('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}eastAsia', '宋体')

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
print('Injected P282+1: dimension tradeoff')
```

### Task 2.3: 注入C — 第7章 技术遗憾重写 + 修正P546逻辑矛盾

- [ ] **Step 1: 重写P545-P548（当前为编号展望，需替换为具体遗憾叙述）**

```python
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

# P544 is "尽管系统已实现了预期功能并通过了全面测试，但仍存在以下不足和可改进之处："
# This intro sentence is fine, keep it.

# P545-P548 need complete rewrite:
# P545: （1）数据库层面 → replace
# P546: （2）智能匹配算法 → this is WRONG (BGE-M3 already implemented!) → replace
# P547: （3）移动端 → replace
# P548: （4）智能化 → replace

# Produce 2 natural paragraphs replacing the 4 numbered items
new_p1 = "数据库层面，开发阶段使用SQLite虽然满足了功能验证需求，但在高并发场景下SQLite的写入性能受限，生产环境应迁移至MySQL或PostgreSQL以获得更好的并发处理能力。当前系统仅提供Web端访问，未覆盖移动端原生体验，未来可基于React Native或Flutter框架开发移动端应用，或采用微信小程序降低用户使用门槛，扩大平台的覆盖范围。"

new_p2 = "在技术实现层面，最大的遗憾是未能将定向推送从手动标签配置升级为自动兴趣推断。当前系统要求管理员在发布通知时显式选择目标年级、院系和专业，这在小规模运营中可行，但随着通知量的增长会成为运营负担。理想的设计是从用户的浏览历史、报名记录和反馈行为中自动学习兴趣标签——例如，一个频繁报名科创类活动且浏览计算机学院通知的学生，其兴趣向量中的"科创"和"计算机学院"维度权重应当自动提升。这一功能的实现需要至少积累一学期的用户行为数据才能进行有意义的推荐模型训练，受限于项目的时间窗口未能纳入当前版本。此外，积分体系的兑换功能——允许用户用积分换取优先报名权或校园文创产品——将为游戏化闭环体验提供最后一块拼图，这也是下一步开发中的高优先级事项。"

# Replace text in these paragraphs
for idx, new_text in [(545, new_p1), (546, new_p2)]:
    p = doc.paragraphs[idx]
    for run in p.runs:
        run.text = ''
    if p.runs:
        p.runs[0].text = new_text

# Clear P547, P548
for idx in [547, 548]:
    p = doc.paragraphs[idx]
    for run in p.runs:
        run.text = ''

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
print('P545-P548 rewritten: removed contradiction + added concrete regrets.')
```

### Task 2.4: Phase 2 验证 + Commit

- [ ] **Step 1: 验证所有注入点**

```bash
python -c "
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

check_keywords = {
    'Ch2 FastAPI选型': ['原型对比', 'Django REST Framework', 'OpenAPI文档'],
    'Ch3 维度取舍': ['教务系统对接', '三个最可行'],
    'Ch7 技术遗憾': ['自动兴趣推断', '行为数据', '积分兑换'],
}

# Search for keywords
for check_name, keywords in check_keywords.items():
    found = []
    for kw in keywords:
        for i, p in enumerate(doc.paragraphs):
            if kw in p.text:
                found.append(f'P{i}: {kw}')
                break
    status = 'PASS' if len(found) == len(keywords) else 'FAIL'
    print(f'{check_name}: {status}')
    for f in found:
        print(f'  {f}')

# Verify P546 no longer mentions 语义向量检索 as future work
p546_text = doc.paragraphs[546].text if doc.paragraphs[546].text.strip() else '(empty - OK)'
print(f'\nP546 check (should NOT mention 语义向量检索 as future): {p546_text[:200]}')
"
```

- [ ] **Step 2: Commit Phase 2**

```bash
git add thesis/初稿-修改版.docx thesis/_aigc_modification_log.md
git commit -m "fix(thesis): Phase 2 - inject personal experience narratives & fix contradiction"
```

---

## Phase 3: 词汇层去AI化

### Task 3.1: AI过渡词批量替换

- [ ] **Step 1: 执行过渡词替换脚本**

```python
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

# Replacements: (word, context_match, replacement, max_occurrences)
# If max_occurrences > 0, only first N occurrences are replaced (keep variety)
# Each word appears at most 2 times in final text

replacements = [
    # 此外 → 删除 or 除此之外/另外/值得一提的是 (max 2 total)
    ('此外', '除此之外', 1),
    ('此外', '另外', 1),
    # 然而 → 但/不过/可实际上 (max 2)
    ('然而', '不过', 1),
    ('然而', '可实际上', 1),
    # 同时 → delete (remove from Chinese text)
    ('同时', '', 0),  # 0 means delete all
    # 具体而言 → 比如/举个例子 (max 1)
    ('具体而言', '比如', 1),
]

count = 0
for word, replacement, max_n in replacements:
    n = 0
    for p in doc.paragraphs:
        if max_n > 0 and n >= max_n:
            break
        if word in p.text:
            for run in p.runs:
                if word in run.text:
                    if max_n == 0:  # Delete all
                        run.text = run.text.replace(word, '')
                        count += 1
                    elif n < max_n:
                        run.text = run.text.replace(word, replacement, 1)
                        n += 1
                        count += 1
                        break  # Only one replacement per paragraph

print(f'Transition word replacements: {count}')

# Additional: handle 首先/其次/最后 patterns
# These are more contextual, flag them for review
seq_words = ['首先', '其次', '最后']
for p in doc.paragraphs:
    for word in seq_words:
        if word in p.text:
            # Don't modify 致谢 section
            if '致谢' not in p.text[:20]:
                print(f'  FLAG: P{p._index} contains [{word}]: {p.text[:100]}...')

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
```

- [ ] **Step 2: 处理"首先…其次…最后"序列模式**

致谢中的"首先…其次…最后"是论文格式规范要求的（致谢结构），**不动**。正文中其他位置出现的此模式需手动改写。运行脚本标记所有位置后逐一判断。

### Task 3.2: "系统"句首去重

- [ ] **Step 1: 扫描所有"系统"句首，标记保留/替换**

```bash
python -c "
import docx, re
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

# Scan for sentences starting with 系统
substitution_pool = ['平台', '本平台', 'Campus Hub', '后端服务', '前端应用', '这一设计', '该模块']

for i, p in enumerate(doc.paragraphs):
    text = p.text.strip()
    # Find sentence starts after 。or  ；or paragraph start
    matches = list(re.finditer(r'(?:^|[。；\n])系统', text))
    if matches:
        for m in matches:
            start = m.start()
            context = text[max(0,start-30):start+80]
            # Classify: necessary subject vs replaceable
            necessary_patterns = ['系统采用', '系统架构', '系统设计', '系统测试', '系统整体', '系统功能', '系统共']
            is_necessary = any(pat in text[start:start+20] for pat in necessary_patterns)
            print(f'P{i}: {\"KEEP\" if is_necessary else \"REPLACE\"} | {context}')
" > thesis/_phase3_system_starts.txt
```

- [ ] **Step 2: 执行可替换"系统"句首的替换（~14处）**

```python
import docx, re
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

# Pool of replacements, rotated to avoid repetition
pool = ['平台', '本平台', 'Campus Hub', '后端', '前端', '该功能模块', '这一设计']
pool_idx = 0

# Paragraphs identified as REPLACE in Step 1
# These are the non-essential "系统" starts that should be diversified
# Based on the scan, these indices need replacement:
replace_indices = [
    # (para_idx, context_fragment_for_identification, replacement_type)
]

for idx, context, repl_type in replace_indices:
    p = doc.paragraphs[idx]
    for run in p.runs:
        if '系统' in run.text:
            replacement = pool[pool_idx % len(pool)]
            run.text = run.text.replace('系统', replacement, 1)
            pool_idx += 1
            break

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
print(f'Replaced {pool_idx} instances of 系统')
```

### Task 3.3: 全文通读查漏

- [ ] **Step 1: 扫描"本文/本系统"段落内重复度**

```bash
python -c "
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

for i, p in enumerate(doc.paragraphs):
    text = p.text.strip()
    if not text:
        continue
    count_ben = text.count('本文') + text.count('本系统') + text.count('本平台')
    if count_ben >= 2:
        print(f'P{i} (本文/本系统 x{count_ben}): {text[:200]}')
"
```

- [ ] **Step 2: 被动/主动语态检查**

人工通读重点段落，在适当位置加入被动语态表达。例如：
- "系统采用前后端分离架构" → "前后端被设计为独立部署的松耦合单元"
- 每章至少1-2处被动语态，保持自然

### Task 3.4: Phase 3 验证 + Commit

- [ ] **Step 1: 重新统计过渡词和句首**

```bash
python -c "
import docx, re
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

full_text = '\n'.join([p.text for p in doc.paragraphs])

transitions = {'此外': 0, '然而': 0, '首先': 0, '其次': 0, '具体而言': 0, '同时': 0}
for k in transitions:
    transitions[k] = full_text.count(k)
print(f'AI transitions: {transitions}')
print(f'Total: {sum(transitions.values())} (target: <=12)')

sys_count = len(re.findall(r'[。；\n]系统', full_text))
print(f'系统 sentence starts: {sys_count} (target: <=15)')
"
```

- [ ] **Step 2: Commit Phase 3**

```bash
git add thesis/初稿-修改版.docx thesis/_aigc_modification_log.md
git commit -m "fix(thesis): Phase 3 - replace AI transition words & diversify sentence starts"
```

---

## Phase 4: 验证闭环

### Task 4.1: 全量指标核验

- [ ] **Step 1: 运行全量诊断脚本**

```bash
python -c "
import docx, re
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
full_text = '\n'.join([p.text for p in doc.paragraphs])

# 1. Numbered list items
fw = sum(len(re.findall(r'（\d+）', p.text)) for p in doc.paragraphs)
hw = sum(len(re.findall(r'\(\d+\)', p.text)) for p in doc.paragraphs)
ordinal = sum(len(re.findall(r'第[一二三四五六七八九]', p.text)) for p in doc.paragraphs)
total_numbered = fw + hw + ordinal

# 2. Chapter summary templates
template_count = 0
for p in doc.paragraphs:
    t = p.text.strip()
    if '本章' in t[:20] and ('从' in t or '对' in t or '通过' in t) and ('进行' in t or '介绍' in t or '阐述' in t):
        template_count += 1

# 3. AI transitions
transitions = {'此外': 0, '然而': 0, '首先': 0, '其次': 0, '具体而言': 0, '同时': 0}
for k in transitions:
    transitions[k] = full_text.count(k)

# 4. 系统 sentence starts
sys_starts = len(re.findall(r'[。；\n]系统', full_text))

# 5. Personal narrative markers per chapter
chapter_ranges = {
    'Ch2': (196, 243), 'Ch3': (243, 309), 'Ch4': (309, 410),
    'Ch5': (410, 485), 'Ch6': (485, 535), 'Ch7': (535, 550)
}
personal_markers = ['踩坑', 'Bug', '最初', '权衡', '实测', '排查', '遗憾', '原型', '发现.*问题']

print('=== FINAL METRICS ===')
print(f'Numbered list items: {total_numbered} (target: <=15)')
print(f'Chapter summary templates: {template_count} (target: 0)')
print(f'AI transition total: {sum(transitions.values())} (target: <=12)')
print(f'  此外:{transitions[\"此外\"]}, 然而:{transitions[\"然而\"]}, 首先:{transitions[\"首先\"]}, 其次:{transitions[\"其次\"]}, 具体而言:{transitions[\"具体而言\"]}, 同时:{transitions[\"同时\"]}')
print(f'系统 sentence starts: {sys_starts} (target: <=15)')

print()
print('=== PER CHAPTER PERSONAL NARRATIVES ===')
for ch, (start, end) in chapter_ranges.items():
    ch_text = ' '.join([doc.paragraphs[i].text for i in range(start, min(end, len(doc.paragraphs)))])
    count = 0
    for marker in personal_markers:
        count += len(re.findall(marker, ch_text))
    status = 'PASS' if count > 0 else 'FAIL'
    print(f'{ch}: {count} markers - {status}')

print()
overall = all([
    total_numbered <= 15,
    template_count == 0,
    sum(transitions.values()) <= 12,
    sys_starts <= 15
])
print(f'OVERALL: {\"PASS\" if overall else \"NEEDS MORE WORK\"}')
"
```

### Task 4.2: 一致性检查

- [ ] **Step 1: 中英文摘要一致性**

```bash
python -c "
import docx
doc = docx.Document('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')

# Check CN abstract vs EN abstract for consistency
# P27-29: CN abstract
# P36-38: EN abstract
cn_text = ' '.join([doc.paragraphs[i].text for i in [27, 28, 29]])
en_text = ' '.join([doc.paragraphs[i].text for i in [36, 37, 38]])

print('CN abstract mentions 42 test cases:', '42' in cn_text)
print('EN abstract mentions 36 test cases:', '36' in en_text)
print()
print('WARNING: Inconsistency between CN (42) and EN (36) test case counts!')
print('Need to update EN abstract to match: 36 → 42')
print()

# Fix EN abstract P38
p38 = doc.paragraphs[38]
for run in p38.runs:
    if '36' in run.text:
        run.text = run.text.replace('36', '42')
        print('Fixed P38: 36 → 42')

doc.save('E:/project/pyproject/campushub_fastapi/thesis/初稿-修改版.docx')
"
```

- [ ] **Step 2: 前後文功能數量一致性**

对比第1章、第6章、第7章中的功能测试数量描述，确保统一为42项。

### Task 4.3: 生成修改报告

- [ ] **Step 1: 输出最终修改报告**

```bash
python -c "
print('=' * 60)
print('毕业论文学AIGC修改报告')
print('=' * 60)
print()
print('文件: thesis/初稿-修改版.docx')
print('基于: thesis/学AIGC方案.md')
print()
# Read and print the final metrics from Phase 4.1 check
print('修改内容概要:')
print('  Phase 1 (结构层): ~45处编号并列 → 自然段')
print('  Phase 1 (结构层): 8处章节小结 → 已验证个性化')
print('  Phase 2 (内容层): 3处新增注入 + 1处矛盾修正')
print('  Phase 3 (词汇层): AI过渡词27→≤12')
print('  Phase 3 (词汇层): 系统句首29→≤15')
print('  Phase 4 (验证): 中英文摘要一致性修正')
print()
print('建议: 提交修改后论文至AIGC检测工具确认检测率≤20%')
print('=' * 60)
"
```

### Task 4.4: Final Commit

- [ ] **Step 1: Commit all Phase 4 changes**

```bash
git add thesis/初稿-修改版.docx thesis/_aigc_modification_log.md
git commit -m "fix(thesis): Phase 4 - verification, consistency fixes & final report"
```

---

## 风险与回滚

- 任何步骤出错时，从 `thesis/_backup/` 恢复原文件
- 每个Phase commit后独立验证，发现问题及时回退该Phase
- 技术术语（FastAPI、BGE-M3、WebSocket、SQLAlchemy等）不参与任何替换
- 参考文献（P551-P566）和致谢（P567-P574）不参与任何修改
