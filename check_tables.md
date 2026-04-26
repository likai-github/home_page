# 检查数据库表结构

## 🔍 如何验证表是否创建成功

### 方法 1：在 D1 Studio 中查询

1. 打开 Cloudflare Dashboard
2. 进入 D1 数据库：`personal-website-db`
3. 点击 "Console" 或 "Query"
4. 执行以下 SQL：

```sql
-- 查看所有表
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
```

**应该看到以下表：**
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
-- 查看已执行的迁移
SELECT * FROM migrations ORDER BY version;
```

**应该看到 v1 到 v10 的迁移记录**

### 方法 3：验证数据

```sql
-- 查看角色
SELECT * FROM roles;

-- 查看权限
SELECT COUNT(*) as total FROM permissions;

-- 查看菜单
SELECT * FROM menus ORDER BY sort_order;
```

## 📊 完整的表结构

### 核心 RBAC 表

1. **users** - 用户表
   ```sql
   SELECT * FROM users;
   ```

2. **roles** - 角色表（应该有 5 条记录）
   ```sql
   SELECT * FROM roles;
   ```
   预期结果：
   - super_admin - 超级管理员
   - admin - 管理员
   - editor - 编辑
   - user - 普通用户
   - viewer - 访客

3. **permissions** - 权限表（应该有 25 条记录）
   ```sql
   SELECT COUNT(*) as total FROM permissions;
   SELECT module, COUNT(*) as count FROM permissions GROUP BY module;
   ```

4. **menus** - 菜单表（应该有 10 条记录）
   ```sql
   SELECT * FROM menus ORDER BY sort_order;
   ```

5. **user_roles** - 用户角色关联表
   ```sql
   SELECT * FROM user_roles;
   ```

6. **role_permissions** - 角色权限关联表
   ```sql
   SELECT COUNT(*) as total FROM role_permissions;
   ```

7. **role_menus** - 角色菜单关联表
   ```sql
   SELECT COUNT(*) as total FROM role_menus;
   ```

## 🚨 如果表不存在

### 原因 1：迁移还未执行

**解决方法：**
1. 访问你的网站任意 API 端点，触发迁移
2. 例如：`https://your-site.pages.dev/api/users`
3. 查看 Cloudflare Pages 的日志

### 原因 2：数据库未配置

**检查 wrangler.toml：**
```toml
[[d1_databases]]
binding = "DB"
database_name = "personal-website-db"
database_id = "2146aa05-b525-45e8-b9c0-70f075295112"
```

### 原因 3：中间件未生效

**检查文件是否存在：**
- `functions/_middleware.js`
- `functions/db/migrations.js`

## 🔧 手动触发迁移

如果自动迁移没有执行，可以手动触发：

### 方法 1：访问 API
```bash
curl https://your-site.pages.dev/api/users
```

### 方法 2：在 D1 Studio 手动执行

如果自动迁移失败，可以手动执行 `schema_rbac.sql` 文件。

但记得先生成密码哈希：
```bash
node -e "const crypto = require('crypto'); console.log(crypto.createHash('sha256').update('admin123').digest('hex'));"
```

输出：
```
240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
```

## 📝 验证清单

- [ ] `migrations` 表存在
- [ ] `migrations` 表中有 10 条记录（v1-v10）
- [ ] `users` 表存在
- [ ] `roles` 表存在且有 5 条记录
- [ ] `permissions` 表存在且有 25 条记录
- [ ] `menus` 表存在且有 10 条记录
- [ ] `user_roles` 表存在
- [ ] `role_permissions` 表存在且有数据
- [ ] `role_menus` 表存在且有数据
- [ ] `config` 表存在且有 6 条配置

## 🎯 快速验证脚本

复制以下 SQL 到 D1 Studio 执行：

```sql
-- 快速验证所有表
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

**预期结果：**
```
migrations: 10
users: 0 (或更多)
roles: 5
permissions: 25
menus: 10
user_roles: 0 (或更多)
role_permissions: 约 100+
role_menus: 约 30+
config: 6
nvidia_models: 0
posts: 0
projects: 0
comments: 0
```

## 💡 提示

如果看到所有表都存在且有数据，说明迁移成功！

如果某些表缺失，请：
1. 检查 Cloudflare Pages 部署日志
2. 查看是否有错误信息
3. 手动执行缺失的迁移
