# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Campus Hub (校园信息聚合平台) - A comprehensive campus service information aggregation platform providing students and faculty with a unified entry point for course notifications, activity announcements, and lost & found listings.

**Tech Stack:**
- Frontend: React 19.2.3 + TypeScript 5.8 + Vite 6.2 + Tailwind CSS
- Backend: FastAPI 0.115.0 + SQLAlchemy 2.0.35 + aiosqlite
- Router: React Router DOM 7.12 with HashRouter
- Auth: JWT (python-jose) + bcrypt password hashing

## Development Commands

```bash
# Frontend (in fronted/ directory)
cd fronted
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm run preview      # Preview production build

# Backend (in backend/ directory)
cd backend
pip install -r requirements.txt    # Install dependencies
python init_db.py                  # Initialize database with test users
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000    # Start dev server (http://localhost:8000)
```

**Test Accounts (created by init_db.py):**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@campus.edu | admin123 |
| Student | student@campus.edu | student123 |

## Architecture

### Frontend-Backend Communication

Frontend uses API service layer in `services/` directory to communicate with FastAPI backend. All authenticated requests include JWT token via `Authorization: Bearer <token>` header.

**API Base URL:** Configured via `VITE_API_URL` in `fronted/.env` (default: `http://localhost:8000`)

**All content pages are integrated with real APIs:**
- `Notifications.tsx` → `notificationsService.getAll()`
- `Activities.tsx` → `activitiesService.getAll({ category, status })`
- `LostAndFound.tsx` → `lostItemsService.getAll({ type, category })`
- `Publish.tsx` → `notificationsService.create()`, `activitiesService.create()`, `lostItemsService.create()`
- `Profile.tsx` → `usersService.updateMe()`, `usersService.changePassword()`
- `AdminDashboard.tsx` → Full CRUD for notifications/activities, CRD for lost-items

### Authentication & Authorization

**Security is enforced at multiple layers:**

1. **Backend (Primary):** JWT token validation via `get_current_user` and `get_current_admin` dependencies
2. **Frontend Route Guard:** `ProtectedRoute` component wraps admin-only routes
3. **UI Hiding:** Features hidden based on `user.role` (UX only, not security)

**Critical:** All permission checks MUST be enforced server-side. Frontend checks are for UX optimization only.

**Route Protection Pattern:**
```tsx
// Admin-only route
<Route path="/admin" element={
  <ProtectedRoute requireAdmin={true}>
    <AdminDashboard />
  </ProtectedRoute>
} />
```

### FastAPI Dependency Injection Pattern

**Important:** Each API file must redefine type aliases internally to avoid Annotated + default value conflicts across files:

```python
# In each app/api/*.py file:
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentAdmin = Annotated[User, Depends(get_current_admin)]
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]
```

### FastAPI Route Ordering Pattern

**Critical:** When registering routers in `main.py`, specific routes MUST be registered before parameterized routes to avoid conflicts:

```python
# CORRECT order in main.py:
app.include_router(user_notifications.router)      # /api/notifications/me (specific)
app.include_router(notifications.router)            # /api/notifications/{id} (parameterized)
app.include_router(activity_registrations.router)   # /api/activities/my-registrations (specific)
app.include_router(activities.router)               # /api/activities/{id} (parameterized)
```

**Rule:** Routes with literal segments (like `/me`, `/my-registrations`) must be defined before routes with path parameters (like `/{id}`), otherwise FastAPI will try to parse the literal as a parameter and return 422.

## Project Structure

