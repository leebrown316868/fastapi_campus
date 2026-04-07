# MySQL 迁移文档

> SQLite → MySQL 8.4 数据库迁移记录
> 日期：2026-04-06

---

## 1. 迁移原因

| SQLite | MySQL |
|--------|-------|
| 单文件数据库，并发写入受限 | 支持高并发读写 |
| 无用户权限体系 | 完善的用户/角色权限管理 |
| 无原生 FULLTEXT 索引 | 支持 ngram 中文全文搜索 |
| 备份方案简单 | binlog 增量备份 + mysqldump |
| 不适合生产部署 | 生产级关系型数据库 |

## 2. 依赖变更

### requirements.txt

```diff
- aiosqlite==0.20.0
+ aiomysql==0.2.0
```

```bash
pip install aiomysql cryptography
```

## 3. 配置变更

### backend/.env

```diff
- DATABASE_URL=sqlite+aiosqlite:///./campus_hub.db
+ DATABASE_URL=mysql+aiomysql://campus:campus123@localhost:3306/campus_hub
```

### backend/app/core/config.py

```diff
- DATABASE_URL: str = "sqlite+aiosqlite:///./campus_hub.db"
+ DATABASE_URL: str = "mysql+aiomysql://campus:campus123@localhost:3306/campus_hub"
```

### backend/app/db/database.py

无需改动。SQLAlchemy 2.0 的异步引擎抽象使得切换数据库驱动仅需更改连接字符串。

## 4. MySQL 初始化

```sql
CREATE DATABASE campus_hub DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'campus'@'localhost' IDENTIFIED BY 'campus123';
GRANT ALL PRIVILEGES ON campus_hub.* TO 'campus'@'localhost';
FLUSH PRIVILEGES;
```

## 5. 数据库初始化

```bash
cd backend
python init_db.py
```

SQLAlchemy 根据 ORM 模型自动创建表结构，同时创建测试用户和示例数据。

## 6. FULLTEXT 索引创建

迁移完成后，为搜索功能添加 ngram 全文索引：

```sql
ALTER TABLE notifications ADD FULLTEXT INDEX ft_notifications (title, content, course) WITH PARSER ngram;
ALTER TABLE activities ADD FULLTEXT INDEX ft_activities (title, description, organizer, location) WITH PARSER ngram;
ALTER TABLE lost_items ADD FULLTEXT INDEX ft_lost_items (title, description, location) WITH PARSER ngram;
```

ngram 分词器是 MySQL 8.0 内置的中文分词方案，默认 `ngram_token_size=2`，支持中文双字词切分。

## 7. 模型层变更

代码层面无需改动。SQLAlchemy 模型中的字段类型（String, Text, Boolean, JSON, DateTime）在 MySQL 方言下自动映射为对应的 MySQL 类型。

唯一注意事项：`role` 是 MySQL 保留字，SQLAlchemy 会自动加反引号转义（`users.\`role\``）。

## 8. Docker 部署变更

docker-compose.yml 需添加 MySQL 服务（当前本地开发阶段使用外部 MySQL，后续部署时补充）。
