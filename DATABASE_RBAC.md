# RBAC 数据库设计文档

## 📊 数据库架构概览

这是一个完整的 **RBAC (Role-Based Access Control)** 基于角色的访问控制系统设计。

## 🗄️ 核心表结构

### 1. **users** - 用户表
存储用户基本信息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| username | TEXT | 用户名（唯一） |
| email | TEXT | 邮箱（唯一） |
| password_hash | TEXT | 密码哈希 |
| avatar | TEXT | 头像 URL |
| status | TEXT | 状态：active, inactive, banned |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |
| last_login_at | DATETIME | 最后登录时间 |

### 2. **roles** - 角色表
定义系统角色

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | 角色名称（唯一）：admin, user 等 |
| display_name | TEXT | 显示名称：管理员、普通用户 |
| description | TEXT | 角色描述 |
| is_system | BOOLEAN | 是否系统角色（不可删除） |
| created_at | DATETIME | 创建时间 |

**预设角色：**
- `super_admin` - 超级管理员（所有权限）
- `admin` - 管理员（大部分权限）
- `editor` - 编辑（内容管理）
- `user` - 普通用户（基础权限）
- `viewer` - 访客（只读）

### 3. **permissions** - 权限表
定义系统权限

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | 权限名称（唯一）：user.create 等 |
| display_name | TEXT | 显示名称 |
| description | TEXT | 权限描述 |
| module | TEXT | 所属模块：user, api, system 等 |
| created_at | DATETIME | 创建时间 |

**权限模块：**
- `user` - 用户管理
- `role` - 角色管理
- `api` - API 管理
- `system` - 系统设置
- `content` - 内容管理
- `menu` - 菜单管理

### 4. **menus** - 菜单表
定义系统菜单结构

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| name | TEXT | 菜单名称 |
| display_name | TEXT | 显示名称 |
| icon | TEXT | 图标 |
| path | TEXT | 路由路径 |
| component | TEXT | 组件名称 |
| parent_id | INTEGER | 父菜单 ID |
| sort_order | INTEGER | 排序 |
| is_visible | BOOLEAN | 是否可见 |
| is_enabled | BOOLEAN | 是否启用 |

**菜单结构：**
```
📊 仪表盘
🔌 API 管理
👥 账号管理
  ├─ 👤 用户列表
  ├─ 👑 角色管理
  └─ 🔐 权限管理
📝 内容管理
  ├─ 📄 文章管理
  └─ 🚀 项目管理
⚙️ 系统设置
```

### 5. **user_roles** - 用户角色关联表
多对多关系：一个用户可以有多个角色

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 用户 ID |
| role_id | INTEGER | 角色 ID |
| created_at | DATETIME | 创建时间 |

### 6. **role_permissions** - 角色权限关联表
多对多关系：一个角色可以有多个权限

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| role_id | INTEGER | 角色 ID |
| permission_id | INTEGER | 权限 ID |
| created_at | DATETIME | 创建时间 |

### 7. **role_menus** - 角色菜单关联表
多对多关系：一个角色可以访问多个菜单

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| role_id | INTEGER | 角色 ID |
| menu_id | INTEGER | 菜单 ID |
| created_at | DATETIME | 创建时间 |

## 🔐 权限设计

### 权限命名规范
格式：`模块.操作`

**示例：**
- `user.view` - 查看用户
- `user.create` - 创建用户
- `user.edit` - 编辑用户
- `user.delete` - 删除用户
- `api.manage` - 管理 API
- `system.edit` - 修改系统设置

### 角色权限矩阵

| 权限 | 超级管理员 | 管理员 | 编辑 | 用户 | 访客 |
|------|-----------|--------|------|------|------|
| user.* | ✅ | ✅ | ❌ | ❌ | ❌ |
| role.* | ✅ | ⚠️ | ❌ | ❌ | ❌ |
| api.manage | ✅ | ✅ | ❌ | ❌ | ❌ |
| api.view | ✅ | ✅ | ❌ | ✅ | ✅ |
| system.edit | ✅ | ✅ | ❌ | ❌ | ❌ |
| content.* | ✅ | ✅ | ✅ | ❌ | ❌ |
| content.view | ✅ | ✅ | ✅ | ✅ | ✅ |

⚠️ 管理员不能删除角色

