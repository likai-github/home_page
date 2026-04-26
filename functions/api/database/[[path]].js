// 数据库管理 API
import { runMigrations, getCurrentVersion, migrations } from '../../db/migrations.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/database/', '').replace(/\/$/, '');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // GET /api/database/status - 获取数据库状态
    if (path === 'status' && request.method === 'GET') {
      return handleGetStatus(env, corsHeaders);
    }

    // GET /api/database/tables - 获取所有表信息
    if (path === 'tables' && request.method === 'GET') {
      return handleGetTables(env, corsHeaders);
    }

    // GET /api/database/tables/:name/columns - 获取表字段
    if (path.match(/^tables\/[^/]+\/columns$/) && request.method === 'GET') {
      const tableName = path.split('/')[1];
      return handleGetTableColumns(env, tableName, corsHeaders);
    }

    // GET /api/database/tables/:name/data - 获取表示例数据
    if (path.match(/^tables\/[^/]+\/data$/) && request.method === 'GET') {
      const tableName = path.split('/')[1];
      return handleGetTableData(env, tableName, corsHeaders);
    }

    // GET /api/database/migrations - 获取迁移历史
    if (path === 'migrations' && request.method === 'GET') {
      return handleGetMigrations(env, corsHeaders);
    }

    // POST /api/database/migrate - 执行迁移
    if (path === 'migrate' && request.method === 'POST') {
      return handleRunMigration(env, corsHeaders);
    }

    // POST /api/database/reset - 重置数据库
    if (path === 'reset' && request.method === 'POST') {
      return handleResetDatabase(env, corsHeaders);
    }

    return jsonResponse({ error: 'Not Found' }, 404, corsHeaders);
  } catch (error) {
    console.error('Database API Error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// 获取数据库状态
async function handleGetStatus(env, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  try {
    const currentVersion = await getCurrentVersion(env.DB);
    const latestVersion = migrations[migrations.length - 1].version;
    
    // 获取表数量
    const { results } = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).all();
    const tableCount = results[0]?.count || 0;

    return jsonResponse({
      currentVersion,
      latestVersion,
      needsUpdate: currentVersion < latestVersion,
      tableCount,
      status: currentVersion < latestVersion ? 'needs_update' : 'up_to_date'
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Get status error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// 获取所有表信息
async function handleGetTables(env, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  try {
    // 获取所有表名
    const { results: tableNames } = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all();

    // 获取每个表的记录数
    const tables = [];
    for (const table of tableNames) {
      try {
        const { results } = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM ${table.name}`
        ).all();
        
        tables.push({
          name: table.name,
          row_count: results[0]?.count || 0,
          description: getTableDescription(table.name)
        });
      } catch (err) {
        console.error(`Error counting rows in ${table.name}:`, err);
        tables.push({
          name: table.name,
          row_count: 0,
          description: getTableDescription(table.name)
        });
      }
    }

    return jsonResponse({ tables }, 200, corsHeaders);
  } catch (error) {
    console.error('Get tables error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// 获取表字段信息
async function handleGetTableColumns(env, tableName, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  try {
    const { results } = await env.DB.prepare(
      `PRAGMA table_info(${tableName})`
    ).all();

    return jsonResponse({ columns: results }, 200, corsHeaders);
  } catch (error) {
    console.error('Get table columns error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// 获取表示例数据
async function handleGetTableData(env, tableName, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT * FROM ${tableName} LIMIT 5`
    ).all();

    return jsonResponse({ data: results }, 200, corsHeaders);
  } catch (error) {
    console.error('Get table data error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// 获取迁移历史
async function handleGetMigrations(env, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  try {
    // 确保 migrations 表存在
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    const { results } = await env.DB.prepare(
      'SELECT * FROM migrations ORDER BY version DESC'
    ).all();

    return jsonResponse({ migrations: results }, 200, corsHeaders);
  } catch (error) {
    console.error('Get migrations error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// 执行迁移
async function handleRunMigration(env, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  try {
    console.log('📊 开始手动迁移...');
    
    const currentVersion = await getCurrentVersion(env.DB);
    console.log(`当前数据库版本: ${currentVersion}`);
    
    await runMigrations(env.DB);
    
    const newVersion = await getCurrentVersion(env.DB);
    
    return jsonResponse({
      success: true,
      message: '数据库迁移完成',
      previousVersion: currentVersion,
      currentVersion: newVersion,
      migrationsExecuted: newVersion - currentVersion
    }, 200, corsHeaders);
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    return jsonResponse({
      error: 'Migration failed',
      message: error.message,
      stack: error.stack
    }, 500, corsHeaders);
  }
}

// 重置数据库
async function handleResetDatabase(env, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  try {
    console.log('🗑️ 开始重置数据库...');

    // 删除所有表
    const tables = [
      'comments', 'projects', 'posts', 
      'api_models', 'api_platforms', 'config',
      'role_menus', 'role_permissions', 'user_roles',
      'menus', 'permissions', 'roles', 'users', 'migrations'
    ];

    for (const table of tables) {
      try {
        await env.DB.prepare(`DROP TABLE IF EXISTS ${table}`).run();
        console.log(`✅ 删除表: ${table}`);
      } catch (error) {
        console.log(`⚠️ 删除表 ${table} 失败:`, error.message);
      }
    }

    console.log('✅ 所有表已删除');

    return jsonResponse({
      success: true,
      message: '数据库已重置，所有表已删除',
      next: '请执行迁移来重新创建表'
    }, 200, corsHeaders);
  } catch (error) {
    console.error('❌ 重置失败:', error);
    return jsonResponse({
      error: 'Reset failed',
      message: error.message,
      stack: error.stack
    }, 500, corsHeaders);
  }
}

// 获取表描述
function getTableDescription(tableName) {
  const descriptions = {
    'migrations': '迁移版本记录',
    'users': '用户表',
    'roles': '角色表',
    'permissions': '权限表',
    'menus': '菜单表',
    'user_roles': '用户-角色关联',
    'role_permissions': '角色-权限关联',
    'role_menus': '角色-菜单关联',
    'config': '系统配置',
    'api_platforms': 'API 平台配置',
    'api_models': 'API 模型配置',
    'posts': '文章表',
    'projects': '项目表',
    'comments': '评论表'
  };
  return descriptions[tableName] || '数据表';
}

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}
