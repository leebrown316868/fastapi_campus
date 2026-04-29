# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Campus Hub (校园信息聚合平台) - A comprehensive campus service information aggregation platform providing students and faculty with a unified entry point for course notifications, activity announcements, and lost & found listings.

**Tech Stack:**
- Frontend: React 19.2.3 + TypeScript 5.8 + Vite 6.2 + Tailwind CSS
- Backend: FastAPI 0.115.0 + SQLAlchemy 2.0.35 + aiomysql
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
python migrations/add_targeting_fields.py    # Migrate: targeting fields
python migrations/add_points_feedback.py    # Migrate: points + feedback tables
python init_db.py                  # Initialize database with test users
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000    # Start dev server

# Docker deployment
docker-compose up --build    # Build and start all services
```

**Test Accounts (created by init_db.py):**
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@campus.edu | admin123 |
| Student | student@campus.edu | student123 |

## Architecture

### Frontend-Backend Communication

Frontend uses API service layer in `services/` directory to communicate with FastAPI backend. All authenticated requests include JWT token via `Authorization: Bearer <token>` header.

**API Base URL:** Configured via `VITE_API_URL` in `fronted/.env` (default: `/` for proxy, or `http://localhost:8000` for direct access)

**Service Layer:**
- `services/api.ts` - Base API client with token management, auth error handling, file download support
- `services/feed.service.ts` - Aggregated feed API
- `services/*.service.ts` - Domain-specific API clients

**All content pages are integrated with real APIs:**
- `Home.tsx` → `feedService.getLatest()` (aggregated feed)
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
app.include_router(feed.router)                       # /api/feed/latest (specific)
app.include_router(user_notifications.router)         # /api/notifications/me (specific)
app.include_router(notifications.router)               # /api/notifications/{id} (parameterized)
app.include_router(activity_registrations.router)      # /api/activities/my-registrations (specific)
app.include_router(activities.router)                  # /api/activities/{id} (parameterized)
```

**Rule:** Routes with literal segments (like `/me`, `/my-registrations`, `/latest`) must be defined before routes with path parameters (like `/{id}`), otherwise FastAPI will try to parse the literal as a parameter and return 422.

### Feed API Pattern

The `/api/feed/latest` endpoint aggregates content from multiple sources:

**Backend (`app/api/feed.py`):**
- Queries latest notifications, activities, and lost items
- Normalizes to unified `FeedItem` format with `type`, `tag`, `tag_color`
- Calculates relative time display (刚刚, X分钟前, X小时前, X天前)
- Updates activity status automatically on fetch

**Frontend (`services/feed.service.ts`):**
```typescript
interface FeedItem {
  id: string;              // "notification-{id}", "activity-{id}", "lost-{id}"
  type: 'notification' | 'activity' | 'lost_item';
  tag: string;             // Display tag (重要, 通知, 进行中, 遗失, etc.)
  tag_color: string;       // Tailwind color classes
  title: string;
  description: string;
  time: string;            // Relative time
  created_at: string;
  link_url: string;        // Navigation path
}
```

### Privacy Settings Architecture

Users can control what personal information is displayed in lost & found listings:

**4 Privacy Settings (User model):**
| Field | Default | Description |
|-------|---------|-------------|
| `show_name_in_lost_item` | true | Show name in lost item listings |
| `show_avatar_in_lost_item` | true | Show avatar in lost item listings |
| `show_email_in_lost_item` | false | Allow others to see email |
| `show_phone_in_lost_item` | false | Allow others to see phone |

**Display Logic Pattern:**
```tsx
// Viewing own profile - show all information
const isOwnProfile = currentUser?.id === user.id.toString();

// Name: hide if disabled and not own profile
{isOwnProfile || user.show_name_in_lost_item !== false ? user.name : '匿名用户'}

// Contact info: show "未公开" if hidden and not own profile
{!isOwnProfile && !user.show_phone_in_lost_item ? (
  <div className="opacity-50">🔒 未公开</div>
) : user.phone ? (
  <div>{user.phone}</div>
) : null}
```

**Database Migration:**
```bash
cd backend
python migrations/add_targeting_fields.py     # 定向推送字段
python migrations/add_points_feedback.py      # 积分 + 反馈表
```

### Static File Serving

Backend serves uploaded images via static files mount:
```python
# main.py
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
```

Access images at: `http://localhost:8000/uploads/{filename}`

### Vite Configuration

**Path Aliases (`vite.config.ts`):**
- `@` → project root (`fronted/`)

**Development Server:**
- Port: 3000
- Host: 0.0.0.0 (accessible from network)

## Project Structure

