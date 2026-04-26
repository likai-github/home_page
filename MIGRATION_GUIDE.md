# 数据库迁移系统使用指南

## 🎯 功能说明

这是一个自动化的数据库迁移系统，每次服务启动时会自动检查并执行未完成的数据库变更。

## ✨ 特性

- ✅ **自动执行**：服务启动时自动运行
- ✅ **版本控制**：记录每次迁移的版本
- ✅ **幂等性**：重复执行不会出错
- ✅ **顺序执行**：按版本号顺序执行
- ✅ **错误处理**：迁移失败不影响服务启动

## 📁 文件结构

```
functions/
├── _middleware.js          # 中间件，自动触发迁移
└── db/
    └── migrations.js       # 迁移定义文件
```

## 🔄 工作原理

1. **首次请求触发**：当第一个 API 请求到达时
2. **检查版本**：读取 `migrations` 表获取当前版本
3. **执行迁移**：运行所有未执行的迁移
4. **记录版本**：将执行的迁移版本写入数据库
5. **标记完成**：设置标志避免重复执行

## 📊 当前迁移列表

| 版本 | 名称 | 说明 |
|------|------|------|
| 1 | initial_schema | 创建用户表 |
| 2 | rbac_tables | 创建 RBAC 相关表 |
| 3 | config_and_nvidia_tables | 配置和 NVIDIA 表 |
| 4 | content_tables | 内容相关表 |
| 5 | seed_roles | 初始化角色数据 |
| 6 | seed_permissions | 初始化权限数据 |
| 7 | seed_menus | 初始化菜单数据 |
| 8 | seed_role_permissions | 角色权限关联 |
| 9 | seed_role_menus | 角色菜单关联 |
| 10 | seed_config | 初始化系统配置 |

## 🆕 如何添加新迁移

### 1. 编辑 `functions/db/migrations.js`

在 `migrations` 数组末尾添加新的迁移：

```javascript
{
  version: 11,  // 递增版本号
  name: 'add_user_profile',  // 迁移名称
  up: async (db) => {
    // 执行 SQL
    await db.prepare(`
      ALTER TABLE users ADD COLUMN bio TEXT
    `).run();
    
    await db.prepare(`
      ALTER TABLE users ADD COLUMN website TEXT
    `).run();
  }
}
```

### 2. 提交代码并部署

```bash
git add functions/db/migrations.js
git commit -m "添加用户资料字段迁移"
git push
```

### 3. 自动执行

部署完成后，下次有请求时会自动执行新迁移。

## 📝 迁移编写规范

### ✅ 好的实践

```javascript
{
  version: 11,
  name: 'add_audit_log',
  up: async (db) => {
    // 1. 使用 IF NOT EXISTS 避免重复创建
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    // 2. 创建索引
    await db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)'
    ).run();
    
    // 3. 插入数据前检查是否已存在
    const count = await db.prepare(
      'SELECT COUNT(*) as count FROM config WHERE key = ?'
    ).bind('audit_enabled').first();
    
    if (count.count === 0) {
      await db.prepare(
        'INSERT INTO config (key, value) VALUES (?, ?)'
      ).bind('audit_enabled', 'true').run();
    }
  }
}
```

### ❌ 避免的做法

```javascript
{
  version: 11,
  name: 'bad_migration',
  up: async (db) => {
    // ❌ 不使用 IF NOT EXISTS，重复执行会报错
    await db.prepare(`
      CREATE TABLE audit_logs (...)
    `).run();
    
    // ❌ 直接插入数据，重复执行会冲突
    await db.prepare(
      'INSERT INTO config (key, value) VALUES (?, ?)'
    ).bind('audit_enabled', 'true').run();
    
    // ❌ 删除数据，不可逆
    await db.prepare('DELETE FROM users').run();
  }
}
```

## 🔍 查看迁移状态

### 在 D1 Studio 中查询

```sql
-- 查看已执行的迁移
SELECT * FROM migrations ORDER BY version;

-- 查看当前版本
SELECT MAX(version) as current_version FROM migrations;
```

### 在日志中查看

部署后，在 Cloudflare Pages 的日志中可以看到：

```
🔄 开始数据库迁移...
📊 当前数据库版本: 10
✅ 数据库已是最新版本
```