```
hub-claudecode/
├── fronted/                        # React frontend
│   ├── pages/                      # Page components
│   │   ├── Login.tsx              # Student login (no admin link)
│   │   ├── AdminLogin.tsx         # Admin login (separate, unlinked)
│   │   ├── Home.tsx               # Homepage with news
│   │   ├── Notifications.tsx      # ✅ API integrated (read)
│   │   ├── Activities.tsx         # ✅ API integrated (read)
│   │   ├── LostAndFound.tsx       # ✅ API integrated (read)
│   │   ├── Publish.tsx            # ✅ API integrated (create)
│   │   ├── Profile.tsx            # ✅ API integrated (update, password change)
│   │   └── AdminDashboard.tsx     # ✅ API integrated (full CRUD)
│   ├── services/                   # API service layer
│   │   ├── api.ts                 # Base API client, token management
│   │   ├── auth.service.ts        # Authentication API
│   │   ├── notifications.service.ts
│   │   ├── activities.service.ts
│   │   ├── lostItems.service.ts
│   │   ├── users.service.ts
│   │   ├── activityRegistrations.service.ts
│   │   ├── userNotifications.service.ts
│   │   └── uploads.service.ts
│   ├── contexts/
│   │   └── AuthContext.tsx         # Auth state with API integration
│   ├── components/
│   │   ├── Layout.tsx              # Main layout (no admin link in dropdown)
│   │   ├── ProtectedRoute.tsx      # ⭐ Route guard component
│   │   ├── Toast.tsx               # Toast notifications
│   │   ├── NotificationBell.tsx    # Notification bell with unread count
│   │   ├── ImageUpload.tsx         # Single image upload component
│   │   └── MultiImageUpload.tsx    # Multiple image upload component
│   ├── types.ts                    # TypeScript types
│   └── constants.tsx               # Legacy mock data (deprecated)
│
└── backend/                        # FastAPI backend
    ├── app/
    │   ├── api/                    # API routes
    │   │   ├── auth.py             # POST /api/auth/login, /logout
    │   │   ├── users.py            # GET/PATCH /api/users/me
    │   │   ├── notifications.py   # CRUD for notifications
    │   │   ├── activities.py      # CRUD for activities
    │   │   ├── lost_items.py      # CRUD for lost items
    │   │   └── deps.py            # get_current_user, get_current_admin
    │   ├── core/
    │   │   ├── config.py          # Settings from environment
    │   │   └── security.py        # JWT token creation, password hashing
    │   ├── db/
    │   │   └── database.py        # Async session factory, init_db
    │   ├── models/                # SQLAlchemy models
    │   │   ├── user.py
    │   │   ├── notification.py
    │   │   ├── activity.py
    │   │   └── lost_item.py
    │   └── schemas/               # Pydantic schemas for request/response
    │       ├── user.py
    │       ├── notification.py
    │       ├── activity.py
    │       └── lost_item.py
    ├── main.py                     # FastAPI app with CORS and routers
    ├── init_db.py                  # Create tables and test users + sample data
    └── campus_hub.db               # SQLite database
```

## User Roles & Permissions

| Role | Can View | Can Publish |
|------|----------|-------------|
| `user` | All content | Lost & found items only |
| `admin` | All content | Notifications, activities, lost items |

## Routing Structure

```
/                     → RootRedirect (based on auth status)
/login                → Student login page
/admin/login          → Admin login page (not publicly linked)
/*                    → Layout wrapper
  /home               → Homepage
  /notifications      → Course notifications (API integrated)
  /activities         → Activity announcements (API integrated)
  /lost-and-found     → Lost & found (API integrated)
  /publish            → Publishing page (role-based)
  /profile            → User profile
  /admin              → Admin dashboard (ProtectedRoute + backend deps)
```

**Admin access security:**
- No public links to `/admin` or `/admin/login`
- `ProtectedRoute` enforces role check at router level
- Backend `get_current_admin` dependency enforces at API level