## 📋 使用指南

### 1. 初始化数据库

在 Cloudflare D1 Studio 中执行 `schema_rbac.sql` 文件。

**注意：** 需要先生成密码哈希值。

### 2. 生成密码哈希

在项目中运行：
```bash
node -e "const crypto = require('crypto'); console.log(crypto.createHash('sha256').update('admin123').digest('hex'));"
```

输出：
```
240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
```

将这个值替换 SQL 文件中的 `YOUR_HASHED_PASSWORD_HERE`。

### 3. 默认账号

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin123 | 超级管理员 | 拥有所有权限 |
| editor1 | admin123 | 编辑 | 可管理内容 |
| user1 | admin123 | 普通用户 | 基础权限 |

### 4. 权限检查流程

```
用户登录
  ↓
查询用户角色 (user_roles)
  ↓
查询角色权限 (role_permissions)
  ↓
查询角色菜单 (role_menus)
  ↓
返回用户权限和菜单列表
```

### 5. API 权限验证

```javascript
// 检查用户是否有某个权限
async function hasPermission(userId, permissionName) {
  const result = await db.query(`
    SELECT COUNT(*) as count
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = ? AND p.name = ?
  `, [userId, permissionName]);
  
  return result.count > 0;
}

// 使用示例
if (await hasPermission(userId, 'user.delete')) {
  // 允许删除用户
} else {
  // 拒绝访问
}
```

### 6. 获取用户菜单

```javascript
async function getUserMenus(userId) {
  const menus = await db.query(`
    SELECT DISTINCT m.*
    FROM user_roles ur
    JOIN role_menus rm ON ur.role_id = rm.role_id
    JOIN menus m ON rm.menu_id = m.id
    WHERE ur.user_id = ? AND m.is_enabled = 1 AND m.is_visible = 1
    ORDER BY m.sort_order
  `, [userId]);
  
  return buildMenuTree(menus);
}
```

## 🔄 扩展建议

### 1. 添加新角色
```sql
INSERT INTO roles (name, display_name, description, is_system) 
VALUES ('moderator', '版主', '可以审核内容', 0);
```

### 2. 添加新权限
```sql
INSERT INTO permissions (name, display_name, description, module) 
VALUES ('comment.moderate', '审核评论', '审核用户评论', 'content');
```

### 3. 为角色分配权限
```sql
INSERT INTO role_permissions (role_id, permission_id) 
VALUES (
  (SELECT id FROM roles WHERE name = 'moderator'),
  (SELECT id FROM permissions WHERE name = 'comment.moderate')
);
```

### 4. 添加新菜单
```sql
INSERT INTO menus (name, display_name, icon, path, component, parent_id, sort_order) 
VALUES ('comments', '评论管理', '💬', '/admin/comments', 'CommentManagement', NULL, 6);
```

### 5. 为角色分配菜单
```sql
INSERT INTO role_menus (role_id, menu_id) 
VALUES (
  (SELECT id FROM roles WHERE name = 'moderator'),
  (SELECT id FROM menus WHERE name = 'comments')
);
```

## 🎯 最佳实践

1. **最小权限原则**：只授予必要的权限
2. **角色分层**：超级管理员 > 管理员 > 编辑 > 用户 > 访客
3. **系统角色保护**：`is_system = 1` 的角色不可删除
4. **权限命名规范**：统一使用 `模块.操作` 格式
5. **菜单权限分离**：菜单可见性和操作权限分开控制
6. **审计日志**：记录重要操作（建议添加 audit_logs 表）

## 📊 ER 图

```
users ──┬── user_roles ──── roles ──┬── role_permissions ──── permissions
        │                           │
        │                           └── role_menus ──── menus
        │
        └── posts
        └── projects
```

## 🚀 下一步

1. 执行 `schema_rbac.sql` 初始化数据库
2. 更新后端 API 以支持 RBAC
3. 更新前端组件以支持动态菜单和权限控制
4. 添加权限检查中间件
5. 实现角色和权限管理界面

## 📝 注意事项

- 密码必须使用哈希存储，不要明文
- 定期备份数据库
- 生产环境建议使用更安全的密码哈希算法（如 bcrypt）
- 考虑添加操作日志表记录敏感操作
- 实现会话管理和 token 刷新机制
