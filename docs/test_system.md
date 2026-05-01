# 测试体系文档

> 接口正确性测试 + 响应时间测试 + 并发访问测试
> 日期：2026-04-07 | 工具：pytest 8.3.4 + pytest-asyncio 0.24.0 + httpx

---

## 1. 测试目标

依据需求文档第6条：

> 对平台接口的正确性、响应时间和并发访问能力进行初步测试，并提出优化建议。

## 2. 测试环境

| 项目 | 配置 |
|------|------|
| 操作系统 | Windows 11 Home 10.0.22631 |
| Python | 3.12.2 |
| 测试框架 | pytest 8.3.4 + pytest-asyncio 0.24.0 |
| HTTP 客户端 | httpx（异步） |
| 后端 | FastAPI 0.115 + aiosqlite + SQLite |
| 测试模式 | 连接已运行的后端服务（非 ASGI 模拟） |
| 运行命令 | `python -m pytest tests/ -v` |

## 3. 测试文件结构

```
backend/
├── tests/
│   ├── conftest.py              # 共享 fixtures（client, tokens, headers）
│   ├── pytest.ini               # pytest 配置（asyncio_mode=auto）
│   ├── test_api_functional.py   # 4 功能测试（36项）
│   └── test_api_performance.py  # 5 性能测试（9项）
```

## 4. 功能测试（接口正确性）

### 4.1 认证模块（8项）

| 测试用例 | 输入 | 预期结果 |
|----------|------|----------|
| 管理员登录 | admin@campus.edu + admin123 | 200, 返回 access_token |
| 学生登录 | student@campus.edu + student123 | 200, role="user" |
| 学号登录 | 2021008822 + student123 | 200 |
| 错误密码 | admin@campus.edu + wrong | 401 |
| 不存在用户 | no@one.com + xxx | 401 |
| 注册新用户 | 唯一邮箱+学号 | 201 |
| 重复邮箱注册 | admin@campus.edu | 400 |
| 登出 | POST /api/auth/logout | 200 |

### 4.2 通知模块（4项）

| 测试用例 | 权限 | 预期 |
|----------|------|------|
| 获取通知列表 | 公开 | 200, 返回列表 |
| 创建通知 | 管理员 | 201 |
| 创建通知 | 普通用户 | 403 |
| 创建通知 | 未登录 | 401/403 |

### 4.3 活动模块（3项）

| 测试用例 | 权限 | 预期 |
|----------|------|------|
| 获取活动列表 | 公开 | 200 |
| 按分类筛选 | category=lecture | 200 |
| 创建活动 | 管理员 | 201 |

### 4.4 失物招领模块（4项）

| 测试用例 | 权限 | 预期 |
|----------|------|------|
| 获取列表 | 登录用户 | 200 |
| 按类型筛选 | type=lost | 200 |
| 创建失物 | 登录用户 | 201 |
| 创建失物 | 未登录 | 401/403 |

### 4.5 用户通知模块（4项）

| 测试用例 | 预期 |
|----------|------|
| 获取个人通知 | 200, 返回列表 |
| 未读数查询 | 200, 含 unread_count |
| 标记单条已读 | 200 |
| 全部标记已读 | 200/405 |

### 4.6 个人中心模块（3项）

| 测试用例 | 预期 |
|----------|------|
| 查看个人资料 | 200 |
| 更新个人资料 | 200 |
| 未登录访问 | 401/403 |

### 4.7 统一搜索模块（7项）

| 测试用例 | 输入 | 预期 |
|----------|------|------|
| 搜索通知 | q=考试 | 200, counts.notifications ≥ 1 |
| 搜索活动 | q=音乐 | 200, counts.activities ≥ 1 |
| 搜索失物 | q=耳机 | 200, counts 字段存在 |
| 按类型过滤 | q=校园&type=activities | 所有结果 type="activity" |
| 相关性排序 | q=校园 | 结果按 score 降序 |
| 空查询 | q="" | 422 |
| 评分字段 | q=考试 | 每条结果 score > 0 |

### 4.8 Feed 聚合模块（3项）

| 测试用例 | 预期 |
|----------|------|
| 获取信息流 | 200, 含 items + total |
| 多类型混合 | items 中 type ≥ 2 种 |
| 字段完整性 | 每条含 id, type, title, tag, time |

### 4.9 功能测试结果

**36 项测试全部通过**，总耗时 48.03s。

pytest 原始输出：