## API Endpoint Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login with email OR student_id |
| POST | `/api/auth/logout` | No | Clear session |
| GET | `/api/notifications` | No | List all notifications |
| POST | `/api/notifications` | Admin | Create notification |
| PUT | `/api/notifications/{id}` | Admin | Update notification |
| DELETE | `/api/notifications/{id}` | Admin | Delete notification |
| GET | `/api/activities` | No | List activities (filter: category, status) |
| POST | `/api/activities` | Admin | Create activity |
| PUT | `/api/activities/{id}` | Admin | Update activity |
| DELETE | `/api/activities/{id}` | Admin | Delete activity |
| GET | `/api/lost-items` | No | List lost items (filter: type, category) |
| POST | `/api/lost-items` | User+ | Create lost item |
| DELETE | `/api/lost-items/{id}` | Admin | Delete lost item |
| GET | `/api/users/me` | Yes | Get current user profile |
| PATCH | `/api/users/me` | Yes | Update profile |
| POST | `/api/users/me/change-password` | Yes | Change password |
| GET | `/api/notifications/me` | Yes | Get current user's personal notifications |
| GET | `/api/notifications/me/unread-count` | Yes | Get unread notification count |
| PATCH | `/api/notifications/me/{id}/read` | Yes | Mark notification as read |
| PATCH | `/api/notifications/me/read-all` | Yes | Mark all notifications as read |
| DELETE | `/api/notifications/me/{id}` | Yes | Delete notification |
| GET | `/api/activities/my-registrations` | Yes | Get user's activity registrations |
| POST | `/api/activities/{activity_id}/register` | Yes | Register for an activity |
| GET | `/api/activities/{activity_id}/registrations` | Admin | Get activity registration list |
| DELETE | `/api/activities/registrations/{registration_id}` | Yes | Cancel registration |
| POST | `/api/uploads/images` | User+ | Upload image file |

## Component Patterns

### Toast Notifications
```tsx
import { showToast } from '../components/Toast';
showToast('Message', 'success');  // 'error', 'warning'
```

### Auth State
```tsx
import { useAuth } from '../contexts/AuthContext';
const { user, logout, isLoading } = useAuth();
```

### Protected Routes
```tsx
import { ProtectedRoute } from '../components/ProtectedRoute';

<ProtectedRoute requireAdmin={true}>
  <AdminComponent />
</ProtectedRoute>
```

### Notification Bell
```tsx
import { NotificationBell } from '../components/NotificationBell';

// Automatically polls unread count every 30 seconds
// Shows dropdown with recent 5 notifications on click
<NotificationBell />
```

## Environment Variables

**Backend (.env):**
- `DATABASE_URL` - SQLite or PostgreSQL connection string
- `SECRET_KEY` - JWT signing key (change in production)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Token lifetime (default: 1440)
- `CORS_ORIGINS` - Allowed frontend origins (include port 3000)

**Frontend (.env):**
- `VITE_API_URL` - Backend API base URL (default: `http://localhost:8000`)

## Known Issues & Solutions

**bcrypt version conflict:** Fixed at bcrypt==4.0.1 (compatible with passlib 1.7.4)

**FastAPI Annotated Depends conflicts:** Each API file redefines type aliases internally (see Architecture section)

**FastAPI route conflicts (422 errors):** Specific routes like `/me` or `/my-registrations` must be registered before parameterized routes like `/{id}` in main.py (see Route Ordering Pattern)

**Windows console Unicode errors:** `init_db.py` sets UTF-8 encoding wrapper for win32

