# 数据库修复工具包

## 🎯 快速开始

### 最简单的方法：使用网页工具

1. 访问: `https://your-domain.pages.dev/db-fix.html`
2. 点击"检查状态"查看数据库状态
3. 如果需要更新，点击"执行迁移"
4. 完成！

### 或者使用浏览器控制台

1. 打开你的网站
2. 按 `F12` 打开开发者工具
3. 在 Console 中执行：

```javascript
fetch('/api/database/migrate', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

---

## 📦 工具文件说明

### 1. 网页工具（推荐）
- **文件**: `public/db-fix.html`
- **访问**: `https://your-domain.pages.dev/db-fix.html`
- **功能**:
  - ✅ 检查数据库状态
  - ✅ 执行迁移
  - ✅ 查看所有表
  - ✅ 重置数据库
  - ✅ 实时日志显示

### 2. 诊断脚本
- **文件**: `diagnose-db.js`
- **运行**: `npm run db:diagnose`
- **功能**: 全面诊断数据库问题

### 3. 修复脚本
- **文件**: `fix-database.js`
- **运行**: `npm run db:fix`
- **功能**: 自动修复数据库

### 4. 手动 SQL
- **文件**: `manual-migration.sql`
- **运行**: `npm run db:migrate`
- **功能**: 手动创建所有表

### 5. 文档
- **`QUICK_FIX_CN.md`** - 快速修复指南
- **`DATABASE_FIX_GUIDE.md`** - 详细修复指南
- **`PROBLEM_SUMMARY_CN.md`** - 问题总结

---

## 🚀 使用场景

### 场景 1: 首次部署到 Cloudflare Pages

```bash
# 部署后立即执行
curl -X POST https://your-domain.pages.dev/api/database/migrate
```

或访问: `https://your-domain.pages.dev/db-fix.html`

### 场景 2: 本地开发环境

```bash
# 启动开发服务器
npm run dev

# 在新终端运行
npm run db:diagnose  # 诊断问题
npm run db:fix       # 修复数据库
```

### 场景 3: 系统设置或模型管理报错

1. 访问 `https://your-domain.pages.dev/db-fix.html`
2. 点击"检查状态"
3. 如果显示"需要更新"，点击"执行迁移"
4. 刷新管理后台页面

### 场景 4: 数据库完全损坏

```bash
# 使用网页工具
访问 /db-fix.html → 点击"重置数据库"

# 或使用命令行
npm run db:reset
```

---

## 📋 npm 脚本

已添加到 `package.json`:

```bash
npm run db:diagnose  # 诊断数据库问题
npm run db:fix       # 修复数据库
npm run db:reset     # 重置数据库（删除所有数据）
npm run db:migrate   # 使用 Wrangler 执行迁移
npm run db:status    # 查看迁移状态
npm run db:tables    # 列出所有表
```

---

## ✅ 验证修复

### 方法 1: 使用网页工具

访问 `/db-fix.html`，应该看到：
- ✅ 当前版本: 10
- ✅ 最新版本: 10
- ✅ 状态: ✅ 最新
- ✅ 表数量: 14

### 方法 2: 测试功能

1. **系统设置**
   - 管理后台 → 系统设置
   - 修改任意设置
   - 应该能成功保存

2. **模型管理**
   - 管理后台 → API 管理
   - 添加新平台
   - 应该能成功创建

### 方法 3: API 检查

```bash
# 检查状态
curl https://your-domain.pages.dev/api/database/status

# 检查表
curl https://your-domain.pages.dev/api/database/tables
```

---

## 🔧 故障排除

### 问题: "Database not configured"

**解决方法**:
1. 检查 Cloudflare Pages 的 D1 绑定
2. 确保绑定名称为 `DB`
3. 重新部署项目

### 问题: 迁移执行失败

**解决方法**:
```bash
# 1. 重置数据库
npm run db:reset

# 2. 或使用手动 SQL
npm run db:migrate
```

### 问题: 表已存在但结构不对

**解决方法**:
```bash
# 使用 Wrangler 删除表
npx wrangler d1 execute DB --command "DROP TABLE IF EXISTS config"
npx wrangler d1 execute DB --command "DROP TABLE IF EXISTS api_platforms"
npx wrangler d1 execute DB --command "DROP TABLE IF EXISTS api_models"

# 重新执行迁移
curl -X POST https://your-domain.pages.dev/api/database/migrate
```

---

## 📊 数据库架构

### 关键表

| 表名 | 用途 | 重要性 |
|------|------|--------|
| `config` | 系统配置 | ⭐⭐⭐ |
| `api_platforms` | API 平台 | ⭐⭐⭐ |
| `api_models` | AI 模型 | ⭐⭐⭐ |
| `users` | 用户 | ⭐⭐⭐ |
| `roles` | 角色 | ⭐⭐ |
| `permissions` | 权限 | ⭐⭐ |
| `menus` | 菜单 | ⭐⭐ |
| `posts` | 文章 | ⭐ |
| `projects` | 项目 | ⭐ |

### 迁移版本

- v1-2: 用户和 RBAC 表
- **v3: 配置和 API 平台表** ⭐ (系统设置和模型管理需要)
- v4: 内容表
- v5-10: 初始数据

---

## 🎓 工作原理

### 自动迁移流程

```
用户访问 API
    ↓
functions/_middleware.js 拦截请求
    ↓
检查是否已执行迁移
    ↓
如果未执行，调用 runMigrations()
    ↓
检查 migrations 表中的当前版本
    ↓
执行所有未执行的迁移
    ↓
更新 migrations 表
    ↓
继续处理原始请求
```

### 为什么需要手动触发？

在 Cloudflare Pages 生产环境中：
- Workers 可能冷启动
- 中间件可能未正确初始化
- 首次部署需要手动触发一次

---

## 🌟 最佳实践

### 部署流程

```bash
# 1. 构建项目
npm run build

# 2. 部署到 Cloudflare Pages
npm run deploy

# 3. 立即执行迁移（重要！）
curl -X POST https://your-domain.pages.dev/api/database/migrate

# 4. 验证
curl https://your-domain.pages.dev/api/database/status
```

### 定期检查

建议每次部署后：
1. 访问 `/db-fix.html` 检查状态
2. 确认所有表都存在
3. 测试关键功能

---

## 📞 获取帮助

如果问题仍未解决：

1. **收集信息**
   ```bash
   # 数据库状态
   curl https://your-domain.pages.dev/api/database/status
   
   # 表列表
   curl https://your-domain.pages.dev/api/database/tables
   
   # 迁移历史
   curl https://your-domain.pages.dev/api/database/migrations
   ```

2. **检查日志**
   - Cloudflare Dashboard → Pages → Functions → Logs
   - 浏览器控制台 (F12)

3. **提供信息**
   - 错误截图
   - API 响应
   - Cloudflare 日志
   - 环境配置

---

## 📝 更新日志

### 2024-xx-xx
- ✅ 创建网页修复工具 (`db-fix.html`)
- ✅ 添加诊断脚本 (`diagnose-db.js`)
- ✅ 添加修复脚本 (`fix-database.js`)
- ✅ 创建手动 SQL (`manual-migration.sql`)
- ✅ 添加 npm 脚本
- ✅ 编写完整文档

---

## 🎉 总结

**最快解决方法**: 访问 `/db-fix.html` 点击"执行迁移"

**最简单方法**: 浏览器控制台执行
```javascript
fetch('/api/database/migrate', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

**最可靠方法**: 使用 Wrangler CLI
```bash
npm run db:migrate
```

选择最适合你的方法，祝修复顺利！🚀