或者：

```
🔄 开始数据库迁移...
📊 当前数据库版本: 8
📦 发现 2 个待执行的迁移
⏳ 执行迁移 v9: seed_role_menus
✅ 迁移 v9 完成
⏳ 执行迁移 v10: seed_config
✅ 迁移 v10 完成
🎉 所有迁移执行完成！
```

## 🛠️ 常见场景

### 场景 1：添加新表

```javascript
{
  version: 11,
  name: 'add_notifications_table',
  up: async (db) => {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    
    await db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)'
    ).run();
  }
}
```

### 场景 2：添加新字段

```javascript
{
  version: 12,
  name: 'add_user_phone',
  up: async (db) => {
    // SQLite 不支持 IF NOT EXISTS for ALTER TABLE
    // 需要先检查字段是否存在
    try {
      await db.prepare(`
        ALTER TABLE users ADD COLUMN phone TEXT
      `).run();
    } catch (error) {
      // 字段已存在，忽略错误
      if (!error.message.includes('duplicate column')) {
        throw error;
      }
    }
  }
}
```

### 场景 3：修改数据

```javascript
{
  version: 13,
  name: 'update_user_status',
  up: async (db) => {
    // 将所有 NULL 状态改为 'active'
    await db.prepare(`
      UPDATE users SET status = 'active' WHERE status IS NULL
    `).run();
  }
}
```

### 场景 4：添加新权限

```javascript
{
  version: 14,
  name: 'add_notification_permissions',
  up: async (db) => {
    // 检查权限是否已存在
    const existing = await db.prepare(
      "SELECT id FROM permissions WHERE name = ?"
    ).bind('notification.view').first();
    
    if (!existing) {
      await db.prepare(`
        INSERT INTO permissions (name, display_name, description, module)
        VALUES ('notification.view', '查看通知', '查看系统通知', 'notification')
      `).run();
      
      // 为所有角色分配新权限
      const roles = await db.prepare('SELECT id FROM roles').all();
      const permId = await db.prepare(
        "SELECT id FROM permissions WHERE name = ?"
      ).bind('notification.view').first();
      
      for (const role of roles.results) {
        await db.prepare(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)'
        ).bind(role.id, permId.id).run();
      }
    }
  }
}
```

## ⚠️ 注意事项

1. **版本号必须递增**：不要跳过版本号
2. **不要修改已执行的迁移**：已部署的迁移不应该修改
3. **保持幂等性**：迁移应该可以安全地重复执行
4. **测试迁移**：在本地测试后再部署
5. **备份数据**：重要变更前先备份数据库

## 🔄 回滚迁移

目前系统不支持自动回滚。如果需要回滚：

### 方法 1：手动回滚（推荐）

1. 在 D1 Studio 中手动执行回滚 SQL
2. 删除 migrations 表中的对应记录

```sql
-- 删除迁移记录
DELETE FROM migrations WHERE version = 11;

-- 手动回滚变更（根据具体情况）
DROP TABLE IF EXISTS notifications;
```

### 方法 2：创建新的迁移

```javascript
{
  version: 15,
  name: 'rollback_notifications',
  up: async (db) => {
    await db.prepare('DROP TABLE IF EXISTS notifications').run();
  }
}
```

## 📊 监控和调试

### 启用详细日志

在 `functions/_middleware.js` 中已经包含了日志输出。

### 手动触发迁移

如果需要手动触发，可以：

1. 删除 `migrations` 表中的记录
2. 重启服务或发送新请求

```sql
-- 重置到特定版本
DELETE FROM migrations WHERE version > 5;
```

## 🎓 最佳实践

1. **小步迁移**：每次迁移只做一件事
2. **命名清晰**：使用描述性的迁移名称
3. **添加注释**：在复杂的迁移中添加注释
4. **测试充分**：在本地和测试环境充分测试
5. **文档记录**：重要的迁移要写文档说明

## 🚀 快速开始

1. **首次部署**：系统会自动执行所有迁移（v1-v10）
2. **添加新功能**：在 `migrations.js` 中添加新迁移
3. **提交部署**：推送代码，自动执行新迁移
4. **验证结果**：查看日志和数据库确认

就这么简单！🎉