```
hub-claudecode/
├── fronted/                        # React frontend
│   ├── pages/                      # Page components (lazy-loaded)
│   │   ├── Login.tsx              # Student login (no admin link)
│   │   ├── AdminLogin.tsx         # Admin login (separate, unlinked)
│   │   ├── Home.tsx               # Homepage with feed
│   │   ├── Notifications.tsx      # ✅ API integrated (read)
│   │   ├── Activities.tsx         # ✅ API integrated (read)
│   │   ├── LostAndFound.tsx       # ✅ API integrated (read)
│   │   ├── Publish.tsx            # ✅ API integrated (create)
│   │   ├── Profile.tsx            # ✅ API integrated (update, password change, privacy)
│   │   ├── UserProfile.tsx        # Other user's profile (privacy-aware)
│   │   └── AdminDashboard.tsx     # ✅ API integrated (full CRUD)
│   ├── services/                   # API service layer
│   │   ├── api.ts                 # Base API client, token management
│   │   ├── feed.service.ts        # Aggregated feed
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
│   │   ├── Layout.tsx              # Main layout
│   │   ├── ProtectedRoute.tsx      # ⭐ Route guard component
│   │   ├── Toast.tsx               # Toast notifications
│   │   ├── NotificationBell.tsx    # Notification bell with unread count
│   │   ├── ImageUpload.tsx         # Single image upload
│   │   └── MultiImageUpload.tsx    # Multiple image upload
│   ├── types.ts                    # TypeScript types
│   ├── vite.config.ts              # Vite configuration
│   ├── Dockerfile                  # Frontend Docker build
│   └── nginx.conf                  # Nginx config for Docker
│
└── backend/                        # FastAPI backend
    ├── app/
    │   ├── api/                    # API routes
    │   │   ├── auth.py             # POST /api/auth/login, /logout
    │   │   ├── users.py            # GET/PATCH /api/users/me, GET /api/users/{id}
    │   │   ├── notifications.py   # CRUD for notifications
    │   │   ├── activities.py      # CRUD for activities
    │   │   ├── lost_items.py      # CRUD for lost items (privacy-aware)
    │   │   ├── feed.py            # GET /api/feed/latest
    │   │   ├── user_notifications.py  # User-specific notifications
    │   │   ├── activity_registrations.py  # Activity registrations
    │   │   ├── uploads.py         # POST /api/uploads/images
    │   │   └── deps.py            # get_current_user, get_current_admin
    │   ├── core/
    │   │   ├── config.py          # Settings from environment
    │   │   └── security.py        # JWT token creation, password hashing
    │   ├── db/
    │   │   └── database.py        # Async session factory, init_db
    │   ├── models/                # SQLAlchemy models
    │   │   ├── user.py            # With privacy fields
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
    ├── migrations/                 # Database migration scripts
    ├── .env.example                # Environment variables template
    ├── Dockerfile                  # Backend Docker build
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
  /home               → Homepage with feed
  /notifications      → Course notifications (API integrated)
  /activities         → Activity announcements (API integrated)
  /lost-and-found     → Lost & found (API integrated)
  /publish            → Publishing page (role-based)
  /profile            → User profile
  /user/:userId       → Other user's profile (privacy-aware)
  /admin              → Admin dashboard (ProtectedRoute + backend deps)
```

**Admin access security:**
- No public links to `/admin` or `/admin/login`
- `ProtectedRoute` enforces role check at router level
- Backend `get_current_admin` dependency enforces at API level

## API Endpoint Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/feed/latest` | No | Get latest aggregated feed (limit query param) |
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
| GET | `/api/users/{user_id}` | No | Get public user profile (privacy-aware) |
| PATCH | `/api/users/me` | Yes | Update profile (including privacy settings) |
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
```bash
DATABASE_URL=mysql+aiomysql://campus:campus123@localhost:3306/campus_hub
SECRET_KEY=your-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]
```

**Frontend (.env):**
```bash
VITE_API_URL=/  # Uses relative path for proxy, or http://localhost:8000 for direct access
```

**Docker (docker-compose.yml):**
- Backend: MySQL database, uploads in `/app/uploads` volume
- Frontend: Nginx serving static files on port 8080
- Environment variables override defaults for production

## Known Issues & Solutions

**bcrypt version conflict:** Fixed at bcrypt==4.0.1 (compatible with passlib 1.7.4)

**FastAPI Annotated Depends conflicts:** Each API file redefines type aliases internally (see Architecture section)

**FastAPI route conflicts (422 errors):** Specific routes like `/me`, `/my-registrations`, `/latest` must be registered before parameterized routes like `/{id}` in main.py (see Route Ordering Pattern)

**Windows console Unicode errors:** `init_db.py` sets UTF-8 encoding wrapper for win32

**CORS errors:** Ensure `CORS_ORIGINS` includes development ports (3000, 5173, 5174)

**Toggle Switch UI:** Use `left-0 translate-x-1` (off) / `translate-x-5` (on) pattern for proper positioning
