// 手动触发迁移的 API 端点
// 访问 /api/migrate 来执行数据库迁移

import { runMigrations, getCurrentVersion } from '../db/migrations.js';

export async function onRequestGet(context) {
  const { env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (!env.DB) {
    return new Response(JSON.stringify({
      error: 'Database not configured',
      message: '数据库未配置，请检查 wrangler.toml'
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  try {
    console.log('📊 开始手动迁移...');
    
    // 获取当前版本
    const currentVersion = await getCurrentVersion(env.DB);
    console.log(`当前数据库版本: ${currentVersion}`);
    
    // 执行迁移
    await runMigrations(env.DB);
    
    // 获取新版本
    const newVersion = await getCurrentVersion(env.DB);
    
    return new Response(JSON.stringify({
      success: true,
      message: '数据库迁移完成',
      previousVersion: currentVersion,
      currentVersion: newVersion,
      migrationsExecuted: newVersion - currentVersion
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    
    return new Response(JSON.stringify({
      error: 'Migration failed',
      message: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