```
tests/test_api_functional.py::TestAuth::test_login_admin_success PASSED             [  2%]
tests/test_api_functional.py::TestAuth::test_login_student_success PASSED           [  5%]
tests/test_api_functional.py::TestAuth::test_login_by_student_id PASSED            [  8%]
tests/test_api_functional.py::TestAuth::test_login_wrong_password PASSED           [ 11%]
tests/test_api_functional.py::TestAuth::test_login_nonexistent_user PASSED         [ 13%]
tests/test_api_functional.py::TestAuth::test_register_success PASSED               [ 16%]
tests/test_api_functional.py::TestAuth::test_register_duplicate_email PASSED       [ 19%]
tests/test_api_functional.py::TestAuth::test_logout PASSED                         [ 22%]
tests/test_api_functional.py::TestNotifications::test_list_notifications PASSED    [ 25%]
tests/test_api_functional.py::TestNotifications::test_create_notification_admin PASSED [ 27%]
tests/test_api_functional.py::TestNotifications::test_create_notification_user_forbidden PASSED [ 30%]
tests/test_api_functional.py::TestNotifications::test_create_notification_no_auth PASSED     [ 33%]
tests/test_api_functional.py::TestActivities::test_list_activities PASSED          [ 36%]
tests/test_api_functional.py::TestActivities::test_list_activities_by_category PASSED [ 38%]
tests/test_api_functional.py::TestActivities::test_create_activity_admin PASSED    [ 41%]
tests/test_api_functional.py::TestLostItems::test_list_lost_items PASSED           [ 44%]
tests/test_api_functional.py::TestLostItems::test_list_lost_items_by_type PASSED   [ 47%]
tests/test_api_functional.py::TestLostItems::test_create_lost_item_user PASSED     [ 50%]
tests/test_api_functional.py::TestLostItems::test_create_lost_item_no_auth PASSED   [ 52%]
tests/test_api_functional.py::TestUserNotifications::test_get_my_notifications PASSED [ 55%]
tests/test_api_functional.py::TestUserNotifications::test_unread_count PASSED      [ 58%]
tests/test_api_functional.py::TestUserNotifications::test_mark_read PASSED         [ 61%]
tests/test_api_functional.py::TestUserNotifications::test_mark_read_all PASSED     [ 63%]
tests/test_api_functional.py::TestUserProfile::test_get_profile PASSED             [ 66%]
tests/test_api_functional.py::TestUserProfile::test_update_profile PASSED          [ 69%]
tests/test_api_functional.py::TestUserProfile::test_get_profile_no_auth PASSED     [ 72%]
tests/test_api_functional.py::TestSearch::test_search_has_results PASSED           [ 75%]
tests/test_api_functional.py::TestSearch::test_search_activities PASSED            [ 77%]
tests/test_api_functional.py::TestSearch::test_search_lost_items PASSED            [ 80%]
tests/test_api_functional.py::TestSearch::test_search_filter_type PASSED           [ 83%]
tests/test_api_functional.py::TestSearch::test_search_relevance_ordering PASSED    [ 86%]
tests/test_api_functional.py::TestSearch::test_search_empty_query PASSED           [ 88%]
tests/test_api_functional.py::TestSearch::test_search_results_have_score PASSED    [ 91%]
tests/test_api_functional.py::TestFeed::test_feed_latest PASSED                    [ 94%]
tests/test_api_functional.py::TestFeed::test_feed_has_multiple_types PASSED        [ 97%]
tests/test_api_functional.py::TestFeed::test_feed_items_have_required_fields PASSED [100%]

======================= 36 passed, 1 warning in 48.03s ========================
```

## 5. 性能测试（响应时间 + 并发）

### 5.1 测试方法

- **响应时间**：对每个接口进行 **10 轮连续采样**，记录每轮响应时间，统计平均值、标准差、最小值、最大值
- **并发测试**：使用 `asyncio.gather` 模拟 **50 个并发用户**，每个场景跑 **5 轮**，统计各轮总耗时

### 5.2 响应时间测试

**标准：所有接口响应时间 < 500ms**

| 接口 | 平均值 | 标准差 | 最小值 | 最大值 |
|------|--------|--------|--------|--------|
| GET /api/feed/latest | 15.4 ms | ±2.5 | 13.8 ms | 22.5 ms |
| GET /api/notifications | 10.2 ms | ±1.0 | 9.2 ms | 12.3 ms |
| GET /api/activities | 10.5 ms | ±0.7 | 9.7 ms | 11.5 ms |
| GET /api/search?q=校园 | 13.6 ms | ±0.6 | 12.8 ms | 14.7 ms |
| POST /api/auth/login | 276.4 ms | ±24.8 | 262.3 ms | 346.0 ms |
| GET /api/search?q=考试 | 14.2 ms | ±0.6 | 13.3 ms | 15.0 ms |

> **说明**：登录接口平均耗时 276.4 ms，明显高于其他接口。这是因为登录过程需要使用 bcrypt 算法对用户密码进行哈希验证（bcrypt 的工作因子为 12，单次哈希约需 250-300ms），属于密码学安全机制的正常开销，不影响用户体验。

### 5.3 并发访问测试

**场景：50 个用户同时发起请求，每个场景跑 5 轮**

| 测试场景 | 平均总耗时 | 标准差 | 最小值 | 最大值 | 平均单请求 |
|----------|-----------|--------|--------|--------|-----------|
| 并发 Feed 请求 | 529.2 ms | ±34.7 | 493.9 ms | 586.7 ms | 10.6 ms |
| 并发搜索请求 | 447.9 ms | ±40.3 | 410.0 ms | 509.6 ms | 9.0 ms |
| 并发混合请求 | 390.9 ms | ±14.8 | 376.3 ms | 415.5 ms | 7.8 ms |

> **说明**：并发混合请求平均单请求耗时最低（7.8 ms），这是因为混合场景中包含了响应时间较快的通知列表接口（约 10ms）和活动列表接口（约 10ms），拉低了整体平均值。

### 5.4 性能测试结论

- 所有公开接口响应时间均在 500ms 以内，符合需求文档要求
- 查询类接口（Feed、通知、活动、搜索）平均响应时间 10-15ms，性能良好
- 登录接口因 bcrypt 密码哈希安全机制，平均耗时 276ms，属于合理范围
- 50 并发请求下系统稳定，5 轮测试中无任何请求失败，各轮耗时的标准差在 15-40ms 之间，波动较小
- 优化建议：
  1. 登录接口可考虑缓存热点用户的密码哈希，或引入 JWT Token 刷新机制减少重复登录
  2. 搜索接口可引入 Redis 缓存热门查询词的结果
  3. 生产环境建议使用 MySQL 替代 SQLite 以获得更好的并发读写性能

## 6. 修复的 Bug

测试过程中发现并修复了 1 个 Bug：

| Bug | 位置 | 原因 | 修复 |
|-----|------|------|------|
| Feed 500 错误 | `app/api/feed.py:110` | `item.item_type` 属性不存在 | 改为 `item.type` |
