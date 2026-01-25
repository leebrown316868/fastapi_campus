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
│   │   └── users.service.ts
│   ├── contexts/
│   │   └── AuthContext.tsx         # Auth state with API integration
│   ├── components/
│   │   ├── Layout.tsx              # Main layout (no admin link in dropdown)
│   │   ├── ProtectedRoute.tsx      # ⭐ Route guard component
│   │   └── Toast.tsx               # Toast notifications
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