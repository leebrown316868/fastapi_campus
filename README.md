# Campus Hub

**校园信息聚合平台** - 为学生和教师提供课程通知、活动公告和失物招领的统一入口。

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 19.2.3 + TypeScript 5.8 + Vite 6.2 + Tailwind CSS |
| **后端** | FastAPI 0.115.0 + SQLAlchemy 2.0.35 + aiosqlite |
| **路由** | React Router DOM 7.12 (HashRouter) |
| **认证** | JWT (python-jose) + bcrypt 密码加密 |

## 项目结构

```
hub-claudecode/
├── fronted/                        # React 前端
│   ├── pages/                      # 页面组件
│   │   ├── Login.tsx              # 学生登录页
│   │   ├── AdminLogin.tsx         # 管理员登录页
│   │   ├── Home.tsx               # 首页
│   │   ├── Notifications.tsx      # 课程通知
│   │   ├── Activities.tsx         # 活动公告
│   │   ├── LostAndFound.tsx       # 失物招领
│   │   ├── Publish.tsx            # 发布页面
│   │   ├── Profile.tsx            # 个人中心
│   │   └── AdminDashboard.tsx     # 管理后台
│   ├── services/                   # API 服务层
│   ├── contexts/                   # React Context
│   ├── components/                 # 公共组件
│   ├── types.ts                    # TypeScript 类型
│   └── .env                        # 前端环境变量
│
└── backend/                        # FastAPI 后端
    ├── app/
    │   ├── api/                    # API 路由
    │   ├── core/                   # 核心配置
    │   ├── db/                     # 数据库配置
    │   ├── models/                 # SQLAlchemy 模型
    │   └── schemas/                # Pydantic schemas
    ├── main.py                     # 应用入口
    ├── init_db.py                  # 数据库初始化
    ├── .env                        # 后端环境变量
    └── campus_hub.db               # SQLite 数据库
```

## 快速开始

### 1. 后端设置

```bash
cd backend
pip install -r requirements.txt    # 安装依赖
python init_db.py                  # 初始化数据库
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. 前端设置

```bash
cd fronted
npm install          # 安装依赖
npm run dev          # 启动开发服务器 (http://localhost:3000)
```

### 3. 访问应用

- **前端**: http://localhost:3000
- **后端 API 文档**: http://localhost:8000/docs

## 测试账号

| 角色 | 邮箱 | 密码 |
|------|-------|----------|
| 管理员 | admin@campus.edu | admin123 |
| 学生 | student@campus.edu | student123 |

## 用户权限

| 功能 | 普通用户 | 管理员 |
|------|----------|--------|
| 浏览所有内容 | ✅ | ✅ |
| 发布失物招领 | ✅ | ✅ |
| 发布课程通知 | ❌ | ✅ |
| 发布活动公告 | ❌ | ✅ |
| 管理所有内容 | ❌ | ✅ |

## 核心 API 端点

### 认证
| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 邮箱或学号登录 |
| POST | `/api/auth/logout` | 登出 |

### 用户
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/users/me` | 获取当前用户信息 |
| PATCH | `/api/users/me` | 更新个人资料 |
| POST | `/api/users/me/change-password` | 修改密码 |
| GET | `/api/users/{user_id}` | 查看用户资料 |

### 课程通知
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/notifications` | 获取通知列表 |
| POST | `/api/notifications` | 创建通知 (管理员) |
| PUT | `/api/notifications/{id}` | 更新通知 (管理员) |
| DELETE | `/api/notifications/{id}` | 删除通知 (管理员) |

### 活动公告
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/activities` | 获取活动列表 (支持筛选) |
| POST | `/api/activities` | 创建活动 (管理员) |
| PUT | `/api/activities/{id}` | 更新活动 (管理员) |
| DELETE | `/api/activities/{id}` | 删除活动 (管理员) |
| POST | `/api/activities/{id}/register` | 报名活动 |
| GET | `/api/activities/my-registrations` | 我的报名 |

### 失物招领
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/lost-items` | 获取失物列表 (支持筛选) |
| POST | `/api/lost-items` | 发布失物 |
| DELETE | `/api/lost-items/{id}` | 删除失物 (管理员) |

### 个人通知
| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/notifications/me` | 获取我的通知 |
| GET | `/api/notifications/me/unread-count` | 未读数量 |
| PATCH | `/api/notifications/me/{id}/read` | 标记已读 |
| DELETE | `/api/notifications/me/{id}` | 删除通知 |

### 文件上传
| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/uploads/images` | 上传图片 |

## 环境变量

### 后端 (.env)
```bash
DATABASE_URL=sqlite+aiosqlite:///./campus_hub.db
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:3000
```

### 前端 (.env)
```bash
VITE_API_URL=http://localhost:8000
```

## 路由结构

```
/                     → 根据认证状态重定向
/login                → 学生登录页
/admin/login          → 管理员登录页（无公开链接）
/*                    → 主布局包裹
  /home               → 首页
  /notifications      → 课程通知
  /activities         → 活动公告
  /lost-and-found     → 失物招领
  /publish            → 发布页面
  /profile            → 个人中心
  /admin              → 管理后台（需管理员权限）
```

## 隐私设置

用户可以在个人中心控制以下隐私选项：

| 设置项 | 默认值 | 说明 |
|--------|--------|------|
| 显示姓名 | 开启 | 失物招领中显示姓名 |
| 显示头像 | 开启 | 失物招领中显示头像 |
| 显示邮箱 | 关闭 | 允许他人通过邮箱联系 |
| 显示手机 | 关闭 | 允许他人通过手机联系 |

## 开发说明

### FastAPI 路由顺序

注册路由时，具体路由必须在参数化路由之前：

```python
# 正确顺序
app.include_router(user_notifications.router)      # /api/notifications/me
app.include_router(notifications.router)            # /api/notifications/{id}
```

### 依赖注入模式

每个 API 文件内部重新定义类型别名：

```python
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentAdmin = Annotated[User, Depends(get_current_admin)]
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]
```

## 已知问题

- **bcrypt 版本**: 固定在 bcrypt==4.0.1（兼容 passlib 1.7.4）
- **Windows 控制台**: init_db.py 已设置 UTF-8 编码包装器
- **CORS 错误**: 确保 CORS_ORIGINS 包含 http://localhost:3000

## 许可证

MIT License
