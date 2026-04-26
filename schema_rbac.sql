-- ============================================
-- RBAC (Role-Based Access Control) 数据库设计
-- ============================================

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  status TEXT DEFAULT 'active', -- active, inactive, banned
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);

-- 2. 角色表
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL, -- admin, user, editor, viewer 等
  display_name TEXT NOT NULL, -- 显示名称：管理员、普通用户等
  description TEXT,
  is_system BOOLEAN DEFAULT 0, -- 是否系统角色（不可删除）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. 权限表
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL, -- user.create, user.delete, api.manage 等
  display_name TEXT NOT NULL, -- 显示名称
  description TEXT,
  module TEXT NOT NULL, -- 模块：user, api, system, content 等
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 菜单表
CREATE TABLE IF NOT EXISTS menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  icon TEXT, -- 图标
  path TEXT, -- 路由路径
  component TEXT, -- 组件名称
  parent_id INTEGER, -- 父菜单 ID
  sort_order INTEGER DEFAULT 0, -- 排序
  is_visible BOOLEAN DEFAULT 1, -- 是否可见
  is_enabled BOOLEAN DEFAULT 1, -- 是否启用
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES menus(id)
);

-- 5. 用户-角色关联表（多对多）
CREATE TABLE IF NOT EXISTS user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE(user_id, role_id)
);

-- 6. 角色-权限关联表（多对多）
CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

-- 7. 角色-菜单关联表（多对多）
CREATE TABLE IF NOT EXISTS role_menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  menu_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE,
  UNIQUE(role_id, menu_id)
);

