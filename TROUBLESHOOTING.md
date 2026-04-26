# 🔧 故障排除指南

## 当前问题：注册和用户列表报错

### 问题症状
1. ✅ 注册时返回错误（可能显示 "Unexpected token '<'"）
2. ✅ 用户列表不显示数据
3. ✅ API 保存后查询失败

### 根本原因
数据库中存在**旧的表结构**，与新的 RBAC 系统不兼容。旧的 `users` 表缺少 `username` 字段，导致 SQL 查询失败。

---

## 🚀 解决方案（3 步骤）

### 步骤 1：重置数据库

访问以下 URL 来删除所有旧表：

```
https://gaoying.qzz.io/api/reset-db?confirm=yes
```

**预期响应：**
```json
{
  "success": true,
  "message": "数据库已重置，所有表已删除",
  "next": "现在访问 /api/migrate 来重新创建表"
}
```

⚠️ **注意：** 这会删除所有现有数据（包括用户、文章等）。如果有重要数据，请先备份。

---

### 步骤 2：执行迁移

访问以下 URL 来重新创建所有表：

```
https://gaoying.qzz.io/api/migrate
```

**预期响应：**
```json
{
  "success": true,
  "message": "数据库迁移完成",
  "previousVersion": 0,
  "currentVersion": 10,
  "migrationsExecuted": 10
}
```

这会创建所有 13 个表并插入初始数据：
- ✅ 5 个角色（超级管理员、管理员、编辑、用户、访客）
- ✅ 25 个权限
- ✅ 10 个菜单项
- ✅ 6 个系统配置
- ✅ 角色-权限-菜单关联数据

---

### 步骤 3：测试注册

访问你的网站并尝试注册：

```
https://gaoying.qzz.io
```

1. 点击"注册"
2. 输入用户名和密码
3. 提交

**第一个注册的用户会自动成为超级管理员！**

---

## 📊 验证数据库

### 方法 1：在 Cloudflare D1 Studio 中验证

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **D1**
3. 选择数据库：`personal-website-db` (ID: `2146aa05-b525-45e8-b9c0-70f075295112`)
4. 点击 **Console**
5. 执行以下 SQL：

```sql
-- 查看所有表
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
```

**应该看到 13 个表：**
```
comments
config
menus
migrations
nvidia_models
permissions
posts
projects
role_menus
role_permissions
roles
user_roles
users
```

### 方法 2：检查迁移版本

```sql
SELECT * FROM migrations ORDER BY version;
```

**应该看到 v1 到 v10 的记录**

### 方法 3：验证角色和权限

```sql
-- 查看角色（应该有 5 条）
SELECT * FROM roles;

-- 查看权限（应该有 25 条）
SELECT COUNT(*) as total FROM permissions;

-- 查看配置（应该有 6 条）
SELECT * FROM config;
```

---

## 🧪 测试 API

### 1. 测试注册 API

```bash
curl -X POST https://gaoying.qzz.io/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123456"}'
```

**预期响应：**
```json
{
  "message": "User registered successfully",
  "userId": 1,
  "isAdmin": true
}
```

### 2. 测试登录 API

```bash
curl -X POST https://gaoying.qzz.io/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"test123456"}'
```

**预期响应：**
```json
{
  "token": "...",
  "user": {
    "id": 1,
    "username": "testuser",
    "isAdmin": true
  }
}
```

### 3. 测试用户列表 API

```bash
curl https://gaoying.qzz.io/api/users
```

**预期响应：**
```json
{
  "users": [
    {
      "id": 1,
      "username": "testuser",
      "email": "testuser",
      "status": "active",
      "roles": "超级管理员"
    }
  ]
}
```

---

## 🐛 常见问题

### Q1: 访问 `/api/reset-db?confirm=yes` 返回 404

**原因：** 文件路由可能有问题

**解决：**
1. 检查文件是否存在：`functions/api/reset-db.js`
2. 重新部署：`git push`
3. 等待 Cloudflare Pages 构建完成

