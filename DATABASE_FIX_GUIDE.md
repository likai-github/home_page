# 数据库问题诊断和修复指南

## 问题描述

系统设置和模型管理编辑功能报错，原因是数据库表未正确创建。

## 问题根源

1. **缺失的数据库表**
   - `config` 表（系统设置需要）
   - `api_platforms` 表（API 平台管理需要）
   - `api_models` 表（模型管理需要）

2. **迁移未执行**
   - 项目使用迁移系统管理数据库架构
   - 迁移应该在首次请求时自动执行
   - 但在 Cloudflare Pages 生产环境可能未正确触发

## 解决方案

### 方案 1：通过管理后台修复（推荐）

1. **访问数据库管理页面**
   - 登录管理后台
   - 进入"数据库管理"页面

2. **检查数据库状态**
   - 查看当前版本和最新版本
   - 查看表列表，确认是否缺少表

3. **执行迁移**
   - 点击"执行迁移"按钮
   - 等待迁移完成
   - 刷新页面验证

### 方案 2：通过 API 修复

#### 本地开发环境

```bash
# 1. 启动开发服务器
npm run dev

# 2. 运行诊断脚本
node diagnose-db.js

# 3. 运行修复脚本
node fix-database.js

# 4. 如果需要重置数据库（会删除所有数据）
node fix-database.js --reset
```

#### 生产环境（Cloudflare Pages）

```bash
# 使用 curl 执行迁移
curl -X POST https://your-domain.pages.dev/api/database/migrate

# 或使用 fetch
fetch('https://your-domain.pages.dev/api/database/migrate', {
  method: 'POST'
}).then(r => r.json()).then(console.log)
```

### 方案 3：通过 Wrangler CLI 修复

```bash
# 1. 查看当前数据库状态
npx wrangler d1 execute DB --command "SELECT * FROM migrations"

# 2. 手动执行迁移 SQL（如果自动迁移失败）
npx wrangler d1 execute DB --file=./manual-migration.sql

# 3. 验证表是否创建
npx wrangler d1 execute DB --command "SELECT name FROM sqlite_master WHERE type='table'"
```

## 验证修复

### 1. 检查数据库表

访问 `/api/database/tables` 应该看到以下表：

- ✅ `migrations` - 迁移版本记录
- ✅ `users` - 用户表
- ✅ `roles` - 角色表
- ✅ `permissions` - 权限表
- ✅ `menus` - 菜单表
- ✅ `user_roles` - 用户-角色关联
- ✅ `role_permissions` - 角色-权限关联
- ✅ `role_menus` - 角色-菜单关联
- ✅ `config` - 系统配置 ⭐
- ✅ `api_platforms` - API 平台配置 ⭐
- ✅ `api_models` - API 模型配置 ⭐
- ✅ `posts` - 文章表
- ✅ `projects` - 项目表
- ✅ `comments` - 评论表

### 2. 测试系统设置

1. 访问管理后台 → 系统设置
2. 尝试修改任意设置（如"允许新用户注册"）
3. 应该能成功保存并显示"✓ 设置已保存"

### 3. 测试模型管理

1. 访问管理后台 → API 管理
2. 点击"添加平台"
3. 填写平台信息并保存
4. 应该能成功创建平台

## 常见问题

### Q1: 迁移执行失败

**症状**: 执行迁移时报错

**解决方法**:
```bash
# 1. 重置数据库（警告：会删除所有数据）
curl -X POST https://your-domain.pages.dev/api/database/reset

# 2. 重新执行迁移
curl -X POST https://your-domain.pages.dev/api/database/migrate
```

### Q2: 表已存在但结构不对

**症状**: 表存在但字段不匹配

**解决方法**:
```bash
# 使用 Wrangler 删除特定表
npx wrangler d1 execute DB --command "DROP TABLE IF EXISTS config"
npx wrangler d1 execute DB --command "DROP TABLE IF EXISTS api_platforms"
npx wrangler d1 execute DB --command "DROP TABLE IF EXISTS api_models"

# 然后执行迁移
curl -X POST https://your-domain.pages.dev/api/database/migrate
```

### Q3: Cloudflare Pages 环境变量问题

**症状**: 本地正常，生产环境报错

**检查项**:
1. Cloudflare Pages 设置中是否绑定了 D1 数据库
2. 绑定名称是否为 `DB`（与 wrangler.toml 一致）
3. 是否重新部署了最新代码

**修复步骤**:
1. 登录 Cloudflare Dashboard
2. 进入 Pages 项目设置
3. 找到 "Functions" → "D1 database bindings"
4. 确认绑定名称为 `DB`
5. 重新部署项目

### Q4: 中间件未执行迁移

**症状**: 访问 API 但迁移没有自动运行

**可能原因**:
- Cloudflare Pages 的冷启动问题
- 中间件加载失败

**解决方法**:
```bash
# 手动触发迁移
curl -X POST https://your-domain.pages.dev/api/database/migrate
```

## 预防措施

### 1. 部署前检查

在部署到生产环境前，确保：

```bash
# 1. 本地测试迁移
npm run dev
node diagnose-db.js

# 2. 检查 wrangler.toml 配置
cat wrangler.toml | grep -A 5 "d1_databases"

# 3. 验证所有 API 端点
npm run test  # 如果有测试
```

### 2. 生产环境部署后

```bash
# 1. 立即执行迁移
curl -X POST https://your-domain.pages.dev/api/database/migrate

# 2. 验证数据库状态
curl https://your-domain.pages.dev/api/database/status

# 3. 检查表列表
curl https://your-domain.pages.dev/api/database/tables
```

### 3. 监控和日志

在 Cloudflare Dashboard 中：
1. 查看 Functions 日志
2. 检查是否有迁移相关的错误
3. 监控 D1 数据库的查询日志

## 技术细节

### 迁移系统工作原理

1. **自动触发**: 首次 API 请求时，中间件自动执行迁移
2. **版本控制**: 使用 `migrations` 表记录已执行的版本
3. **幂等性**: 重复执行迁移不会出错，已执行的会跳过

### 迁移版本列表

- v1: `initial_schema` - 用户表
- v2: `rbac_tables` - RBAC 相关表
- v3: `config_and_api_platforms` - 配置和 API 平台表 ⭐
- v4: `content_tables` - 内容相关表
- v5-10: 初始数据种子

### 关键文件

- `functions/db/migrations.js` - 迁移定义
- `functions/_middleware.js` - 全局中间件
- `functions/api/_middleware.js` - API 中间件
- `functions/api/database/[[path]].js` - 数据库管理 API
- `functions/api/settings/[[path]].js` - 系统设置 API
- `functions/api/platforms/[[path]].js` - 平台管理 API

## 联系支持

如果以上方法都无法解决问题，请提供：

1. 错误信息截图
2. 浏览器控制台日志
3. Cloudflare Functions 日志
4. 数据库状态信息（`/api/database/status`）
5. 表列表信息（`/api/database/tables`）
