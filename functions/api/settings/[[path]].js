// 系统设置 API
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // 正确处理路径：移除 /api/settings 前缀
  let path = url.pathname;
  if (path.startsWith('/api/settings')) {
    path = path.substring('/api/settings'.length);
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
    // GET /api/settings 或 GET /api/settings/
    if (path === '' && request.method === 'GET') {
      return handleGetSettings(env, corsHeaders);
    } 
    // POST /api/settings 或 POST /api/settings/
    else if (path === '' && request.method === 'POST') {
      return handleSaveSettings(request, env, corsHeaders);
    } else {
      return jsonResponse({ error: 'Not Found', path, method: request.method, url: url.pathname }, 404, corsHeaders);
    }
  } catch (error) {
    console.error('Settings API Error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

async function handleGetSettings(env, corsHeaders) {
  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  // 获取所有配置（不使用 setting_ 前缀）
  const { results } = await env.DB.prepare(
    'SELECT key, value FROM config'
  ).all();

  const settings = {};
  
  // 将数据库中的 snake_case 转换为 camelCase
  const keyMapping = {
    'allow_registration': 'allowRegistration',
    'require_email_verification': 'requireEmailVerification',
    'api_rate_limit': 'apiRateLimit',
    'enable_api_logging': 'enableApiLogging',
    'session_timeout': 'sessionTimeout',
    'min_password_length': 'minPasswordLength'
  };
  
  results.forEach(row => {
    const camelKey = keyMapping[row.key] || row.key;
    settings[camelKey] = row.value === 'true' ? true : row.value === 'false' ? false : isNaN(row.value) ? row.value : Number(row.value);
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

  // camelCase 到 snake_case 的映射
  const keyMapping = {
    'allowRegistration': 'allow_registration',
    'requireEmailVerification': 'require_email_verification',
    'apiRateLimit': 'api_rate_limit',
    'enableApiLogging': 'enable_api_logging',
    'sessionTimeout': 'session_timeout',
    'minPasswordLength': 'min_password_length'
  };

  // 保存每个设置
  for (const [key, value] of Object.entries(settings)) {
    const configKey = keyMapping[key] || key;
    const configValue = String(value);

    await env.DB.prepare(`
      INSERT INTO config (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `).bind(configKey, configValue, configValue).run();
  }

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
