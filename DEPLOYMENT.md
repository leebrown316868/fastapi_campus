# Campus Hub 部署指南

## 架构说明

```
┌─────────────────────────────────────────────────────┐
│                    用户浏览器                         │
└─────────────────┬───────────────────────────────────┘
                  │
         ┌────────┴────────┐
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│   Vercel        │  │   Render        │
│  (前端 React)   │  │  (后端 FastAPI) │
│  静态文件托管   │  │  Python 服务器  │
└─────────────────┘  └─────────────────┘
```

**为什么需要分离部署？**
- Vercel 不支持长期运行的 Python 服务器（FastAPI）
- Vercel 专为 Serverless 函数设计（Node.js/Go）
- FastAPI 需要持续运行的进程

---

## 步骤 1: 部署后端 (Render)

### 1.1 准备代码

```bash
# 在 backend/ 目录下创建 .render.yaml（已创建）
cd backend
# 已有 render.yaml 配置文件
```

### 1.2 推送到 GitHub

```bash
git add backend/render.yaml
git commit -m "chore: add render deployment config"
git push origin main
```

### 1.3 在 Render 部署

1. 访问 [render.com](https://render.com)
2. 注册/登录 → 点击 "New +"
3. 选择 "Web Service"
4. 连接 GitHub 仓库
5. 配置：
   - **Name**: campus-hub-api
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 8000`
   - **Instance Type**: Free (可用)

6. 环境变量：
   ```
   DATABASE_URL=sqlite:///./campus_hub.db
   SECRET_KEY=your-random-secret-key-here
   CORS_ORIGINS=https://your-frontend.vercel.app
   ```

7. 点击部署，等待完成

### 1.4 获取后端 URL

部署成功后，Render 会提供类似：
```
https://campus-hub-api.onrender.com
```

---

## 步骤 2: 部署前端 (Vercel)

### 2.1 安装 Vercel CLI

```bash
npm install -g vercel
```

### 2.2 配置环境变量

在 Vercel 项目设置中添加：
```
VITE_API_URL=https://campus-hub-api.onrender.com
```

### 2.3 部署

**方式 A: 通过 Vercel CLI**
```bash
cd fronted
vercel
# 按提示操作：
# - Set up and deploy: Y
# - Scope: 选择你的账户
# - Link to existing project: N (首次)
# - Project name: campus-hub-frontend
# - Directory: ./fronted
# - Override settings: Y
# - VITE_API_URL: 输入你的 Render 后端 URL
```

**方式 B: 通过 Vercel 网站**
1. 访问 [vercel.com](https://vercel.com)
2. 点击 "Add New Project"
3. 导入 GitHub 仓库
4. 配置：
   - **Framework Preset**: Vite
   - **Root Directory**: `fronted`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. 环境变量：
   - `VITE_API_URL` = `https://campus-hub-api.onrender.com`
6. 点击 "Deploy"

---

## 步骤 3: 更新 CORS 配置

**重要：** 回到 Render，更新 `CORS_ORIGINS` 环境变量：

```
CORS_ORIGINS=https://campus-hub-frontend.vercel.app
```

然后在 Render 点击 "Manual Deploy" → "Clear build cache & deploy"

---

## 替代方案对比

| 平台 | 前端 | 后端 | 免费额度 | 推荐度 |
|------|------|------|----------|--------|
| **Vercel + Render** | ✅ | ✅ | 有限 | ⭐⭐⭐⭐⭐ |
| **Vercel + Railway** | ✅ | ✅ | $5/月 | ⭐⭐⭐⭐ |
| **Vercel + Fly.io** | ✅ | ✅ | 有限 | ⭐⭐⭐⭐ |
| **Railway 全栈** | ✅ | ✅ | $5/月 | ⭐⭐⭐⭐⭐ |
| **自建 VPS** | ✅ | ✅ | 按需 | ⭐⭐⭐ |

---

## 常见问题

### Q1: 后端部署后 API 请求失败？
**A:** 检查以下几点：
1. Vercel 环境变量 `VITE_API_URL` 是否正确
2. Render `CORS_ORIGINS` 是否包含 Vercel 域名
3. Render 后端是否成功启动（查看日志）

### Q2: SQLite 数据库在 Render 上持久化？
**A:** Render 免费版每次部署会重置文件系统。解决方案：
- 升级到 Render 磁盘持久化（付费）
- 或改用 PostgreSQL（Render 提供免费 Postgres）

### Q3: 如何使用 PostgreSQL 替代 SQLite？

修改 `backend/.env`：
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

然后在 Render 创建 PostgreSQL 数据库（免费）。

---

## 快速启动检查清单

- [ ] GitHub 仓库已推送最新代码
- [ ] Render 后端部署成功，获取到 URL
- [ ] Vercel 前端 `VITE_API_URL` 配置正确
- [ ] Render `CORS_ORIGINS` 包含 Vercel 域名
- [ ] 测试登录功能是否正常
- [ ] 测试 API 请求是否成功

---

## 域名配置（可选）

### 前端域名
在 Vercel 项目 → Settings → Domains → 添加自定义域名

### 后端域名
1. 在 Render 项目 → Settings → Custom Domains
2. 配置 DNS CNAME 记录指向 `onrender.com`