**CORS errors:** Ensure `CORS_ORIGINS` includes `http://localhost:3000`
 ## Summary

  完成了 Campus Hub 项目的全栈 API 集成，所有核心功能均已接入后端。

  ## What Was Done

  ### Phase 1: 内容页面 API 集成
  - `Notifications.tsx` → GET /api/notifications
  - `Activities.tsx` → GET /api/activities (with filters)
  - `LostAndFound.tsx` → GET /api/lost-items (with filters)

  ### Phase 2: 发布功能 API 集成
  - `Publish.tsx` → POST /api/notifications (admin only)
  - `Publish.tsx` → POST /api/activities (admin only)
  - `Publish.tsx` → POST /api/lost-items (user+)
  - 表单验证和错误处理

  ### Phase 3: 个人资料 API 集成
  - `Profile.tsx` → PATCH /api/users/me (update profile)
  - `Profile.tsx` → POST /api/users/me/change-password
  - "我的发布"列表加载 (按 created_by 筛选)

  ### Phase 4: 管理后台 CRUD 优化
  - `AdminDashboard.tsx` → PUT/DELETE /api/notifications/{id}
  - `AdminDashboard.tsx` → PUT/DELETE /api/activities/{id}
  - `AdminDashboard.tsx` → DELETE /api/lost-items/{id}
  - 编辑模态框 UI 和保存逻辑

  ### Phase 5: 安全和配置
  - `ProtectedRoute.tsx` 路由守卫组件
  - 移除学生登录页的管理员入口链接
  - 移除用户下拉菜单的管理后台选项
  - 创建 `backend/.env` 文件
  - 修复 CORS 配置

  ## Architecture Patterns

  ### 路由守卫模式
  ```tsx
  <ProtectedRoute requireAdmin={true}>
    <AdminDashboard />
  </ProtectedRoute>
  ```

  ### FastAPI 依赖注入
  ```python
  # 每个文件内部重新定义类型别名
  CurrentUser = Annotated[User, Depends(get_current_user)]
  CurrentAdmin = Annotated[User, Depends(get_current_admin)]
  ```

  ## Test Accounts
  ┌─────────┬────────────────────┬────────────┐
  │  角色   │        邮箱        │    密码    │
  ├─────────┼────────────────────┼────────────┤
  │ Admin   │ admin@campus.edu   │ admin123   │
  ├─────────┼────────────────────┼────────────┤
  │ Student │ student@campus.edu │ student123 │
  └─────────┴────────────────────┴────────────┘

  ## Remaining Tasks
  1. 统一错误处理 (401/403 自动跳转登录)
  2. 图片上传功能

---

## Session Handoff - 2026-01-26

### 1. Current Core Objective
完成了 Campus Hub 管理后台和用户展示界面的过滤系统功能开发，使所有内容页面都具备多维度的筛选能力。

### 2. Completed Work

**Modified Files:**
- `fronted/pages/AdminDashboard.tsx` - 添加了三套完整的过滤系统
  - 通知管理：重要程度筛选（lines 46, 778-805）
  - 活动管理：状态筛选 + 时间筛选（lines 47-48, 857-894）
  - 失物招领：类型 + 时间 + 分类三维度筛选（lines 49-51, 1018-1165）

- `fronted/pages/Notifications.tsx` - 添加重要通知过滤功能
  - 新增 `importantFilter` state (line 14)
  - 实现客户端过滤逻辑 (lines 35-38)
  - 更新侧边栏UI为功能性过滤栏 (lines 42-78)
  - 使用 `filteredNotifications` 替代 `notifications` 渲染 (line 106)

- `fronted/pages/Activities.tsx` - 添加时间筛选功能
  - 新增 `selectedTime` state 和 `timeFilters` 配置 (lines 13, 19-23)
  - 实现客户端时间过滤逻辑（基于活动日期，lines 36-54）
  - 在侧边栏添加时间筛选UI (lines 118-135)

- `fronted/pages/LostAndFound.tsx` - 添加时间筛选功能
  - 新增 `timeFilter` state (line 11)
  - 实现客户端时间过滤逻辑（基于发布时间，lines 27-45）
  - 重新设计过滤栏UI，分为两行：类型+时间 / 分类+搜索 (lines 87-181)

**Working Flows:**
- 管理后台所有三个管理页面都具备完整的过滤能力
- 用户展示页面（通知、活动、失物招领）与管理后台过滤逻辑保持一致
- 过滤器采用客户端计算方式，支持多维度组合筛选

### 3. Filter System Architecture

**Admin Dashboard Filters:**
| Page | Filter 1 | Filter 2 | Filter 3 |
|------|---------|----------|----------|
| 通知 | 全部/重要 | - | - |
| 活动 | 全部/进行中/已结束 | 全部/本周/本月/更远 | - |
| 失物招领 | 全部/遗失/招领 | 全部/本周/本月 | 电子产品/证件卡片/学习用品/生活用品/其他 |

**User Pages Filters:**
| Page | Filter 1 | Filter 2 | Filter 3 |
|------|---------|----------|----------|
| 通知 | 全部通知/仅看重要 | - | - |
| 活动 | 分类 + 状态 + 时间（侧边栏） | - | - |
| 失物招领 | 类型 + 时间 | 分类 | 搜索框 |

