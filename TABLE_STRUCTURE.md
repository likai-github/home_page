# 数据库表结构总览

## 📊 所有表列表（共 13 个表）

| # | 表名 | 说明 | 迁移版本 | 记录数（预期） |
|---|------|------|----------|---------------|
| 1 | migrations | 迁移版本记录 | 自动创建 | 10 |
| 2 | users | 用户表 | v1 | 0+ |
| 3 | roles | 角色表 | v2 | 5 |
| 4 | permissions | 权限表 | v2 | 25 |
| 5 | menus | 菜单表 | v2 | 10 |
| 6 | user_roles | 用户-角色关联 | v2 | 0+ |
| 7 | role_permissions | 角色-权限关联 | v2 | 100+ |
| 8 | role_menus | 角色-菜单关联 | v2 | 30+ |
| 9 | config | 系统配置 | v3 | 6 |
| 10 | api_platforms | API 平台配置 | v3 | 0+ |
| 11 | api_models | API 模型配置 | v3 | 0+ |
| 12 | posts | 文章表 | v4 | 0+ |
| 13 | projects | 项目表 | v4 | 0+ |
| 14 | comments | 评论表 | v4 | 0+ |

## 🔐 RBAC 核心表（7个）

### 1. users - 用户表
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);
```

### 2. roles - 角色表
```sql
CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**预设数据（5条）：**
| ID | name | display_name | is_system |
|----|------|--------------|-----------|
| 1 | super_admin | 超级管理员 | 1 |
| 2 | admin | 管理员 | 1 |
| 3 | editor | 编辑 | 1 |
| 4 | user | 普通用户 | 1 |
| 5 | viewer | 访客 | 1 |

### 3. permissions - 权限表
```sql
CREATE TABLE permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**预设数据（25条）：**
| 模块 | 权限数量 | 权限示例 |
|------|---------|---------|
| user | 5 | user.view, user.create, user.edit, user.delete, user.manage_role |
| role | 5 | role.view, role.create, role.edit, role.delete, role.assign_permission |
| api | 4 | api.view, api.manage, api.model.view, api.model.toggle |
| system | 4 | system.view, system.edit, system.registration, system.maintenance |
| content | 5 | content.view, content.create, content.edit, content.delete, content.publish |
| menu | 2 | menu.view, menu.manage |

### 4. menus - 菜单表
```sql
CREATE TABLE menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  icon TEXT,
  path TEXT,
  component TEXT,
  parent_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT 1,
  is_enabled BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**预设数据（10条）：**
| ID | name | display_name | icon | path | parent_id |
|----|------|--------------|------|------|-----------|
| 1 | dashboard | 仪表盘 | 📊 | /admin/dashboard | NULL |
| 2 | api | API 管理 | 🔌 | /admin/api | NULL |
| 3 | accounts | 账号管理 | 👥 | NULL | NULL |
| 4 | accounts.users | 用户列表 | 👤 | /admin/accounts/users | 3 |
| 5 | accounts.roles | 角色管理 | 👑 | /admin/accounts/roles | 3 |
| 6 | accounts.permissions | 权限管理 | 🔐 | /admin/accounts/permissions | 3 |
| 7 | content | 内容管理 | 📝 | NULL | NULL |
| 8 | content.posts | 文章管理 | 📄 | /admin/content/posts | 7 |
| 9 | content.projects | 项目管理 | 🚀 | /admin/content/projects | 7 |
| 10 | system | 系统设置 | ⚙️ | /admin/system | NULL |

### 5. user_roles - 用户角色关联表
```sql
CREATE TABLE user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, role_id)
);
```

**说明：** 多对多关系，一个用户可以有多个角色

### 6. role_permissions - 角色权限关联表
```sql
CREATE TABLE role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_id)
);
```

**预设数据：**
- 超级管理员：所有 25 个权限
- 管理员：23 个权限（除了 system.maintenance, role.delete）
- 编辑：5 个权限（content 模块）
- 普通用户：3 个权限（content.view, api.view, api.model.view）
- 访客：6 个权限（所有 *.view 权限）

