// NVIDIA API 管理
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/nvidia/', '');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (path === 'api-key' && request.method === 'POST') {
      return handleSaveApiKey(request, env, corsHeaders);
    } else if (path === 'api-key' && request.method === 'GET') {
      return handleGetApiKey(request, env, corsHeaders);
    } else if (path === 'models' && request.method === 'POST') {
      return handleGetModels(request, env, corsHeaders);
    } else if (path === 'models/toggle' && request.method === 'POST') {
      return handleToggleModel(request, env, corsHeaders);
    } else {
      return jsonResponse({ error: 'Not Found' }, 404, corsHeaders);
    }
  } catch (error) {
    console.error('NVIDIA API Error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

async function handleSaveApiKey(request, env, corsHeaders) {
  const body = await request.json();
  const { apiKey } = body;

  if (!apiKey) {
    return jsonResponse({ error: 'API Key is required' }, 400, corsHeaders);
  }

  // 在生产环境中，应该加密存储 API Key
  // 这里简化处理，存储在 KV 或数据库中
  // 由于我们使用 D1，可以创建一个配置表
  
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  // 创建或更新配置
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  await env.DB.prepare(`
    INSERT INTO config (key, value) VALUES ('nvidia_api_key', ?)
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
  `).bind(apiKey, apiKey).run();

  return jsonResponse({ message: 'API Key saved successfully' }, 200, corsHeaders);
}

async function handleGetApiKey(request, env, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  const config = await env.DB.prepare(
    'SELECT value FROM config WHERE key = ?'
  ).bind('nvidia_api_key').first();

  return jsonResponse({
    apiKey: config ? config.value : ''
  }, 200, corsHeaders);
}

async function handleGetModels(request, env, corsHeaders) {
  const body = await request.json();
  const { apiKey } = body;

  if (!apiKey) {
    return jsonResponse({ error: 'API Key is required' }, 400, corsHeaders);
  }

  try {
    // 调用 NVIDIA API 获取模型列表
    const response = await fetch('https://integrate.api.nvidia.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`NVIDIA API Error: ${error}`);
    }

    const data = await response.json();
    return jsonResponse(data, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({
      error: 'Failed to fetch models from NVIDIA API',
      details: error.message
    }, 500, corsHeaders);
  }
}

async function handleToggleModel(request, env, corsHeaders) {
  const body = await request.json();
  const { modelId, enabled } = body;

  if (!modelId) {
    return jsonResponse({ error: 'Model ID is required' }, 400, corsHeaders);
  }

  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  // 创建模型配置表
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS nvidia_models (
      model_id TEXT PRIMARY KEY,
      enabled BOOLEAN DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // 更新模型状态
  await env.DB.prepare(`
    INSERT INTO nvidia_models (model_id, enabled) VALUES (?, ?)
    ON CONFLICT(model_id) DO UPDATE SET enabled = ?, updated_at = CURRENT_TIMESTAMP
  `).bind(modelId, enabled ? 1 : 0, enabled ? 1 : 0).run();

  return jsonResponse({
    message: 'Model status updated',
    modelId,
    enabled
  }, 200, corsHeaders);
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