### 4. Environment Variables & Key Values
| Variable | Value |
|----------|-------|
| VITE_API_URL | http://localhost:8000 |
| Frontend Port | 3000 |
| Backend Port | 8000 |

### 5. Next Actions (Prioritized)
1. 统一错误处理（401/403 自动跳转登录）
2. 图片上传功能实现
3. 考虑添加更多用户个人化功能

### 6. Quick Restart Command
```bash
# Terminal 1 - Backend
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd fronted
npm run dev
```

### 7. Filter Implementation Notes

**时间筛选逻辑：**
- 活动页面：基于 `activity.date` 计算未来7天/30天
- 失物招领：基于 `item.created_at` 计算过去7天/30天
- 使用 `Math.ceil()` 或 `Math.floor()` 计算天数差

**UI样式约定：**
- 选中状态：`bg-primary text-white shadow-sm` 或 `bg-white text-[color] shadow-sm`
- 未选中：`text-slate-600 hover:text-slate-900`
- 分隔线：`<div className="w-px h-6 bg-slate-200"></div>`

---

## Session Handoff - 2026-01-27

### 1. Current Core Objective
完成了 Campus Hub 用户通知系统实现，管理员发布内容时自动为所有活跃用户创建个人通知，用户可通过通知铃铛查看。

### 2. Completed Work

**New Files Created:**
- `backend/app/api/user_notifications.py` - 个人通知API端点（GET /api/notifications/me, markAsRead, delete）
- `backend/app/models/user_notification.py` - UserNotification SQLAlchemy模型
- `backend/app/schemas/user_notification.py` - Pydantic请求/响应模式
- `fronted/components/NotificationBell.tsx` - 通知铃铛组件（带未读计数徽章和下拉列表）
- `fronted/services/userNotifications.service.ts` - 用户通知API服务层

**Modified Files:**
- `backend/main.py` - 重新排序路由注册（user_notifications.router 必须在 notifications.router 之前）
- `backend/app/api/notifications.py` - 管理员发布通知时自动为所有用户创建个人通知
- `backend/app/api/activities.py` - 管理员发布活动时自动为所有用户创建个人通知
- `backend/init_db.py` - 使用 `datetime.utcnow()` 替代相对时间（修复"8小时前"问题）
- `fronted/pages/Profile.tsx` - 添加通知标签页，支持 `?tab=notifications` URL参数

**Working Flows:**
1. 管理员发布课程通知/校园活动 → 后端自动为所有活跃用户创建个人通知
2. 用户登录后每30秒轮询未读通知数量
3. 通知铃铛显示红色徽章（未读数量）
4. 点击铃铛 → 显示最近5条通知下拉列表
5. 点击通知 → 标记为已读并跳转到相关页面
6. 点击"查看全部通知" → 跳转到 `/profile?tab=notifications`

### 3. Bugs Fixed

**Bug #1: 422 Error on `/api/notifications/me?limit=5`**
- **Root Cause:** 路由冲突 - `/{notification_id}` 路由匹配了 `/me` 路径，尝试将"me"转换为整数
- **Solution:** 在 `main.py` 中重新排序路由注册：
```python
app.include_router(user_notifications.router)  # 必须在前
app.include_router(notifications.router)        # 必须在后
```

**Bug #2: 通知时间显示"8小时前"**
- **Root Cause:** `init_db.py` 使用相对时间 `now - timedelta(hours=1)`
- **Solution:** 改为 `datetime.utcnow()` 创建当前时间戳

**Bug #3: "查看全部通知"跳转后无通知界面**
- **Root Cause:** Profile.tsx 缺少通知标签页和URL参数处理
- **Solution:** 添加 `'notifications'` 标签类型、`useSearchParams()` 钩子和完整通知列表UI

### 4. New API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications/me` | Yes | 获取当前用户通知（支持 ?limit= 参数） |
| GET | `/api/notifications/me/unread-count` | Yes | 获取未读通知数量 |
| PATCH | `/api/notifications/me/{id}/read` | Yes | 标记通知为已读 |
| PATCH | `/api/notifications/me/read-all` | Yes | 标记所有通知为已读 |
| DELETE | `/api/notifications/me/{id}` | Yes | 删除通知 |

