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

---

## Session Handoff - 2026-01-30

### 1. Current Core Objective
完成了 Campus Hub 的最新动态接口、课程通知附件上传、活动报名功能完善，以及管理后台编辑功能与发布页面对齐。

### 2. Completed Work

**New Files Created:**
- `backend/app/api/feed.py` - 最新动态聚合API（GET /api/feed/latest）
- `backend/app/api/uploads.py` - 添加文档上传端点（POST /api/upload/document，支持PDF、PPT、PPTX、DOC、DOCX）
- `fronted/services/feed.service.ts` - Feed API 服务层
- `fronted/components/DottedBackground.tsx` - 动态点阵背景组件

**Modified Files:**
- `backend/app/models/notification.py` - 添加 `attachment` 和 `attachment_name` 字段
- `backend/app/schemas/notification.py` - 更新 schema 包含附件字段
- `backend/app/api/notifications.py` - 响应包含附件字段
- `fronted/pages/Home.tsx` - 使用真实 Feed API 替代 MOCK_NEWS，添加动态效果
- `fronted/pages/Publish.tsx` - 添加位置、重要程度、附件上传功能
- `fronted/pages/Notifications.tsx` - 移除"全部已读"按钮，添加附件下载链接
- `fronted/pages/ActivityDetail.tsx` - 添加取消报名功能、报名时间状态显示、图片空值检查
- `fronted/pages/AdminDashboard.tsx` - 添加通知/活动编辑的附件字段、报名时间字段，修复重复 key 问题
- `fronted/components/Layout.tsx` - 移除旧版气泡背景代码
- `fronted/index.html` - 移除 mesh-gradient 类和气泡 CSS
- `backend/app/api/activity_registrations.py` - 修复时区问题（使用 datetime.now() 而不是 utcnow()）

**Working Flows:**
1. **最新动态**：首页聚合通知、活动、失物招领，按时间排序显示
2. **课程通知附件上传**：发布时可上传PDF/Word文档，显示时可下载
3. **活动报名状态**：根据报名时间显示不同按钮（未开始/进行中/已结束）
4. **取消报名**：已报名用户可以取消报名
5. **管理后台编辑**：通知和活动编辑支持所有字段（包括附件、报名时间）

### 3. Bug Fixes

**Bug #1: 404 Error on `/api/feed/latest`**
- **Root Cause:** 路由前缀错误（`/feed` 而非 `/api/feed`）
- **Solution:** 更新 router prefix 为 `/api/feed`

**Bug #2: 活动报名时区不匹配**
- **Root Cause:** 后端使用 `datetime.utcnow()` 与数据库本地时间比较
- **Solution:** 改用 `datetime.now()` 进行本地时间比较

**Bug #3: 新建活动无法报名**
- **Root Cause:** 报名开始时间设为未来时间
- **Solution:** 添加报名时间状态显示，清晰的错误提示

**Bug #4: 旧版背景 UI 闪烁**
- **Root Cause:** Layout.tsx 中有旧气泡背景代码，index.html 有 mesh-gradient 类
- **Solution:** 移除旧背景代码

**Bug #5: AdminDashboard 重复 key 警告**
- **Root Cause:** 概览页面合并通知/活动/失物招领时，不同表有相同 ID
- **Solution:** 使用 Map 确保唯一性，key 改为 `${type}-${id}`

**Bug #6: 图片 src 空字符串警告**
- **Root Cause:** 活动图片可能为空字符串
- **Solution:** 添加空值检查，显示占位符

### 4. New API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/feed/latest?limit=10` | No | 获取最新动态聚合信息 |
| POST | `/api/upload/document` | User+ | 上传文档文件（PDF/PPT/Word） |

### 5. Environment Variables & Key Values
| Variable | Value |
|----------|-------|
| VITE_API_URL | http://localhost:8000 |
| Frontend Port | 3000 |
| Backend Port | 8000 |
| Database | SQLite (campus_hub.db) |

### 6. Next Actions (Prioritized)
1. **统一错误处理:** 401/403 自动跳转登录
2. **图片上传功能:** 完成失物招领图片上传
3. **测试完整流程:** 测试最新动态、附件上传、报名/取消报名

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

**Feed API 数据结构：**
```json
{
  "items": [
    {
      "id": "notification-1",
      "type": "notification",
      "tag": "重要",
      "tag_color": "bg-blue-100 text-blue-700",
      "title": "...",
      "description": "...",
      "time": "2小时前",
      "created_at": "2026-01-29T...",
      "link_url": "/notifications"
    }
  ],
  "total": 6
}
```

**课程通知发布字段（完整版）：**
```typescript
{
  course, title, content,
  location,        // 可选
  is_important,    // 是否重要
  attachment,      // 文件URL（上传后返回）
  attachment_name, // 原始文件名
  author,
  avatar
}
```

**活动报名时间编辑：**
- 报名开始时间：`datetime-local` 输入
- 报名结束时间：`datetime-local` 输入
- 活动开始时间：`datetime-local` 输入
- 活动结束时间：`datetime-local` 输入
- 数据格式：ISO 8601 字符串

**活动报名状态判断：**
```typescript
const now = new Date();
const regStart = new Date(activity.registration_start);
const regEnd = new Date(activity.registration_end);

if (!hasRegistration) {
  registrationStatus = 'no_registration';
} else if (now < regStart) {
  registrationStatus = 'not_started';
  registrationStatusText = '报名未开始（...开始）';
} else if (now > regEnd) {
  registrationStatus = 'ended';
  registrationStatusText = '报名已结束';
} else {
  registrationStatus = 'open';
}
```

---