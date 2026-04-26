// 数据库迁移系统
// 每次服务启动时自动执行

export const migrations = [
  {
    version: 1,
    name: 'initial_schema',
    up: async (db) => {
      // 先删除旧的 users 表（如果存在且结构不兼容）
      try {
        // 检查 users 表是否存在
        const tableInfo = await db.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
        ).first();
        
        if (tableInfo) {
          // 检查表结构
          const columns = await db.prepare("PRAGMA table_info(users)").all();
          const hasUsername = columns.results.some(col => col.name === 'username');
          
          if (!hasUsername) {
            // 旧表结构，需要删除重建
            console.log('⚠️ 检测到旧的 users 表结构，正在重建...');
            await db.prepare('DROP TABLE IF EXISTS users').run();
          }
        }
      } catch (error) {
        console.log('检查 users 表时出错:', error.message);
      }

      // 创建用户表
      await db.prepare(`
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
        )
      `).run();

      // 创建索引
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)').run();
    }
  },
  {
    version: 2,
    name: 'rbac_tables',
    up: async (db) => {
      // 角色表
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          description TEXT,
          is_system BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // 权限表
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          description TEXT,
          module TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // 菜单表
      await db.prepare(`
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
        )
      `).run();

      // 用户-角色关联表
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS user_roles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          role_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, role_id)
        )
      `).run();

      // 角色-权限关联表
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS role_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          role_id INTEGER NOT NULL,
          permission_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(role_id, permission_id)
        )
      `).run();

      // 角色-菜单关联表
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS role_menus (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          role_id INTEGER NOT NULL,
          menu_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(role_id, menu_id)
        )
      `).run();

      // 创建索引
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_role_menus_role ON role_menus(role_id)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_role_menus_menu ON role_menus(menu_id)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_menus_parent ON menus(parent_id)').run();
    }
  },
  {
    version: 3,
    name: 'config_and_api_platforms',
    up: async (db) => {
      // 配置表
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          description TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // API 平台表
      await db.prepare(`
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
        )
      `).run();

      // API 模型表
      await db.prepare(`
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
        )
      `).run();

      // 创建索引
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_api_models_platform ON api_models(platform_id)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_api_models_enabled ON api_models(enabled)').run();
    }
  },
  {
    version: 4,
    name: 'content_tables',
    up: async (db) => {
      // 文章表
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          author_id INTEGER,
          published BOOLEAN DEFAULT 0,
          views INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // 项目表
      await db.prepare(`
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
        )
      `).run();

      // 评论表
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER,
          author_name TEXT NOT NULL,
          author_email TEXT,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // 创建索引
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id)').run();
    }
  },
  {
    version: 5,
    name: 'seed_roles',
    up: async (db) => {
      // 检查是否已有角色
      const roleCount = await db.prepare('SELECT COUNT(*) as count FROM roles').first();
      if (roleCount.count > 0) return; // 已有数据，跳过

      // 插入系统角色
      const roles = [
        { name: 'super_admin', display_name: '超级管理员', description: '拥有所有权限，不可删除', is_system: 1 },
        { name: 'admin', display_name: '管理员', description: '拥有大部分管理权限', is_system: 1 },
        { name: 'editor', display_name: '编辑', description: '可以管理内容', is_system: 1 },
        { name: 'user', display_name: '普通用户', description: '基础用户权限', is_system: 1 },
        { name: 'viewer', display_name: '访客', description: '只读权限', is_system: 1 }
      ];

      for (const role of roles) {
        await db.prepare(
          'INSERT INTO roles (name, display_name, description, is_system) VALUES (?, ?, ?, ?)'
        ).bind(role.name, role.display_name, role.description, role.is_system).run();
      }
    }
  },
  {
    version: 6,
    name: 'seed_permissions',
    up: async (db) => {
      // 检查是否已有权限
      const permCount = await db.prepare('SELECT COUNT(*) as count FROM permissions').first();
      if (permCount.count > 0) return;

      const permissions = [
        // 用户管理权限
        { name: 'user.view', display_name: '查看用户', description: '查看用户列表和详情', module: 'user' },
        { name: 'user.create', display_name: '创建用户', description: '创建新用户', module: 'user' },
        { name: 'user.edit', display_name: '编辑用户', description: '编辑用户信息', module: 'user' },
        { name: 'user.delete', display_name: '删除用户', description: '删除用户', module: 'user' },
        { name: 'user.manage_role', display_name: '管理用户角色', description: '分配和移除用户角色', module: 'user' },
        
        // 角色管理权限
        { name: 'role.view', display_name: '查看角色', description: '查看角色列表', module: 'role' },
        { name: 'role.create', display_name: '创建角色', description: '创建新角色', module: 'role' },
        { name: 'role.edit', display_name: '编辑角色', description: '编辑角色信息', module: 'role' },
        { name: 'role.delete', display_name: '删除角色', description: '删除角色', module: 'role' },
        { name: 'role.assign_permission', display_name: '分配权限', description: '为角色分配权限', module: 'role' },
        
        // API 管理权限
        { name: 'api.view', display_name: '查看 API', description: '查看 API 配置', module: 'api' },
        { name: 'api.manage', display_name: '管理 API', description: '配置和管理 API', module: 'api' },
        { name: 'api.model.view', display_name: '查看模型', description: '查看 AI 模型列表', module: 'api' },
        { name: 'api.model.toggle', display_name: '切换模型', description: '启用/禁用模型', module: 'api' },
        
        // 系统设置权限
        { name: 'system.view', display_name: '查看设置', description: '查看系统设置', module: 'system' },
        { name: 'system.edit', display_name: '修改设置', description: '修改系统设置', module: 'system' },
        { name: 'system.registration', display_name: '注册控制', description: '控制用户注册开关', module: 'system' },
        { name: 'system.maintenance', display_name: '系统维护', description: '清除缓存、重置等', module: 'system' },
        
        // 内容管理权限
        { name: 'content.view', display_name: '查看内容', description: '查看文章和项目', module: 'content' },
        { name: 'content.create', display_name: '创建内容', description: '创建文章和项目', module: 'content' },
        { name: 'content.edit', display_name: '编辑内容', description: '编辑文章和项目', module: 'content' },
        { name: 'content.delete', display_name: '删除内容', description: '删除文章和项目', module: 'content' },
        { name: 'content.publish', display_name: '发布内容', description: '发布和取消发布', module: 'content' },
        
        // 菜单管理权限
        { name: 'menu.view', display_name: '查看菜单', description: '查看菜单配置', module: 'menu' },
        { name: 'menu.manage', display_name: '管理菜单', description: '配置菜单结构', module: 'menu' }
      ];

      for (const perm of permissions) {
        await db.prepare(
          'INSERT INTO permissions (name, display_name, description, module) VALUES (?, ?, ?, ?)'
        ).bind(perm.name, perm.display_name, perm.description, perm.module).run();
      }
    }
  },
  {
    version: 7,
    name: 'seed_menus',
    up: async (db) => {
      // 检查是否已有菜单
      const menuCount = await db.prepare('SELECT COUNT(*) as count FROM menus').first();
      if (menuCount.count > 0) return;

      const menus = [
        { name: 'dashboard', display_name: '仪表盘', icon: '📊', path: '/admin/dashboard', component: 'DashboardView', parent_id: null, sort_order: 1 },
        { name: 'api', display_name: 'API 管理', icon: '🔌', path: '/admin/api', component: 'ApiManagement', parent_id: null, sort_order: 2 },
        { name: 'accounts', display_name: '账号管理', icon: '👥', path: null, component: null, parent_id: null, sort_order: 3 },
        { name: 'accounts.users', display_name: '用户列表', icon: '👤', path: '/admin/accounts/users', component: 'UserManagement', parent_id: 3, sort_order: 1 },
        { name: 'accounts.roles', display_name: '角色管理', icon: '👑', path: '/admin/accounts/roles', component: 'RoleManagement', parent_id: 3, sort_order: 2 },
        { name: 'accounts.permissions', display_name: '权限管理', icon: '🔐', path: '/admin/accounts/permissions', component: 'PermissionManagement', parent_id: 3, sort_order: 3 },
        { name: 'content', display_name: '内容管理', icon: '📝', path: null, component: null, parent_id: null, sort_order: 4 },
        { name: 'content.posts', display_name: '文章管理', icon: '📄', path: '/admin/content/posts', component: 'PostManagement', parent_id: 7, sort_order: 1 },
        { name: 'content.projects', display_name: '项目管理', icon: '🚀', path: '/admin/content/projects', component: 'ProjectManagement', parent_id: 7, sort_order: 2 },
        { name: 'system', display_name: '系统设置', icon: '⚙️', path: '/admin/system', component: 'SystemSettings', parent_id: null, sort_order: 5 }
      ];

      for (const menu of menus) {
        await db.prepare(
          'INSERT INTO menus (name, display_name, icon, path, component, parent_id, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(menu.name, menu.display_name, menu.icon, menu.path, menu.component, menu.parent_id, menu.sort_order).run();
      }
    }
  },
  {
    version: 8,
    name: 'seed_role_permissions',
    up: async (db) => {
      // 检查是否已有角色权限关联
      const rpCount = await db.prepare('SELECT COUNT(*) as count FROM role_permissions').first();
      if (rpCount.count > 0) return;

      // 为超级管理员分配所有权限
      const allPerms = await db.prepare('SELECT id FROM permissions').all();
      for (const perm of allPerms.results) {
        await db.prepare(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES (1, ?)'
        ).bind(perm.id).run();
      }

      // 为管理员分配大部分权限（除了系统维护和删除角色）
      const adminPerms = await db.prepare(
        "SELECT id FROM permissions WHERE name NOT IN ('system.maintenance', 'role.delete')"
      ).all();
      for (const perm of adminPerms.results) {
        await db.prepare(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES (2, ?)'
        ).bind(perm.id).run();
      }

      // 为编辑分配内容相关权限
      const editorPerms = await db.prepare(
        "SELECT id FROM permissions WHERE module = 'content'"
      ).all();
      for (const perm of editorPerms.results) {
        await db.prepare(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES (3, ?)'
        ).bind(perm.id).run();
      }

      // 为普通用户分配基础权限
      const userPerms = await db.prepare(
        "SELECT id FROM permissions WHERE name IN ('content.view', 'api.view', 'api.model.view')"
      ).all();
      for (const perm of userPerms.results) {
        await db.prepare(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES (4, ?)'
        ).bind(perm.id).run();
      }

      // 为访客分配只读权限
      const viewerPerms = await db.prepare(
        "SELECT id FROM permissions WHERE name LIKE '%.view'"
      ).all();
      for (const perm of viewerPerms.results) {
        await db.prepare(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES (5, ?)'
        ).bind(perm.id).run();
      }
    }
  },
  {
    version: 9,
    name: 'seed_role_menus',
    up: async (db) => {
      // 检查是否已有角色菜单关联
      const rmCount = await db.prepare('SELECT COUNT(*) as count FROM role_menus').first();
      if (rmCount.count > 0) return;

      // 超级管理员：所有菜单
      const allMenus = await db.prepare('SELECT id FROM menus').all();
      for (const menu of allMenus.results) {
        await db.prepare(
          'INSERT INTO role_menus (role_id, menu_id) VALUES (1, ?)'
        ).bind(menu.id).run();
      }

      // 管理员：除了权限管理外的所有菜单
      const adminMenus = await db.prepare(
        "SELECT id FROM menus WHERE name != 'accounts.permissions'"
      ).all();
      for (const menu of adminMenus.results) {
        await db.prepare(
          'INSERT INTO role_menus (role_id, menu_id) VALUES (2, ?)'
        ).bind(menu.id).run();
      }

      // 编辑：仪表盘和内容管理
      const editorMenus = await db.prepare(
        "SELECT id FROM menus WHERE name IN ('dashboard', 'content', 'content.posts', 'content.projects')"
      ).all();
      for (const menu of editorMenus.results) {
        await db.prepare(
          'INSERT INTO role_menus (role_id, menu_id) VALUES (3, ?)'
        ).bind(menu.id).run();
      }

      // 普通用户：仪表盘和 API 查看
      const userMenus = await db.prepare(
        "SELECT id FROM menus WHERE name IN ('dashboard', 'api')"
      ).all();
      for (const menu of userMenus.results) {
        await db.prepare(
          'INSERT INTO role_menus (role_id, menu_id) VALUES (4, ?)'
        ).bind(menu.id).run();
      }

      // 访客：仅仪表盘
      const viewerMenus = await db.prepare(
        "SELECT id FROM menus WHERE name = 'dashboard'"
      ).all();
      for (const menu of viewerMenus.results) {
        await db.prepare(
          'INSERT INTO role_menus (role_id, menu_id) VALUES (5, ?)'
        ).bind(menu.id).run();
      }
    }
  },
  {
    version: 10,
    name: 'seed_config',
    up: async (db) => {
      // 检查是否已有配置
      const configCount = await db.prepare('SELECT COUNT(*) as count FROM config').first();
      if (configCount.count > 0) return;

      const configs = [
        { key: 'allow_registration', value: 'true', description: '是否允许新用户注册' },
        { key: 'require_email_verification', value: 'false', description: '是否需要邮箱验证' },
        { key: 'api_rate_limit', value: '60', description: 'API 速率限制（每分钟）' },
        { key: 'enable_api_logging', value: 'true', description: '是否启用 API 日志' },
        { key: 'session_timeout', value: '30', description: '会话超时时间（分钟）' },
        { key: 'min_password_length', value: '8', description: '密码最小长度' }
      ];

      for (const config of configs) {
        await db.prepare(
          'INSERT INTO config (key, value, description) VALUES (?, ?, ?)'
        ).bind(config.key, config.value, config.description).run();
      }
    }
  }
];

// 迁移版本表
export async function ensureMigrationTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

// 获取当前数据库版本
export async function getCurrentVersion(db) {
  try {
    const result = await db.prepare(
      'SELECT MAX(version) as version FROM migrations'
    ).first();
    return result?.version || 0;
  } catch (error) {
    return 0;
  }
}

// 执行迁移
export async function runMigrations(db) {
  console.log('🔄 开始数据库迁移...');
  
  await ensureMigrationTable(db);
  const currentVersion = await getCurrentVersion(db);
  
  console.log(`📊 当前数据库版本: ${currentVersion}`);
  
  const pendingMigrations = migrations.filter(m => m.version > currentVersion);
  
  if (pendingMigrations.length === 0) {
    console.log('✅ 数据库已是最新版本');
    return;
  }
  
  console.log(`📦 发现 ${pendingMigrations.length} 个待执行的迁移`);
  
  for (const migration of pendingMigrations) {
    try {
      console.log(`⏳ 执行迁移 v${migration.version}: ${migration.name}`);
      await migration.up(db);
      
      // 记录迁移版本
      await db.prepare(
        'INSERT INTO migrations (version, name) VALUES (?, ?)'
      ).bind(migration.version, migration.name).run();
      
      console.log(`✅ 迁移 v${migration.version} 完成`);
    } catch (error) {
      console.error(`❌ 迁移 v${migration.version} 失败:`, error);
      throw error;
    }
  }
  
  console.log('🎉 所有迁移执行完成！');
}
