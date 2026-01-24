# Campus Hub Backend

FastAPI 后端服务，提供校园信息聚合平台的 API。

## 项目结构

```
backend/
├── app/
│   ├── api/              # API 路由
│   │   ├── auth.py       # 认证相关 API
│   │   ├── users.py      # 用户管理 API
│   │   ├── notifications.py  # 课程通知 API
│   │   ├── activities.py     # 活动公告 API
│   │   ├── lost_items.py     # 失物招领 API
│   │   └── deps.py       # 依赖注入（认证等）
│   ├── core/             # 核心配置
│   │   ├── config.py     # 应用配置
│   │   └── security.py   # JWT 和密码加密
│   ├── db/               # 数据库配置
│   │   └── database.py   # 数据库连接和会话
│   ├── models/           # SQLAlchemy 模型
│   │   ├── user.py
│   │   ├── notification.py
│   │   ├── activity.py
│   │   └── lost_item.py
│   └── schemas/          # Pydantic schemas
│       ├── user.py
│       ├── notification.py
│       ├── activity.py
│       └── lost_item.py
├── main.py               # 应用入口
├── init_db.py            # 数据库初始化脚本
├── requirements.txt      # Python 依赖
└── .env.example          # 环境变量示例
```

## 快速开始

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，修改 SECRET_KEY 等配置
```

### 3. 初始化数据库

```bash
python init_db.py
```

这将创建 SQLite 数据库和默认用户：

| 用户类型 | 邮箱 | 密码 |
|---------|------|------|
| 管理员 | admin@campus.edu | admin123 |
| 学生 | student@campus.edu | student123 |

### 4. 启动服务

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

或使用：
```bash
python -m uvicorn main:app --reload
```

## API 端点

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `POST /api/auth/logout` - 登出

### 用户
- `GET /api/users/me` - 获取当前用户信息
- `PATCH /api/users/me` - 更新当前用户信息
- `GET /api/users` - 获取所有用户（仅管理员）

### 课程通知
- `GET /api/notifications` - 获取通知列表
- `GET /api/notifications/{id}` - 获取通知详情
- `POST /api/notifications` - 创建通知（仅管理员）
- `DELETE /api/notifications/{id}` - 删除通知（仅管理员）

### 活动公告
- `GET /api/activities` - 获取活动列表
- `GET /api/activities/{id}` - 获取活动详情
- `POST /api/activities` - 创建活动（仅管理员）
- `DELETE /api/activities/{id}` - 删除活动（仅管理员）

### 失物招领
- `GET /api/lost-items` - 获取失物列表
- `GET /api/lost-items/{id}` - 获取失物详情
- `POST /api/lost-items` - 发布失物（所有认证用户）
- `DELETE /api/lost-items/{id}` - 删除失物（作者或管理员）

## 权限说明

**⚠️ 重要：所有权限验证在后端进行**

- **普通用户 (user)**：可浏览所有内容，只能发布失物招领
- **管理员 (admin)**：可发布课程通知、活动公告，管理所有内容

## 开发

### API 文档

启动服务后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 数据库

默认使用 SQLite (开发环境)。生产环境建议使用 PostgreSQL。

修改 `.env` 中的 `DATABASE_URL`：
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost/campus_hub
```

### JWT 配置

- 默认 token 有效期：24 小时
- 可通过 `.env` 中的 `ACCESS_TOKEN_EXPIRE_MINUTES` 调整
