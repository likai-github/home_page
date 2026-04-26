// 重置数据库 - 删除所有表并重新创建
// ⚠️ 警告：这会删除所有数据！

export async function onRequestGet(context) {
  const { env, request } = context;
  
  const url = new URL(request.url);
  const confirm = url.searchParams.get('confirm');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (!env.DB) {
    return new Response(JSON.stringify({
      error: 'Database not configured'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  // 需要确认参数
  if (confirm !== 'yes') {
    return new Response(JSON.stringify({
      warning: '⚠️ 这个操作会删除所有数据！',
      message: '如果确定要重置数据库，请访问: /api/reset-db?confirm=yes',
      tables: [
        'migrations', 'users', 'roles', 'permissions', 'menus',
        'user_roles', 'role_permissions', 'role_menus',
        'config', 'nvidia_models', 'posts', 'projects', 'comments'
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  try {
    console.log('🗑️ 开始重置数据库...');

    // 删除所有表
    const tables = [
      'comments', 'projects', 'posts', 'nvidia_models', 'config',
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

    return new Response(JSON.stringify({
      success: true,
      message: '数据库已重置，所有表已删除',
      next: '现在访问 /api/migrate 来重新创建表'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('❌ 重置失败:', error);
    
    return new Response(JSON.stringify({
      error: 'Reset failed',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
