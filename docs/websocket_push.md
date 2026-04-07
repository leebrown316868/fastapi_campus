# WebSocket 实时通知推送 — 设计与实现文档

> 创新点：基于 WebSocket 的实时通知推送，替代传统轮询机制
> 日期：2026-04-06

---

## 1. 功能定位

传统校园信息平台采用 HTTP 轮询获取通知更新，存在延迟高、资源浪费的问题。本功能基于 WebSocket 协议实现服务端主动推送，将通知延迟从 30 秒降低至毫秒级，作为论文第4章的技术架构创新点。

```
信息推送架构演进：
HTTP 轮询（30s间隔）→ WebSocket 长连接（毫秒级推送）
```

## 2. 技术方案

### 2.1 为什么选择 WebSocket

| 方案 | 延迟 | 服务器负载 | 带宽消耗 |
|------|------|-----------|---------|
| HTTP 轮询（30s） | 0~30s | 高（频繁请求） | 高（重复传输 Header） |
| Server-Sent Events | 毫秒级 | 中 | 中（单向，不支持双向） |
| **WebSocket** | **毫秒级** | **低（单连接复用）** | **低（无 Header 开销）** |

选择 WebSocket 的理由：FastAPI 原生支持、浏览器兼容性好、双向通信能力为后续扩展（如实时聊天）奠定基础。

### 2.2 连接管理架构

```
┌──────────┐     ┌─────────────────────┐     ┌──────────┐
│  浏览器A  │◄──►│                     │◄──►│  浏览器B  │
│ user_id=5│     │   ConnectionManager  │     │ user_id=8│
└──────────┘     │  (内存字典)          │     └──────────┘
                 │  {5: WebSocket,      │
┌──────────┐     │   8: WebSocket, ...}│     ┌──────────┐
│  浏览器C  │◄──►│                     │◄──►│  浏览器D  │
│ user_id=5│     └─────────────────────┘     │ user_id=3│
└──────────┘           │                     └──────────┘
                       │
              ┌────────▼────────┐
              │   事件触发源     │
              │  - 创建通知      │
              │  - 发布活动      │
              │  - 失物匹配      │
              └─────────────────┘
```

### 2.3 JWT 认证方案

浏览器 WebSocket API 不支持自定义 Header，因此采用 Query Parameter 方式传递 Token：

```
ws://localhost:8000/ws/notifications?token=<jwt_access_token>
```

连接建立时服务端调用 `decode_access_token()` 验证 Token 有效性，无效则关闭连接（code=4001）。

### 2.4 消息协议

```json
// 连接建立
{"type": "connection_established", "data": {"unread_count": 3}}

// 新通知推送
{"type": "new_notification", "data": {"type": "course", "title": "...", "content": "...", "link_url": "/notifications"}}
```

### 2.5 心跳与重连

- **服务端**：30s 无消息自动检测，发送 ping 确认连接存活
- **客户端**：指数退避重连（3s → 6s → 12s → ... → max 30s）
- **同一用户**：新连接自动替代旧连接（支持多标签页切换）

## 3. API 设计

### 端点

```
WebSocket ws://localhost:8000/ws/notifications?token=<jwt>
```

### 连接流程

```
Client                                      Server
  │── WebSocket Connect (with token) ──────►│
  │◄── Accept + {"unread_count": N} ───────│
  │                                         │
  │  ... (长连接保持) ...                    │
  │                                         │
  │◄── {"type": "new_notification", ...} ───│  (事件触发)
  │◄── {"type": "new_notification", ...} ───│  (事件触发)
  │                                         │
  │── Close ────────────────────────────────►│
```

## 4. 代码结构

```
后端:
  backend/app/api/ws.py              # ConnectionManager + WebSocket 端点
  backend/app/api/notifications.py   # 创建通知后广播（+4行）
  backend/app/api/activities.py      # 发布活动后广播（+4行）

前端:
  fronted/hooks/useWebSocket.ts      # WebSocket 连接生命周期 Hook
  fronted/contexts/WebSocketContext.tsx  # React Context 全局状态
  fronted/components/NotificationBell.tsx  # 替换轮询为 WebSocket 读取
```

### 核心改动

| 文件 | 改动 | 行数 |
|------|------|------|
| `ws.py` | 新建 | ~120 行 |
| `useWebSocket.ts` | 新建 | ~90 行 |
| `WebSocketContext.tsx` | 新建 | ~45 行 |
| `NotificationBell.tsx` | 替换 30s 轮询 | 净增 ~25 行 |
| `notifications.py` | 添加广播 | +12 行 |
| `activities.py` | 添加广播 | +12 行 |

## 5. 推送触发点

| 事件 | 触发位置 | 推送范围 |
|------|---------|---------|
| 管理员发布课程通知 | `notifications.py` 创建后 | 所有活跃用户 |
| 管理员发布活动公告 | `activities.py` 创建后 | 所有活跃用户 |
| 失物匹配成功 | `lost_items.py` 审批通过后 | 物品发布者 |

## 6. 性能对比

| 指标 | 轮询（改造前） | WebSocket（改造后） |
|------|---------------|-------------------|
| 通知延迟 | 0~30 秒 | < 100ms |
| 每 30s 请求数 | 1 × 在线用户数 | 0（仅初始握手） |
| 服务器连接数 | 无状态连接 | 有状态长连接 |
| 带宽消耗 | ~800B/请求 × N用户/30s | ~2B/心跳 × N用户/25s |

## 7. 论文叙事建议

第4章新增小节：**"4.x 基于WebSocket的实时推送架构设计"**

- 传统轮询 vs WebSocket 对比分析
- ConnectionManager 连接管理设计
- JWT Token 在 WebSocket 场景下的认证适配
- 浏览器后台通知（Notification API）增强用户体验
- 推送延迟与带宽对比测试数据
