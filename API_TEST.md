# API 测试指南

## 🧪 测试所有 API 端点

### 1. 数据库迁移 API

```bash
# 执行迁移
curl https://gaoying.qzz.io/api/migrate

# 预期响应
{
  "success": true,
  "message": "数据库迁移完成",
  "currentVersion": 10
}
```

### 2. 用户注册 API

```bash
# 注册第一个用户（自动成为超级管理员）
curl -X POST https://gaoying.qzz.io/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 预期响应
{
  "message": "User registered successfully",
  "userId": 1,
  "isAdmin": true
}
```

### 3. 用户登录 API

```bash
# 登录
curl -X POST https://gaoying.qzz.io/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 预期响应
{
  "token": "...",
  "user": {
    "id": 1,
    "username": "admin",
    "isAdmin": true
  }
}
```

### 4. 获取用户列表 API

```bash
# 获取所有用户
curl https://gaoying.qzz.io/api/users

# 预期响应
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin",
      "avatar": null,
      "status": "active",
      "created_at": "2026-04-26...",
      "roles": "超级管理员"
    }
  ]
}
```

### 5. NVIDIA API Key 保存

```bash
# 保存 API Key
curl -X POST https://gaoying.qzz.io/api/nvidia/api-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"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"}'

# 预期响应
{
  "message": "API Key saved successfully"
}
```

### 6. 获取 NVIDIA API Key

```bash
# 获取保存的 API Key
curl https://gaoying.qzz.io/api/nvidia/api-key

# 预期响应
{
  "apiKey": "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"
}
```

### 7. 获取 NVIDIA 模型列表

```bash
# 获取模型列表
curl -X POST https://gaoying.qzz.io/api/nvidia/models \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"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"}'

# 预期响应
{
  "data": [
    {
      "id": "model-name",
      "owned_by": "nvidia",
      ...
    }
  ]
}
```

### 8. 获取文章列表

```bash
# 获取所有文章
curl https://gaoying.qzz.io/api/posts

# 预期响应
{
  "posts": []
}
```

### 9. 系统设置 API

```bash
# 获取系统设置
curl https://gaoying.qzz.io/api/settings

# 预期响应
{
  "settings": {
    "allowRegistration": true,
    "requireEmailVerification": false,
    "apiRateLimit": 60,
    ...
  }
}
```

## 🔍 验证数据库

在 D1 Studio 中执行：

```sql
-- 1. 查看所有表
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

-- 2. 查看用户
SELECT * FROM users;

-- 3. 查看用户角色
SELECT 
  u.username,
  r.display_name as role_name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id;

-- 4. 查看配置
SELECT * FROM config;

-- 5. 查看角色
SELECT * FROM roles;

-- 6. 查看权限数量
SELECT module, COUNT(*) as count FROM permissions GROUP BY module;
```

## ✅ 成功标志

如果所有测试都通过，你应该看到：

1. ✅ 迁移成功（10 个迁移已执行）
2. ✅ 可以注册用户
3. ✅ 可以登录
4. ✅ 用户列表显示正确
5. ✅ API Key 可以保存和读取
6. ✅ 所有表都存在且有数据

## 🐛 常见问题

### 问题 1：返回 HTML 而不是 JSON

**原因：** API 路径不对或文件未部署

**解决：**
```bash
# 检查文件是否存在
ls functions/api/auth/[[path]].js
ls functions/api/nvidia/[[path]].js

# 重新部署
git push
```

### 问题 2：Database not configured

**原因：** wrangler.toml 配置不对

**解决：**
检查 `wrangler.toml`：
```toml
[[d1_databases]]
binding = "DB"
database_name = "personal-website-db"
database_id = "2146aa05-b525-45e8-b9c0-70f075295112"
```

### 问题 3：表不存在

**原因：** 迁移未执行

**解决：**
```bash
curl https://gaoying.qzz.io/api/migrate
```

### 问题 4：用户列表为空

**原因：** 还没有注册用户

**解决：**
先注册一个用户，然后再查看列表。

## 📊 完整测试流程

```bash
# 1. 执行迁移
curl https://gaoying.qzz.io/api/migrate

# 2. 注册用户
curl -X POST https://gaoying.qzz.io/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 3. 登录
curl -X POST https://gaoying.qzz.io/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 4. 获取用户列表
curl https://gaoying.qzz.io/api/users

# 5. 保存 API Key
curl -X POST https://gaoying.qzz.io/api/nvidia/api-key \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"your-api-key"}'

# 6. 获取 API Key
curl https://gaoying.qzz.io/api/nvidia/api-key
```

全部成功后，你的系统就完全可用了！🎉
