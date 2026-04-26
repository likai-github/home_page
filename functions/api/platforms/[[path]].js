// API 平台管理
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // 正确处理路径：移除 /api/platforms 前缀
  let path = url.pathname;
  if (path.startsWith('/api/platforms')) {
    path = path.substring('/api/platforms'.length);
  }
  // 移除开头和结尾的斜杠
  path = path.replace(/^\/+|\/+$/g, '');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // GET /api/platforms - 获取所有平台
    if (path === '' && request.method === 'GET') {
      return handleGetPlatforms(env, corsHeaders);
    }
    
    // POST /api/platforms - 创建平台
    if (path === '' && request.method === 'POST') {
      return handleCreatePlatform(request, env, corsHeaders);
    }
    
    // GET /api/platforms/:id - 获取单个平台
    if (path.match(/^\d+$/) && request.method === 'GET') {
      return handleGetPlatform(path, env, corsHeaders);
    }
    
    // PUT /api/platforms/:id - 更新平台
    if (path.match(/^\d+$/) && request.method === 'PUT') {
      return handleUpdatePlatform(path, request, env, corsHeaders);
    }
    
    // DELETE /api/platforms/:id - 删除平台
    if (path.match(/^\d+$/) && request.method === 'DELETE') {
      return handleDeletePlatform(path, env, corsHeaders);
    }
    
    // GET /api/platforms/:id/models - 获取平台的模型列表
    if (path.match(/^\d+\/models$/) && request.method === 'GET') {
      const platformId = path.split('/')[0];
      return handleGetPlatformModels(platformId, env, corsHeaders);
    }
    
    // POST /api/platforms/:id/sync-models - 同步平台模型
    if (path.match(/^\d+\/sync-models$/) && request.method === 'POST') {
      const platformId = path.split('/')[0];
      return handleSyncModels(platformId, env, corsHeaders);
    }

    // POST /api/platforms/:id/test - 测试平台连通性
    if (path.match(/^\d+\/test$/) && request.method === 'POST') {
      const platformId = path.split('/')[0];
      return handleTestPlatform(platformId, env, corsHeaders);
    }
    
    // PUT /api/platforms/:id/models - 更新模型状态
    // 注意：modelId 可能含斜杠（如 nvidia 的 meta/llama-3.1-8b-instruct）
    // Cloudflare Pages 对 %2F 的处理不稳定，改为从 body 读取 model_id
    if (path.match(/^\d+\/models/) && request.method === 'PUT') {
      const platformId = path.split('/')[0];
      return handleUpdateModel(platformId, request, env, corsHeaders);
    }

    return jsonResponse({ error: 'Not Found', path, method: request.method, url: url.pathname }, 404, corsHeaders);
  } catch (error) {
    console.error('Platform API Error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// 获取所有平台
async function handleGetPlatforms(env, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  try {
    const { results } = await env.DB.prepare(`
      SELECT 
        p.*,
        COUNT(m.id) as model_count,
        SUM(CASE WHEN m.enabled = 1 THEN 1 ELSE 0 END) as enabled_model_count
      FROM api_platforms p
      LEFT JOIN api_models m ON p.id = m.platform_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all();

    return jsonResponse({ platforms: results }, 200, corsHeaders);
  } catch (error) {
    console.error('Get platforms error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// 创建平台
async function handleCreatePlatform(request, env, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  try {
    const body = await request.json();
    const { name, display_name, api_key, base_url, description } = body;

    if (!name || !display_name) {
      return jsonResponse({ error: 'Name and display_name are required' }, 400, corsHeaders);
    }

    const result = await env.DB.prepare(`
      INSERT INTO api_platforms (name, display_name, api_key, base_url, description, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).bind(name, display_name, api_key || null, base_url || null, description || null).run();

    return jsonResponse({
      message: 'Platform created successfully',
      id: result.meta.last_row_id
    }, 201, corsHeaders);
  } catch (error) {
    console.error('Create platform error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// 获取单个平台
async function handleGetPlatform(id, env, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  try {
    const platform = await env.DB.prepare(`
      SELECT * FROM api_platforms WHERE id = ?
    `).bind(id).first();

    if (!platform) {
      return jsonResponse({ error: 'Platform not found' }, 404, corsHeaders);
    }

    return jsonResponse({ platform }, 200, corsHeaders);
  } catch (error) {
    console.error('Get platform error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// 更新平台
async function handleUpdatePlatform(id, request, env, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  try {
    const body = await request.json();
    const { display_name, api_key, base_url, description, status } = body;

    await env.DB.prepare(`
      UPDATE api_platforms 
      SET display_name = ?, api_key = ?, base_url = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(display_name, api_key, base_url, description, status, id).run();

    return jsonResponse({ message: 'Platform updated successfully' }, 200, corsHeaders);
  } catch (error) {
    console.error('Update platform error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// 删除平台
async function handleDeletePlatform(id, env, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  try {
    // 先删除关联的模型
    await env.DB.prepare('DELETE FROM api_models WHERE platform_id = ?').bind(id).run();
    
    // 删除平台
    await env.DB.prepare('DELETE FROM api_platforms WHERE id = ?').bind(id).run();

    return jsonResponse({ message: 'Platform deleted successfully' }, 200, corsHeaders);
  } catch (error) {
    console.error('Delete platform error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// 获取平台的模型列表
async function handleGetPlatformModels(platformId, env, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  try {
    const { results } = await env.DB.prepare(`
      SELECT * FROM api_models 
      WHERE platform_id = ?
      ORDER BY model_name
    `).bind(platformId).all();

    return jsonResponse({ models: results }, 200, corsHeaders);
  } catch (error) {
    console.error('Get platform models error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// 同步平台模型
async function handleSyncModels(platformId, env, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  try {
    const platform = await env.DB.prepare(
      'SELECT * FROM api_platforms WHERE id = ?'
    ).bind(platformId).first();

    if (!platform) {
      return jsonResponse({ error: 'Platform not found' }, 404, corsHeaders);
    }

    if (!platform.api_key) {
      return jsonResponse({ error: 'API key not configured' }, 400, corsHeaders);
    }

    let models = [];
    if (platform.name === 'nvidia') {
      models = await fetchNvidiaModels(platform.api_key);
    } else if (platform.name === 'openai') {
      models = await fetchOpenAIModels(platform.api_key);
    } else if (platform.name === 'google') {
      models = await fetchGoogleModels(platform.api_key);
    } else if (platform.name === 'anthropic') {
      models = await fetchAnthropicModels();
    } else {
      return jsonResponse({ error: 'Unsupported platform for auto-sync. Please add models manually.' }, 400, corsHeaders);
    }

    let addedCount = 0;
    let updatedCount = 0;

    for (const model of models) {
      const existing = await env.DB.prepare(
        'SELECT id FROM api_models WHERE platform_id = ? AND model_id = ?'
      ).bind(platformId, model.id).first();

      if (existing) {
        await env.DB.prepare(`
          UPDATE api_models 
          SET model_name = ?, description = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
          WHERE platform_id = ? AND model_id = ?
        `).bind(model.name, model.description || null, JSON.stringify(model.metadata || {}), platformId, model.id).run();
        updatedCount++;
      } else {
        await env.DB.prepare(`
          INSERT INTO api_models (platform_id, model_id, model_name, description, metadata, enabled)
          VALUES (?, ?, ?, ?, ?, 0)
        `).bind(platformId, model.id, model.name, model.description || null, JSON.stringify(model.metadata || {})).run();
        addedCount++;
      }
    }

    return jsonResponse({ message: 'Models synced successfully', total: models.length, added: addedCount, updated: updatedCount }, 200, corsHeaders);
  } catch (error) {
    console.error('Sync models error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// 测试平台连通性
async function handleTestPlatform(platformId, env, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  try {
    const platform = await env.DB.prepare(
      'SELECT * FROM api_platforms WHERE id = ?'
    ).bind(platformId).first();

    if (!platform) {
      return jsonResponse({ error: 'Platform not found' }, 404, corsHeaders);
    }

    if (!platform.api_key) {
      return jsonResponse({ success: false, message: '未配置 API Key' }, 200, corsHeaders);
    }

    const baseUrl = platform.base_url || getDefaultBaseUrl(platform.name);
    const result = await testPlatformConnection(platform.name, baseUrl, platform.api_key);
    return jsonResponse(result, 200, corsHeaders);
  } catch (error) {
    console.error('Test platform error:', error);
    return jsonResponse({ success: false, message: error.message }, 200, corsHeaders);
  }
}

// 更新模型状态 —— model_id 从 body 读取，避免 URL 斜杠编码问题
async function handleUpdateModel(platformId, request, env, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  try {
    const body = await request.json();
    const { enabled, model_id } = body;

    if (!model_id) {
      return jsonResponse({ error: 'model_id is required in request body' }, 400, corsHeaders);
    }

    console.log(`[updateModel] platformId=${platformId} model_id="${model_id}" enabled=${enabled}`);

    const result = await env.DB.prepare(`
      UPDATE api_models 
      SET enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE platform_id = ? AND model_id = ?
    `).bind(enabled ? 1 : 0, platformId, model_id).run();

    console.log(`[updateModel] rows changed: ${result.meta?.changes}`);

    if (!result.meta?.changes) {
      return jsonResponse({
        error: 'Model not found',
        detail: `platform_id=${platformId}, model_id="${model_id}"`,
      }, 404, corsHeaders);
    }

    return jsonResponse({ message: 'Model updated successfully', changes: result.meta.changes }, 200, corsHeaders);
  } catch (error) {
    console.error('Update model error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// 测试平台连通性（发一条最小请求）
async function testPlatformConnection(platformName, baseUrl, apiKey) {
  try {
    if (platformName === 'google') {
      // Google 用 generateContent 接口测试
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] }),
      });
      if (res.ok) return { success: true, message: '连接成功 ✓' };
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.error?.message || `HTTP ${res.status}` };
    }

    // OpenAI 兼容接口：发一条最小 chat 请求
    const testModel = getTestModel(platformName);
    const url = baseUrl.replace(/\/$/, '') + '/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: testModel,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }),
    });
    if (res.ok) return { success: true, message: '连接成功 ✓' };
    const err = await res.json().catch(() => ({}));
    return { success: false, message: err.error?.message || `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function getTestModel(platformName) {
  const map = {
    nvidia:    'meta/llama-3.1-8b-instruct',
    openai:    'gpt-4o-mini',
    anthropic: 'claude-3-haiku-20240307',
  };
  return map[platformName] || 'gpt-4o-mini';
}

function getDefaultBaseUrl(platformName) {
  const defaults = {
    nvidia:    'https://integrate.api.nvidia.com/v1',
    openai:    'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com/v1',
    google:    'https://generativelanguage.googleapis.com/v1beta/openai',
  };
  return defaults[platformName] || 'https://api.openai.com/v1';
}

// 获取 NVIDIA 模型列表
async function fetchNvidiaModels(apiKey) {
  const response = await fetch('https://integrate.api.nvidia.com/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error(`NVIDIA API Error: ${response.statusText}`);
  const data = await response.json();
  return (data.data || []).map(m => ({
    id: m.id, name: m.id, description: m.description || '',
    metadata: { owned_by: m.owned_by, created: m.created },
  }));
}

// 获取 OpenAI 模型列表
async function fetchOpenAIModels(apiKey) {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  if (!response.ok) throw new Error(`OpenAI API Error: ${response.statusText}`);
  const data = await response.json();
  // 只保留 gpt / o1 / o3 系列
  return (data.data || [])
    .filter(m => /^(gpt|o1|o3|chatgpt)/.test(m.id))
    .map(m => ({
      id: m.id, name: m.id, description: '',
      metadata: { owned_by: m.owned_by, created: m.created },
    }));
}

// 获取 Google Gemini 模型列表
async function fetchGoogleModels(apiKey) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  if (!response.ok) throw new Error(`Google API Error: ${response.statusText}`);
  const data = await response.json();
  return (data.models || [])
    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
    .map(m => {
      const id = m.name.replace('models/', '');
      return {
        id,
        name: m.displayName || id,
        description: m.description || '',
        metadata: { version: m.version, inputTokenLimit: m.inputTokenLimit },
      };
    });
}

// Anthropic 没有公开模型列表 API，返回已知模型
async function fetchAnthropicModels() {
  return [
    { id: 'claude-opus-4-5',         name: 'Claude Opus 4.5',         description: 'Most capable', metadata: {} },
    { id: 'claude-sonnet-4-5',       name: 'Claude Sonnet 4.5',       description: 'Balanced',     metadata: {} },
    { id: 'claude-haiku-3-5',        name: 'Claude Haiku 3.5',        description: 'Fast & light', metadata: {} },
    { id: 'claude-3-opus-20240229',  name: 'Claude 3 Opus',           description: 'Legacy',       metadata: {} },
    { id: 'claude-3-sonnet-20240229',name: 'Claude 3 Sonnet',         description: 'Legacy',       metadata: {} },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku',          description: 'Legacy',       metadata: {} },
  ];
}

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
