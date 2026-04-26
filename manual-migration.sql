-- 手动迁移 SQL 脚本
-- 如果自动迁移失败，可以使用此文件手动创建表
-- 使用方法: npx wrangler d1 execute DB --file=./manual-migration.sql

-- ============================================
-- 1. 创建迁移版本表
-- ============================================
CREATE TABLE IF NOT EXISTS migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. 创建配置表（系统设置需要）
-- ============================================
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. 创建 API 平台表（模型管理需要）
-- ============================================
CREATE TABLE IF NOT EXISTS api_platforms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  api_key TEXT,
  base_url TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. 创建 API 模型表（模型管理需要）
-- ============================================
CREATE TABLE IF NOT EXISTS api_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_id INTEGER NOT NULL,
  model_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT 0,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform_id, model_id)
);

-- ============================================
-- 5. 创建用户表
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME
);

-- ============================================
-- 6. 创建角色表
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. 创建权限表
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. 创建菜单表
-- ============================================
CREATE TABLE IF NOT EXISTS menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  icon TEXT,
  path TEXT,
  component TEXT,
  parent_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT 1,
  is_enabled BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. 创建关联表
-- ============================================
CREATE TABLE IF NOT EXISTS user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS role_menus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  menu_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role_id, menu_id)
);

-- ============================================
-- 10. 创建内容表
-- ============================================
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id INTEGER,
  published BOOLEAN DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER,
  author_name TEXT NOT NULL,
  author_email TEXT,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 11. 创建索引
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
CREATE INDEX IF NOT EXISTS idx_api_models_platform ON api_models(platform_id);
CREATE INDEX IF NOT EXISTS idx_api_models_enabled ON api_models(enabled);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

-- ============================================
-- 12. 插入初始数据 - 系统配置
-- ============================================
INSERT OR IGNORE INTO config (key, value, description) VALUES 
  ('allow_registration', 'true', '是否允许新用户注册'),
  ('require_email_verification', 'false', '是否需要邮箱验证'),
  ('api_rate_limit', '60', 'API 速率限制（每分钟）'),
  ('enable_api_logging', 'true', '是否启用 API 日志'),
  ('session_timeout', '30', '会话超时时间（分钟）'),
  ('min_password_length', '8', '密码最小长度');

-- ============================================
-- 13. 插入初始数据 - 系统角色
-- ============================================
INSERT OR IGNORE INTO roles (id, name, display_name, description, is_system) VALUES 
  (1, 'super_admin', '超级管理员', '拥有所有权限，不可删除', 1),
  (2, 'admin', '管理员', '拥有大部分管理权限', 1),
  (3, 'editor', '编辑', '可以管理内容', 1),
  (4, 'user', '普通用户', '基础用户权限', 1),
  (5, 'viewer', '访客', '只读权限', 1);

-- ============================================
-- 14. 记录迁移版本
-- ============================================
INSERT OR IGNORE INTO migrations (version, name) VALUES 
  (1, 'initial_schema'),
  (2, 'rbac_tables'),
  (3, 'config_and_api_platforms'),
  (4, 'content_tables'),
  (5, 'seed_roles'),
  (6, 'seed_permissions'),
  (7, 'seed_menus'),
  (8, 'seed_role_permissions'),
  (9, 'seed_role_menus'),
  (10, 'seed_config');

-- ============================================
-- 完成
-- ============================================
-- 执行完成后，请访问 /api/database/status 验证
