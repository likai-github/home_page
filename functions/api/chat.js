// AI 对话代理 API
// POST /api/chat
// body: { platform_id, model_id, messages: [{role, content}] }

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

    // 从数据库读取平台（含 api_key，不暴露给前端）
    const platform = await env.DB.prepare(
      'SELECT * FROM api_platforms WHERE id = ? AND status = ?'
    ).bind(platform_id, 'active').first();

    if (!platform) {
      return jsonResponse({ error: 'Platform not found or inactive' }, 404, corsHeaders);
    }
    if (!platform.api_key) {
      return jsonResponse({ error: 'API key not configured for this platform' }, 400, corsHeaders);
    }

    const baseUrl = platform.base_url || getDefaultBaseUrl(platform.name);

    // Google 使用原生 generateContent 接口
    if (platform.name === 'google') {
      const result = await callGoogleGemini(platform.api_key, model_id, messages);
      return jsonResponse(result, 200, corsHeaders);
    }

    // Anthropic 使用 Messages API
    if (platform.name === 'anthropic') {
      const result = await callAnthropic(platform.api_key, model_id, messages);
      return jsonResponse(result, 200, corsHeaders);
    }

    // 其余平台（OpenAI / NVIDIA / 自定义）使用 OpenAI 兼容接口
    const result = await callOpenAICompatible(baseUrl, platform.api_key, model_id, messages);
    return jsonResponse(result, 200, corsHeaders);

  } catch (error) {
    console.error('Chat API Error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// ── OpenAI 兼容接口 ──────────────────────────────────────────────────────────
async function callOpenAICompatible(baseUrl, apiKey, modelId, messages) {
  const url = baseUrl.replace(/\/$/, '') + '/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelId, messages, temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) {
    const t = await res.text();
    let msg = `API Error ${res.status}`;
    try { msg = JSON.parse(t).error?.message || msg; } catch {}
    throw new Error(msg);
  }
  // 统一返回 OpenAI 格式
  return res.json();
}

// ── Google Gemini 原生接口 ────────────────────────────────────────────────────
async function callGoogleGemini(apiKey, modelId, messages) {
  // 将 OpenAI 格式 messages 转换为 Gemini contents
  const contents = [];
  let systemInstruction = null;

  for (const m of messages) {
    if (m.role === 'system') {
      systemInstruction = { parts: [{ text: m.content }] };
    } else {
      contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      });
    }
  }

  const body = { contents, generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } };
  if (systemInstruction) body.systemInstruction = systemInstruction;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    let msg = `Google API Error ${res.status}`;
    try { msg = JSON.parse(t).error?.message || msg; } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // 转换为 OpenAI 格式，方便前端统一处理
  return {
    choices: [{ message: { role: 'assistant', content: text } }],
    model: modelId,
  };
}

// ── Anthropic Messages API ────────────────────────────────────────────────────
async function callAnthropic(apiKey, modelId, messages) {
  const system = messages.find(m => m.role === 'system')?.content;
  const filtered = messages.filter(m => m.role !== 'system');

  const body = { model: modelId, max_tokens: 2048, messages: filtered };
  if (system) body.system = system;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    let msg = `Anthropic API Error ${res.status}`;
    try { msg = JSON.parse(t).error?.message || msg; } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || '';

  // 转换为 OpenAI 格式
  return {
    choices: [{ message: { role: 'assistant', content: text } }],
    model: modelId,
  };
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