### 5. Environment Variables & Key Values
| Variable | Value |
|----------|-------|
| VITE_API_URL | http://localhost:8000 |
| Frontend Port | 3000 |
| Backend Port | 8000 |

### 6. Next Actions (Prioritized)
1. **决定提交策略:** 建议创建功能分支 `feature/user-notifications` 后提交
2. **测试完整流程:** 管理员发布 → 学生接收 → 查看/标记已读
3. **统一错误处理:** 401/403 自动跳转登录
4. **图片上传功能:** 完成现有部分实现

### 7. Quick Restart Command
```bash
# Terminal 1 - Backend
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd fronted
npm run dev
```

### 8. Critical Implementation Notes

**路由顺序至关重要：**
```python
# 正确顺序 (main.py):
app.include_router(user_notifications.router)  # /api/notifications/me
app.include_router(notifications.router)        # /api/notifications/{id}
```

**URL参数处理模式：**
```tsx
// 读取 ?tab=notifications
const [searchParams] = useSearchParams();
useEffect(() => {
  const tab = searchParams.get('tab') as TabType;
  if (tab && ['posts', 'notifications', ...].includes(tab)) {
    setActiveTab(tab);
  }
}, [searchParams]);
```

**自动创建通知模式：**
```python
# 管理员发布时为所有活跃用户创建通知
result = await db.execute(select(User).where(User.is_active == True))
users = result.scalars().all()
for user in users:
    user_notification = UserNotification(
        user_id=user.id,
        type="course",
        title=f"新课程通知：{title}",
        content=content,
        link_url="/notifications",
        is_read=False,
        created_at=datetime.utcnow(),
    )
    db.add(user_notification)
```

---

## Session Handoff - 2026-01-28

### 1. Current Core Objective
完成了活动报名系统实现和路由冲突修复，学生可以报名活动，管理员可查看报名名单。

### 2. Completed Work

**New Files Created:**
- `backend/app/api/activity_registrations.py` - 活动报名API端点
- `backend/app/models/activity_registration.py` - ActivityRegistration SQLAlchemy模型
- `backend/app/schemas/activity_registration.py` - Pydantic请求/响应模式
- `fronted/services/activityRegistrations.service.ts` - 活动报名API服务层
- `backend/fix_registration_times.py` - 修复活动报名时间脚本
- `backend/check_activity.py` - 检查活动报名状态脚本

**Modified Files:**
- `backend/main.py` - 重新排序路由注册（activity_registrations.router 必须在 activities.router 之前）
- `fronted/pages/ActivityDetail.tsx` - 添加报名确认对话框，复用用户资料信息
- `fronted/pages/AdminDashboard.tsx` - 添加查看报名名单模态框

**Working Flows:**
1. 学生点击"立即报名"按钮 → 显示确认对话框（显示用户姓名、学号）
2. 确认后调用 POST /api/activities/{id}/register 创建报名
3. 管理后台活动列表 → 点击"查看报名"按钮 → 显示该活动所有报名学生名单
4. 报名状态：confirmed（已确认）、cancelled（已取消）、attended（已参加）

### 3. Bugs Fixed

**Bug #1: 422 Error on `/api/activities/my-registrations`**
- **Root Cause:** 路由冲突 - activities.router 的 `/{activity_id}` 在 activity_registrations.router 的 `/my-registrations` 之前注册
- **Solution:** 在 `main.py` 中重新排序路由注册：
```python
app.include_router(activity_registrations.router)  # 必须在前
app.include_router(activities.router)              # 必须在后
```

**Bug #2: 400 Error "Registration is not open at this time"**
- **Root Cause:** 生成的测试活动报名开始时间是未来时间（如21:36，而当前是16:15）
- **Solution:** 创建 `fix_registration_times.py` 脚本，将所有未来活动的报名时间设置为"立即开始"
```python
reg_start = now  # 报名立即开始
reg_end = act_start  # 报名截止到活动开始
```

