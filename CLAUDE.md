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
完成了失物招领隐私设置功能，允许用户控制个人信息在失物招领页面和用户资料卡片的显示。

### 2. Completed Work

**New Files Created:**
- `backend/add_privacy_columns.py` - 数据库迁移脚本，添加隐私设置字段

**Modified Files:**
- `backend/app/models/user.py` - 添加4个隐私设置字段（show_name_in_lost_item, show_avatar_in_lost_item, show_email_in_lost_item, show_phone_in_lost_item）
- `backend/app/schemas/user.py` - 更新UserUpdate和UserResponse包含隐私设置
- `backend/app/schemas/lost_item.py` - PublisherInfo支持可选字段（name, avatar, email, phone）
- `backend/app/api/lost_items.py` - 根据用户隐私设置过滤发布者信息
- `backend/app/api/users.py` - GET /api/users/{user_id} 改为公开访问
- `fronted/types.ts` - User和LostItem接口添加隐私字段
- `fronted/contexts/AuthContext.tsx` - 保存/加载隐私设置到用户状态
- `fronted/pages/Profile.tsx` - 新增"隐私设置"标签页，开关UI修复（translate-x-1/translate-x-5）
- `fronted/pages/UserProfile.tsx` - 根据隐私设置和是否是自己的资料选择性显示信息
- `fronted/pages/ItemDetail.tsx` - 移除联系方式显示，保留跳转用户资料按钮
- `fronted/pages/LostAndFound.tsx` - 发布者姓名为空时显示"匿名用户"

**Working Flows:**
1. **隐私设置**：用户可在个人中心控制失物招领中显示哪些信息
2. **用户资料页面**：
   - 查看自己的资料：显示所有信息
   - 查看别人的资料：根据该用户的隐私设置显示对应信息
   - 隐藏的信息显示带锁图标的"未公开"

### 3. Privacy Settings Details

**4个隐私设置选项：**
| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| show_name_in_lost_item | true | 失物招领中显示姓名 |
| show_avatar_in_lost_item | true | 失物招领中显示头像 |
| show_email_in_lost_item | false | 允许他人通过邮箱联系 |
| show_phone_in_lost_item | false | 允许他人通过手机联系 |

**显示逻辑：**
```tsx
// 查看自己的资料 - 显示所有信息
const isOwnProfile = currentUser?.id === user.id.toString();

// 姓名
{isOwnProfile || user.show_name_in_lost_item !== false ? user.name : '匿名用户'}

// 头像
{(isOwnProfile || user.show_avatar_in_lost_item !== false) && user.avatar ? <img /> : initials}

// 手机/邮箱 - 隐藏时显示"未公开"
{!isOwnProfile && !user.show_phone_in_lost_item ? (
  <div className="opacity-50">🔒 未公开</div>
) : user.phone ? (
  <div>{user.phone}</div>
) : null}
```

### 4. Database Migration

**执行状态：** ✅ 已完成
```bash
cd backend
python add_privacy_columns.py
```

**添加的列：**
```sql
ALTER TABLE users ADD COLUMN show_name_in_lost_item BOOLEAN DEFAULT 1;
ALTER TABLE users ADD COLUMN show_avatar_in_lost_item BOOLEAN DEFAULT 1;
ALTER TABLE users ADD COLUMN show_email_in_lost_item BOOLEAN DEFAULT 0;
ALTER TABLE users ADD COLUMN show_phone_in_lost_item BOOLEAN DEFAULT 0;
```

### 5. Toggle Switch UI Fix

**问题：** 开关白色圆球默认位置在右侧，开启后超出范围
**解决方案：**
```tsx
// 修复前
translate-x-1 (关闭) / translate-x-6 (开启) ❌

// 修复后
left-0 translate-x-1 (关闭) / translate-x-5 (开启) ✅
```

### 6. Environment Variables & Key Values
| Variable | Value |
|----------|-------|
| VITE_API_URL | http://localhost:8000 |
| Frontend Port | 3000 |
| Backend Port | 8000 |
| Database | SQLite (campus_hub.db) |

### 7. Next Actions (Prioritized)
1. **测试隐私设置：** 验证开关保存和显示逻辑
2. **完整流程测试：** 从失物招领点击"联系发布者"查看隐私设置效果

### 8. Quick Restart Command
```bash
# Terminal 1 - Backend
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
cd fronted
npm run dev
```

---