# 🔧 快速修复指南

## 问题：系统设置和模型管理编辑报错

### 原因
数据库表未创建，需要执行数据库迁移。

---

## ⚡ 最快解决方法

### 方法 1：浏览器控制台（最简单）

1. 打开你的网站
2. 按 `F12` 打开开发者工具
3. 切换到 `Console`（控制台）标签
4. 粘贴以下代码并回车：

```javascript
fetch('/api/database/migrate', { method: 'POST' })
  .then(r => r.json())
  .then(data => {
    console.log('✅ 迁移完成:', data);
    alert('数据库修复成功！请刷新页面。');
  })
  .catch(err => {
    console.error('❌ 迁移失败:', err);
    alert('修复失败，请查看控制台错误信息。');
  });
```

5. 等待提示"数据库修复成功"
6. 刷新页面
7. 重新尝试编辑系统设置或模型管理

---

### 方法 2：命令行（本地开发）

```bash
# 1. 启动开发服务器（如果还没启动）
npm run dev

# 2. 在新终端窗口运行修复脚本
node fix-database.js

# 3. 刷新浏览器页面
```

---

### 方法 3：Cloudflare Wrangler（生产环境）

```bash
# 直接执行 SQL 文件创建所有表
npx wrangler d1 execute DB --file=./manual-migration.sql

# 或者逐个命令执行
npx wrangler d1 execute DB --command "SELECT * FROM migrations"
```

---

## 🔍 验证修复是否成功

### 检查 1：访问数据库状态页面

在浏览器中访问：
```
https://your-domain.pages.dev/api/database/status
```

应该看到类似这样的响应：
```json
{
  "currentVersion": 10,
  "latestVersion": 10,
  "needsUpdate": false,
  "tableCount": 14,
  "status": "up_to_date"
}
```

### 检查 2：测试系统设置

1. 登录管理后台
2. 进入"系统设置"
3. 修改任意设置（如切换"允许新用户注册"）
4. 点击保存
5. 应该显示"✓ 设置已保存"

### 检查 3：测试模型管理

1. 进入"API 管理"
2. 点击"添加平台"
3. 填写信息并保存
4. 应该成功创建平台

---

## ❌ 如果还是不行

### 完全重置数据库（会删除所有数据！）

**浏览器控制台方法：**

```javascript
// 1. 重置数据库
fetch('/api/database/reset', { method: 'POST' })
  .then(r => r.json())
  .then(data => {
    console.log('✅ 重置完成:', data);
    // 2. 执行迁移
    return fetch('/api/database/migrate', { method: 'POST' });
  })
  .then(r => r.json())
  .then(data => {
    console.log('✅ 迁移完成:', data);
    alert('数据库已完全重建！请刷新页面。');
  })
  .catch(err => {
    console.error('❌ 操作失败:', err);
  });
```

**命令行方法：**

```bash
node fix-database.js --reset
```

---

## 📋 常见错误和解决方法

### 错误 1: "Database not configured"

**原因**: Cloudflare D1 数据库未绑定

**解决**:
1. 登录 Cloudflare Dashboard
2. 进入你的 Pages 项目
3. 设置 → Functions → D1 database bindings
4. 添加绑定：变量名 `DB`，选择你的 D1 数据库
5. 重新部署项目

### 错误 2: "Table does not exist"

**原因**: 迁移未执行或执行失败

**解决**: 使用上面的"方法 1"重新执行迁移

### 错误 3: "UNIQUE constraint failed"

**原因**: 尝试插入重复数据

**解决**: 这通常不是问题，迁移系统会自动跳过已存在的数据

---

## 🆘 需要帮助？

如果以上方法都无法解决，请提供以下信息：

1. **错误截图**（浏览器控制台和页面错误）
2. **数据库状态**：访问 `/api/database/status` 的返回结果
3. **表列表**：访问 `/api/database/tables` 的返回结果
4. **环境信息**：
   - 本地开发还是生产环境？
   - 使用的 Node.js 版本？
   - Cloudflare Pages 还是其他平台？

---

## 📚 相关文档

- 详细修复指南：`DATABASE_FIX_GUIDE.md`
- 诊断脚本：`diagnose-db.js`
- 修复脚本：`fix-database.js`
- 手动 SQL：`manual-migration.sql`
