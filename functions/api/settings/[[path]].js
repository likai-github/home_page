// 系统设置 API
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/settings/', '').replace(/\/$/, '');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // GET /api/settings 或 GET /api/settings/
    if ((path === '' || path === 'settings') && request.method === 'GET') {
      return handleGetSettings(request, env, corsHeaders);
    } 
    // POST /api/settings 或 POST /api/settings/
    else if ((path === '' || path === 'settings') && request.method === 'POST') {
      return handleSaveSettings(request, env, corsHeaders);
    } else {
      return jsonResponse({ error: 'Not Found', path, method: request.method }, 404, corsHeaders);
    }
  } catch (error) {
    console.error('Settings API Error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

async function handleGetSettings(request, env, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  // 获取所有配置
  const { results } = await env.DB.prepare(
    'SELECT key, value FROM config WHERE key LIKE ?'
  ).bind('setting_%').all();

  const settings = {};
  results.forEach(row => {
    const key = row.key.replace('setting_', '');
    settings[key] = row.value === 'true' ? true : row.value === 'false' ? false : row.value;
  });

  // 默认值
  const defaultSettings = {
    allowRegistration: true,
    requireEmailVerification: false,
    apiRateLimit: 60,
    enableApiLogging: true,
    sessionTimeout: 30,
    minPasswordLength: 8
  };

  return jsonResponse({
    settings: { ...defaultSettings, ...settings }
  }, 200, corsHeaders);
}

async function handleSaveSettings(request, env, corsHeaders) {
  const body = await request.json();
  const settings = body;

  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  // 保存每个设置
  for (const [key, value] of Object.entries(settings)) {
    const configKey = `setting_${key}`;
    const configValue = String(value);

    await env.DB.prepare(`
      INSERT INTO config (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `).bind(configKey, configValue, configValue).run();
  }

  // 特别处理注册开关
  await env.DB.prepare(`
    INSERT INTO config (key, value) VALUES ('allow_registration', ?)
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
  `).bind(
    settings.allowRegistration ? 'true' : 'false',
    settings.allowRegistration ? 'true' : 'false'
  ).run();

  return jsonResponse({
    message: 'Settings saved successfully'
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