-- 8. 配置表（保留原有）
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. NVIDIA 模型配置表（保留原有）
CREATE TABLE IF NOT EXISTS nvidia_models (
  model_id TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. 文章表（保留原有）
CREATE TABLE IF NOT EXISTS posts (
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

-- 11. 项目表（保留原有）
CREATE TABLE IF NOT EXISTS projects (
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

-- 12. 评论表（保留原有）
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER,
  author_name TEXT NOT NULL,
  author_email TEXT,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

-- ============================================
-- 创建索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_role_menus_role ON role_menus(role_id);
CREATE INDEX IF NOT EXISTS idx_role_menus_menu ON role_menus(menu_id);
CREATE INDEX IF NOT EXISTS idx_menus_parent ON menus(parent_id);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

-- ============================================
-- 初始化系统角色
-- ============================================
INSERT INTO roles (name, display_name, description, is_system) VALUES 
  ('super_admin', '超级管理员', '拥有所有权限，不可删除', 1),
  ('admin', '管理员', '拥有大部分管理权限', 1),
  ('editor', '编辑', '可以管理内容', 1),
  ('user', '普通用户', '基础用户权限', 1),
  ('viewer', '访客', '只读权限', 1);

-- ============================================
-- 初始化权限
-- ============================================

-- 用户管理权限
INSERT INTO permissions (name, display_name, description, module) VALUES 
  ('user.view', '查看用户', '查看用户列表和详情', 'user'),
  ('user.create', '创建用户', '创建新用户', 'user'),
  ('user.edit', '编辑用户', '编辑用户信息', 'user'),
  ('user.delete', '删除用户', '删除用户', 'user'),
  ('user.manage_role', '管理用户角色', '分配和移除用户角色', 'user');

-- 角色管理权限
INSERT INTO permissions (name, display_name, description, module) VALUES 
  ('role.view', '查看角色', '查看角色列表', 'role'),
  ('role.create', '创建角色', '创建新角色', 'role'),
  ('role.edit', '编辑角色', '编辑角色信息', 'role'),
  ('role.delete', '删除角色', '删除角色', 'role'),
  ('role.assign_permission', '分配权限', '为角色分配权限', 'role');

-- API 管理权限
INSERT INTO permissions (name, display_name, description, module) VALUES 
  ('api.view', '查看 API', '查看 API 配置', 'api'),
  ('api.manage', '管理 API', '配置和管理 API', 'api'),
  ('api.model.view', '查看模型', '查看 AI 模型列表', 'api'),
  ('api.model.toggle', '切换模型', '启用/禁用模型', 'api');

-- 系统设置权限
INSERT INTO permissions (name, display_name, description, module) VALUES 
  ('system.view', '查看设置', '查看系统设置', 'system'),
  ('system.edit', '修改设置', '修改系统设置', 'system'),
  ('system.registration', '注册控制', '控制用户注册开关', 'system'),
  ('system.maintenance', '系统维护', '清除缓存、重置等', 'system');

-- 内容管理权限
INSERT INTO permissions (name, display_name, description, module) VALUES 
  ('content.view', '查看内容', '查看文章和项目', 'content'),
  ('content.create', '创建内容', '创建文章和项目', 'content'),
  ('content.edit', '编辑内容', '编辑文章和项目', 'content'),
  ('content.delete', '删除内容', '删除文章和项目', 'content'),
  ('content.publish', '发布内容', '发布和取消发布', 'content');

-- 菜单管理权限
INSERT INTO permissions (name, display_name, description, module) VALUES 
  ('menu.view', '查看菜单', '查看菜单配置', 'menu'),
  ('menu.manage', '管理菜单', '配置菜单结构', 'menu');

-- ============================================
-- 初始化菜单
-- ============================================
INSERT INTO menus (name, display_name, icon, path, component, parent_id, sort_order) VALUES 
  ('dashboard', '仪表盘', '📊', '/admin/dashboard', 'DashboardView', NULL, 1),
  ('api', 'API 管理', '🔌', '/admin/api', 'ApiManagement', NULL, 2),
  ('accounts', '账号管理', '👥', NULL, NULL, NULL, 3),
  ('accounts.users', '用户列表', '👤', '/admin/accounts/users', 'UserManagement', 3, 1),
  ('accounts.roles', '角色管理', '👑', '/admin/accounts/roles', 'RoleManagement', 3, 2),
  ('accounts.permissions', '权限管理', '🔐', '/admin/accounts/permissions', 'PermissionManagement', 3, 3),
  ('content', '内容管理', '📝', NULL, NULL, NULL, 4),
  ('content.posts', '文章管理', '📄', '/admin/content/posts', 'PostManagement', 7, 1),
  ('content.projects', '项目管理', '🚀', '/admin/content/projects', 'ProjectManagement', 7, 2),
  ('system', '系统设置', '⚙️', '/admin/system', 'SystemSettings', NULL, 5);

-- ============================================
-- 为超级管理员分配所有权限
-- ============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- ============================================
-- 为管理员分配大部分权限（除了系统维护）
-- ============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE name NOT IN ('system.maintenance', 'role.delete');

-- ============================================
-- 为编辑分配内容相关权限
-- ============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE module = 'content';

-- ============================================
-- 为普通用户分配基础权限
-- ============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE name IN ('content.view', 'api.view', 'api.model.view');

-- ============================================
-- 为访客分配只读权限
-- ============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE name LIKE '%.view';

-- ============================================
-- 为角色分配菜单
-- ============================================

-- 超级管理员：所有菜单
INSERT INTO role_menus (role_id, menu_id)
SELECT 1, id FROM menus;

-- 管理员：除了权限管理外的所有菜单
INSERT INTO role_menus (role_id, menu_id)
SELECT 2, id FROM menus WHERE name != 'accounts.permissions';

-- 编辑：仪表盘和内容管理
INSERT INTO role_menus (role_id, menu_id)
SELECT 3, id FROM menus WHERE name IN ('dashboard', 'content', 'content.posts', 'content.projects');

-- 普通用户：仪表盘和 API 查看
INSERT INTO role_menus (role_id, menu_id)
SELECT 4, id FROM menus WHERE name IN ('dashboard', 'api');

-- 访客：仅仪表盘
INSERT INTO role_menus (role_id, menu_id)
SELECT 5, id FROM menus WHERE name = 'dashboard';

-- ============================================
-- 创建默认管理员账号（密码：admin123）
-- ============================================
-- 注意：这个哈希值是 'admin123' 的 SHA-256
INSERT INTO users (username, email, password_hash, status) VALUES 
  ('admin', 'admin@example.com', 'YOUR_HASHED_PASSWORD_HERE', 'active');

-- 为默认管理员分配超级管理员角色
INSERT INTO user_roles (user_id, role_id) VALUES (1, 1);

-- ============================================
-- 初始化系统配置
-- ============================================
INSERT INTO config (key, value, description) VALUES 
  ('allow_registration', 'true', '是否允许新用户注册'),
  ('require_email_verification', 'false', '是否需要邮箱验证'),
  ('api_rate_limit', '60', 'API 速率限制（每分钟）'),
  ('enable_api_logging', 'true', '是否启用 API 日志'),
  ('session_timeout', '30', '会话超时时间（分钟）'),
  ('min_password_length', '8', '密码最小长度');

-- ============================================
-- 示例数据
-- ============================================

-- 示例用户
INSERT INTO users (username, email, password_hash, status) VALUES 
  ('editor1', 'editor@example.com', 'YOUR_HASHED_PASSWORD_HERE', 'active'),
  ('user1', 'user@example.com', 'YOUR_HASHED_PASSWORD_HERE', 'active');

-- 分配角色
INSERT INTO user_roles (user_id, role_id) VALUES 
  (2, 3), -- editor1 -> 编辑
  (3, 4); -- user1 -> 普通用户

-- 示例文章
INSERT INTO posts (title, content, author_id, published) VALUES 
  ('欢迎使用 RBAC 系统', '这是一个完整的基于角色的访问控制系统。', 1, 1),
  ('权限管理最佳实践', '本文介绍如何合理设计权限系统...', 2, 1);

-- 示例项目
INSERT INTO projects (name, description, url, tags, featured) VALUES 
  ('RBAC 管理系统', '基于 Vue 3 和 Cloudflare 的权限管理系统', 'https://example.com', '["Vue", "RBAC", "Cloudflare"]', 1);
