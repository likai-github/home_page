# 手动执行数据库迁移指南

## 🚨 问题：自动迁移没有执行

如果部署到 Cloudflare Pages 后，数据库表没有自动创建，可以使用以下方法手动触发迁移。

## 🎯 方法 1：访问迁移 API（推荐）

### 步骤 1：访问迁移端点

在浏览器中访问：
```
https://your-site.pages.dev/api/migrate
```

或使用 curl：
```bash
curl https://your-site.pages.dev/api/migrate
```

### 步骤 2：查看响应

成功响应：
```json
{
  "success": true,
  "message": "数据库迁移完成",
  "previousVersion": 0,
  "currentVersion": 10,
  "migrationsExecuted": 10
}
```

失败响应：
```json
{
  "error": "Migration failed",
  "message": "错误信息",
  "stack": "错误堆栈"
}
```

### 步骤 3：验证结果

在 Cloudflare D1 Studio 中执行：
```sql
SELECT * FROM migrations ORDER BY version;
```

应该看到 v1 到 v10 的记录。

## 🎯 方法 2：在 D1 Studio 手动执行 SQL

如果 API 方法失败，可以手动执行 SQL。

### 步骤 1：生成密码哈希

在本地执行：
```bash
node -e "const crypto = require('crypto'); console.log(crypto.createHash('sha256').update('admin123').digest('hex'));"
```

输出：
```
240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
```

### 步骤 2：编辑 schema_rbac.sql

打开 `schema_rbac.sql` 文件，搜索 `YOUR_HASHED_PASSWORD_HERE`，替换为上面的哈希值。

### 步骤 3：在 D1 Studio 执行

1. 打开 Cloudflare Dashboard
2. 进入 D1 数据库：`personal-website-db`
3. 点击 "Console"
4. 复制 `schema_rbac.sql` 的内容
5. 分段执行（D1 Studio 有字符限制）

**建议分段执行：**

**第一段：创建表**
```sql
-- 复制从 "CREATE TABLE IF NOT EXISTS users" 
-- 到所有 CREATE TABLE 语句结束
```

**第二段：创建索引**
```sql
-- 复制所有 CREATE INDEX 语句
```

**第三段：插入角色**
```sql
-- 复制 INSERT INTO roles 语句
```

**第四段：插入权限**
```sql
-- 复制 INSERT INTO permissions 语句
```

**第五段：插入菜单**
```sql
-- 复制 INSERT INTO menus 语句
```

**第六段：插入关联数据**
```sql
-- 复制所有 INSERT INTO role_permissions 等语句
```

## 🎯 方法 3：使用 Wrangler CLI

### 步骤 1：安装 Wrangler

```bash
npm install -g wrangler
```

### 步骤 2：登录

```bash
wrangler login
```

### 步骤 3：执行迁移脚本

```bash
# 编辑 schema_rbac.sql 替换密码哈希后执行
wrangler d1 execute personal-website-db --file=./schema_rbac.sql
```

## 🔍 验证迁移是否成功

### 检查表是否存在

```sql
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
```

应该看到 13 个表：
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

### 检查数据是否插入

```sql
-- 检查角色（应该有 5 条）
SELECT COUNT(*) as count FROM roles;

-- 检查权限（应该有 25 条）
SELECT COUNT(*) as count FROM permissions;

-- 检查菜单（应该有 10 条）
SELECT COUNT(*) as count FROM menus;

-- 检查角色权限关联（应该有 100+ 条）
SELECT COUNT(*) as count FROM role_permissions;
```

## 🐛 常见问题

### 问题 1：访问 /api/migrate 返回 404

**原因：** 文件未正确部署

**解决：**
```bash
# 确认文件存在
ls functions/api/migrate.js

# 重新部署
git add .
git commit -m "添加迁移 API"
git push
```

### 问题 2：返回 "Database not configured"

**原因：** wrangler.toml 中数据库配置不正确

**解决：**
检查 `wrangler.toml`：
```toml
[[d1_databases]]
binding = "DB"
database_name = "personal-website-db"
database_id = "2146aa05-b525-45e8-b9c0-70f075295112"
```

确保 `database_id` 正确。

### 问题 3：迁移执行失败

**原因：** SQL 语法错误或数据冲突

**解决：**
1. 查看错误信息
2. 在 D1 Studio 中手动执行失败的 SQL
3. 检查是否有数据冲突

### 问题 4：部分表创建成功，部分失败

**原因：** 迁移中断

**解决：**
```sql
-- 查看已执行的迁移
SELECT * FROM migrations ORDER BY version;

-- 删除失败的迁移记录
DELETE FROM migrations WHERE version > X;

-- 重新访问 /api/migrate
```

## 📊 查看 Cloudflare Pages 日志

1. 打开 Cloudflare Dashboard
2. 进入 Workers & Pages
3. 选择你的项目
4. 点击 "Logs" 或 "Real-time Logs"
5. 查找迁移相关日志：
   ```
   🚀 检测到数据库，开始执行迁移...
   📊 当前数据库版本: 0
   ⏳ 执行迁移 v1: initial_schema
   ```

## 🎯 推荐流程

1. **首先尝试方法 1**（访问 /api/migrate）
2. 如果失败，查看 Cloudflare Pages 日志
3. 如果还是失败，使用方法 3（Wrangler CLI）
4. 最后才使用方法 2（手动执行 SQL）

## ✅ 成功标志

当你在 D1 Studio 中执行：
```sql
SELECT * FROM migrations ORDER BY version;
```

看到 10 条记录（v1 到 v10），说明迁移成功！

## 🔄 重新执行迁移

如果需要重新执行所有迁移：

```sql
-- 删除所有表（危险操作！）
DROP TABLE IF EXISTS migrations;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
-- ... 删除所有表

-- 然后重新访问 /api/migrate
```

或者只重置迁移记录：
```sql
-- 删除迁移记录
DELETE FROM migrations;

-- 重新访问 /api/migrate
```

## 📞 需要帮助？

如果以上方法都不行，请提供：
1. Cloudflare Pages 的日志截图
2. 访问 /api/migrate 的响应
3. D1 Studio 中的错误信息

我会帮你诊断问题！