### 4. New API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/activities/my-registrations` | Yes | 获取当前用户的报名列表 |
| POST | `/api/activities/{activity_id}/register` | Yes | 报名参加活动 |
| GET | `/api/activities/{activity_id}/registrations` | Admin | 获取活动的报名名单（支持状态筛选） |
| DELETE | `/api/activities/registrations/{registration_id}` | Yes | 取消报名 |

### 5. Environment Variables & Key Values
| Variable | Value |
|----------|-------|
| VITE_API_URL | http://localhost:8000 |
| Frontend Port | 3000 |
| Backend Port | 8000 |

### 6. Next Actions (Prioritized)
1. **测试报名流程:** 学生登录 → 访问活动详情 → 点击报名 → 管理员查看名单
2. **取消报名功能:** 前端添加取消报名按钮
3. **统一错误处理:** 401/403 自动跳转登录
4. **图片上传功能:** 完成现有部分实现

### 7. Quick Restart Command
```bash
# Terminal 1 - Backend
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd fronted
npm run dev
```

### 8. Critical Implementation Notes

**路由顺序（main.py）：**
```python
# 正确顺序 - 具体路由必须在参数化路由之前
app.include_router(user_notifications.router)      # /api/notifications/me
app.include_router(notifications.router)            # /api/notifications/{id}
app.include_router(activity_registrations.router)   # /api/activities/my-registrations
app.include_router(activities.router)               # /api/activities/{id}
```

**活动时间检查逻辑：**
```python
# 检查报名是否开放
now = datetime.utcnow()
if now < activity.registration_start or now > activity.registration_end:
    raise HTTPException(400, "Registration is not open at this time")

# 检查是否已报名（状态为 confirmed 或 attended）
existing = await db.execute(
    select(ActivityRegistration).where(
        and_(
            ActivityRegistration.activity_id == activity_id,
            ActivityRegistration.user_id == current_user.id,
            ActivityRegistration.status.in_(["confirmed", "attended"])
        )
    )
)
```

**报名确认对话框模式（ActivityDetail.tsx）：**
```tsx
// 复用用户信息，无需填写表单
const handleRegistrationConfirm = async () => {
  await activityRegistrationsService.create(activityId, {
    name: user.name || '',
    student_id: user.student_id || '',
    phone: user.phone || '',
    remark: '',
  });
  // 刷新报名列表
  const registrations = await activityRegistrationsService.getMyRegistrations();
  setMyRegistrations(registrations);
};
```
1.29手动日志新功能
  1. 活动批量删除功能 ✅

  后端 (backend/app/api/activities.py):
  - 添加 POST /api/activities/batch-delete 端点

  前端 (fronted/services/activities.service.ts):
  - 添加 batchDelete(ids) 方法

  前端 UI (fronted/pages/AdminDashboard.tsx):
  - 添加复选框选择活动
  - 添加批量操作按钮（选中活动时显示）
  - 添加批量确认对话框

  2. 失物招领审核功能 ✅

  后端模型 (backend/app/models/lost_item.py):
  - 添加 review_status 字段

  后端API (backend/app/api/lost_items.py):
  - 添加 POST /api/lost-items/{id}/review?approve=true/false 端点
  - 更新所有响应包含 review_status

  前端 (fronted/services/lostItems.service.ts):
  - 添加 review(id, approve) 方法

  前端 UI (fronted/pages/AdminDashboard.tsx):
  - 显示审核状态徽章（待审核/已通过/已拒绝）
  - 待审核项目显示审核/拒绝按钮

  功能说明

  活动批量删除:
  1. 管理员登录 → 管理后台 → 活动公告
  2. 勾选要删除的活动
  3. 点击"批量删除"按钮
  4. 确认后批量删除

  失物招领审核:
  1. 用户发布失物信息后默认状态为"待审核"
  2. 管理员在管理后台可看到审核状态
  3. 点击✓按钮通过审核，点击✗按钮拒绝审核
  4. 审核通过后信息正常显示，未审核的信息可隐藏（可扩展）

  注意: 由于修改了数据库模型，需要重新运行 python init_db.py 来添加新字段，或者手动迁移数据库。