### 7. role_menus - 角色菜单关联表
```sql
CREATE TABLE role_menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  menu_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, menu_id)
);
```

**预设数据：**
- 超级管理员：所有 10 个菜单
- 管理员：9 个菜单（除了 accounts.permissions）
- 编辑：4 个菜单（dashboard, content, content.posts, content.projects）
- 普通用户：2 个菜单（dashboard, api）
- 访客：1 个菜单（dashboard）

## 🔧 配置和功能表（3个）

### 8. config - 系统配置表
```sql
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**预设数据（6条）：**
| key | value | description |
|-----|-------|-------------|
| allow_registration | true | 是否允许新用户注册 |
| require_email_verification | false | 是否需要邮箱验证 |
| api_rate_limit | 60 | API 速率限制（每分钟） |
| enable_api_logging | true | 是否启用 API 日志 |
| session_timeout | 30 | 会话超时时间（分钟） |
| min_password_length | 8 | 密码最小长度 |

### 9. api_platforms - API 平台配置表
```sql
CREATE TABLE api_platforms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  api_key TEXT,
  base_url TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 10. api_models - API 模型配置表
```sql
CREATE TABLE api_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_id INTEGER NOT NULL,
  model_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT 0,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform_id, model_id)
);
```

### 11. migrations - 迁移版本表
```sql
CREATE TABLE migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 📝 内容管理表（3个）

### 12. posts - 文章表
```sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id INTEGER,
  published BOOLEAN DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);
```

### 13. projects - 项目表
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  github_url TEXT,
  image_url TEXT,
  tags TEXT,
  featured BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 14. comments - 评论表
```sql
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER,
  author_name TEXT NOT NULL,
  author_email TEXT,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id)
);
```

## 🔍 如何验证表是否存在

### 方法 1：查看所有表
```sql
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
```

### 方法 2：统计所有表的记录数
```sql
SELECT 
  'migrations' as table_name, COUNT(*) as count FROM migrations
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'roles', COUNT(*) FROM roles
UNION ALL SELECT 'permissions', COUNT(*) FROM permissions
UNION ALL SELECT 'menus', COUNT(*) FROM menus
UNION ALL SELECT 'user_roles', COUNT(*) FROM user_roles
UNION ALL SELECT 'role_permissions', COUNT(*) FROM role_permissions
UNION ALL SELECT 'role_menus', COUNT(*) FROM role_menus
UNION ALL SELECT 'config', COUNT(*) FROM config
UNION ALL SELECT 'nvidia_models', COUNT(*) FROM nvidia_models
UNION ALL SELECT 'posts', COUNT(*) FROM posts
UNION ALL SELECT 'projects', COUNT(*) FROM projects
UNION ALL SELECT 'comments', COUNT(*) FROM comments;
```

### 方法 3：使用验证脚本
执行项目根目录的 `verify_tables.sql` 文件。

## 📊 ER 关系图

```
users ──┬── user_roles ──── roles ──┬── role_permissions ──── permissions
        │                           │
        │                           └── role_menus ──── menus
        │
        ├── posts
        └── projects

comments ──── posts
```

## ✅ 验证清单

部署后，在 D1 Studio 中验证：

- [ ] 所有 13 个表都存在
- [ ] migrations 表有 10 条记录（v1-v10）
- [ ] roles 表有 5 条记录
- [ ] permissions 表有 25 条记录
- [ ] menus 表有 10 条记录
- [ ] role_permissions 表有 100+ 条记录
- [ ] role_menus 表有 30+ 条记录
- [ ] config 表有 6 条记录

## 🚀 快速验证命令

```bash
# 访问任意 API 触发迁移
curl https://your-site.pages.dev/api/users

# 然后在 D1 Studio 执行
SELECT * FROM migrations ORDER BY version;
```

如果看到 v1 到 v10 的记录，说明所有表都已创建成功！
