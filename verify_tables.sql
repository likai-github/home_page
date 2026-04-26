-- ============================================
-- 验证所有表是否已创建
-- 在 Cloudflare D1 Studio 中执行此脚本
-- ============================================

-- 1. 查看所有表
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

-- 2. 查看迁移版本
SELECT * FROM migrations ORDER BY version;

-- 3. 验证用户表
SELECT COUNT(*) as user_count FROM users;
SELECT * FROM users LIMIT 5;

-- 4. 验证角色表
SELECT COUNT(*) as role_count FROM roles;
SELECT * FROM roles;

-- 5. 验证权限表
SELECT COUNT(*) as permission_count FROM permissions;
SELECT * FROM permissions ORDER BY module, name;

-- 6. 验证菜单表
SELECT COUNT(*) as menu_count FROM menus;
SELECT * FROM menus ORDER BY sort_order;

-- 7. 验证用户-角色关联表
SELECT COUNT(*) as user_role_count FROM user_roles;
SELECT 
  ur.id,
  u.username,
  r.display_name as role_name
FROM user_roles ur
JOIN users u ON ur.user_id = u.id
JOIN roles r ON ur.role_id = r.id;

-- 8. 验证角色-权限关联表
SELECT COUNT(*) as role_permission_count FROM role_permissions;
SELECT 
  r.display_name as role_name,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.display_name
ORDER BY r.id;

-- 9. 验证角色-菜单关联表
SELECT COUNT(*) as role_menu_count FROM role_menus;
SELECT 
  r.display_name as role_name,
  COUNT(rm.menu_id) as menu_count
FROM roles r
LEFT JOIN role_menus rm ON r.id = rm.role_id
GROUP BY r.id, r.display_name
ORDER BY r.id;

-- 10. 验证配置表
SELECT * FROM config;

-- 11. 验证 NVIDIA 模型表
SELECT COUNT(*) as model_count FROM nvidia_models;

-- 12. 验证内容表
SELECT COUNT(*) as post_count FROM posts;
SELECT COUNT(*) as project_count FROM projects;
SELECT COUNT(*) as comment_count FROM comments;

-- ============================================
-- 详细的权限分配情况
-- ============================================

-- 查看超级管理员的权限
SELECT 
  r.display_name as role_name,
  p.name as permission_name,
  p.display_name as permission_display_name,
  p.module
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'super_admin'
ORDER BY p.module, p.name;

-- 查看管理员的权限
SELECT 
  r.display_name as role_name,
  p.name as permission_name,
  p.display_name as permission_display_name,
  p.module
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'admin'
ORDER BY p.module, p.name;

-- ============================================
-- 菜单分配情况
-- ============================================

-- 查看超级管理员的菜单
SELECT 
  r.display_name as role_name,
  m.display_name as menu_name,
  m.path,
  m.icon
FROM roles r
JOIN role_menus rm ON r.id = rm.role_id
JOIN menus m ON rm.menu_id = m.id
WHERE r.name = 'super_admin'
ORDER BY m.sort_order;

-- 查看所有角色的菜单数量
SELECT 
  r.display_name as role_name,
  COUNT(rm.menu_id) as menu_count
FROM roles r
LEFT JOIN role_menus rm ON r.id = rm.role_id
GROUP BY r.id, r.display_name
ORDER BY r.id;