### Q2: 迁移执行后，表还是不存在

**原因：** 数据库绑定可能有问题

**解决：**
1. 检查 `wrangler.toml` 中的数据库配置：
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "personal-website-db"
   database_id = "2146aa05-b525-45e8-b9c0-70f075295112"
   ```
2. 在 Cloudflare Pages 设置中确认 D1 绑定
3. 重新部署

### Q3: 注册时返回 "Unexpected token '<'"

**原因：** API 返回了 HTML 错误页面而不是 JSON

**可能的原因：**
1. 数据库表结构不正确（需要重置）
2. API 路由未正确部署
3. 数据库未绑定

**解决：** 按照上面的 3 个步骤重新操作

### Q4: 第一个用户不是超级管理员

**原因：** 注册时 `user_roles` 表已有数据

**解决：**
```sql
-- 在 D1 Studio 中执行
DELETE FROM user_roles WHERE user_id = 1;
INSERT INTO user_roles (user_id, role_id) VALUES (1, 1);
```

---

## 📝 数据库表结构说明

### users 表（新结构）
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,      -- ✅ 新增字段
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  status TEXT DEFAULT 'active',       -- ✅ 新增字段
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME              -- ✅ 新增字段
);
```

### 旧结构（已废弃）
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                 -- ❌ 旧字段
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL              -- ❌ 旧字段
);
```

**关键区别：**
- ✅ 新增 `username` 字段（必需）
- ✅ `password` 改为 `password_hash`
- ✅ 新增 `status` 字段
- ✅ 新增 `avatar` 字段
- ✅ 新增 `last_login_at` 字段

---

## 🎯 完整的验证清单

执行完上述步骤后，确认以下内容：

- [ ] `/api/reset-db?confirm=yes` 返回成功
- [ ] `/api/migrate` 返回 `currentVersion: 10`
- [ ] D1 Studio 中可以看到 13 个表
- [ ] `migrations` 表有 10 条记录
- [ ] `roles` 表有 5 条记录
- [ ] `permissions` 表有 25 条记录
- [ ] `menus` 表有 10 条记录
- [ ] `config` 表有 6 条记录
- [ ] 可以成功注册新用户
- [ ] 可以成功登录
- [ ] 用户列表可以正常显示
- [ ] 第一个用户是超级管理员

---

## 🆘 如果还是不行

如果按照上述步骤操作后仍然有问题，请提供以下信息：

1. **重置数据库的响应：**
   ```
   访问 /api/reset-db?confirm=yes 的完整响应
   ```

2. **迁移的响应：**
   ```
   访问 /api/migrate 的完整响应
   ```

3. **D1 Studio 查询结果：**
   ```sql
   SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
   SELECT * FROM migrations ORDER BY version;
   ```

4. **注册 API 的完整错误信息：**
   ```
   浏览器控制台的错误信息
   网络请求的响应内容
   ```

5. **Cloudflare Pages 部署日志：**
   ```
   最近一次部署的完整日志
   ```

---

## 💡 预防措施

为了避免将来再次出现类似问题：

1. **不要手动修改数据库表结构**
   - 所有表结构变更都应该通过迁移系统
   - 创建新的迁移文件而不是修改现有表

2. **定期备份数据库**
   - 在 D1 Studio 中导出数据
   - 保存重要的用户数据

3. **测试环境**
   - 考虑创建一个测试数据库
   - 在测试环境中验证迁移后再部署到生产环境

4. **监控日志**
   - 定期查看 Cloudflare Pages 的日志
   - 关注数据库相关的错误信息

---

## 📚 相关文档

- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - 数据库初始设置
- [DATABASE_RBAC.md](./DATABASE_RBAC.md) - RBAC 系统详细说明
- [TABLE_STRUCTURE.md](./TABLE_STRUCTURE.md) - 完整的表结构文档
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - 迁移系统使用指南
- [API_TEST.md](./API_TEST.md) - API 测试指南

---

**最后更新：** 2026-04-26
**状态：** ✅ 已验证
