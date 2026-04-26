// AI 对话代理 API
// POST /api/chat
// body: { platform_id, model_id, messages: [{role, content}], stream? }

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405, corsHeaders);
  }

  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  try {
    const body = await request.json();
    const { platform_id, model_id, messages } = body;

    if (!platform_id || !model_id || !messages?.length) {
      return jsonResponse({ error: 'platform_id, model_id, messages are required' }, 400, corsHeaders);
    }

    // 从数据库获取平台信息（含 api_key）
    const platform = await env.DB.prepare(
      'SELECT * FROM api_platforms WHERE id = ? AND status = ?'
    ).bind(platform_id, 'active').first();

    if (!platform) {
      return jsonResponse({ error: 'Platform not found or inactive' }, 404, corsHeaders);
    }

    if (!platform.api_key) {
      return jsonResponse({ error: 'API key not configured for this platform' }, 400, corsHeaders);
    }

    // 根据平台类型转发请求
    const baseUrl = platform.base_url || getDefaultBaseUrl(platform.name);
    const result = await callOpenAICompatible(baseUrl, platform.api_key, model_id, messages);

    return jsonResponse(result, 200, corsHeaders);

  } catch (error) {
    console.error('Chat API Error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// 调用 OpenAI 兼容接口（NVIDIA / OpenAI / Anthropic 等均支持）
async function callOpenAICompatible(baseUrl, apiKey, modelId, messages) {
  const url = baseUrl.replace(/\/$/, '') + '/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    let errMsg = `API Error ${response.status}`;
    try {
      const errJson = JSON.parse(errText);
      errMsg = errJson.error?.message || errJson.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  return response.json();
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

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}
