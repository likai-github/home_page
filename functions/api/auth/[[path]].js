// 用户认证 API
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/auth/', '');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (path === 'register' && request.method === 'POST') {
      return handleRegister(request, env, corsHeaders);
    } else if (path === 'login' && request.method === 'POST') {
      return handleLogin(request, env, corsHeaders);
    } else {
      return jsonResponse({ error: 'Not Found' }, 404, corsHeaders);
    }
  } catch (error) {
    console.error('Auth Error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

async function handleRegister(request, env, corsHeaders) {
  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return jsonResponse({ error: 'Username and password are required' }, 400, corsHeaders);
  }

  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  // 检查用户是否已存在
  const existing = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(username).first();

  if (existing) {
    return jsonResponse({ error: 'User already exists' }, 400, corsHeaders);
  }

  // 简单的密码哈希（生产环境应使用更安全的方法）
  const hashedPassword = await simpleHash(password);

  // 创建用户
  const result = await env.DB.prepare(
    'INSERT INTO users (name, email, bio) VALUES (?, ?, ?)'
  ).bind(username, username, hashedPassword).run();

  return jsonResponse({
    message: 'User registered successfully',
    userId: result.meta.last_row_id
  }, 201, corsHeaders);
}

async function handleLogin(request, env, corsHeaders) {
  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return jsonResponse({ error: 'Username and password are required' }, 400, corsHeaders);
  }

  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  // 查找用户
  const user = await env.DB.prepare(
    'SELECT id, name, bio FROM users WHERE email = ?'
  ).bind(username).first();

  if (!user) {
    return jsonResponse({ error: 'Invalid credentials' }, 401, corsHeaders);
  }

  // 验证密码（简化版本）
  const hashedPassword = await simpleHash(password);
  if (user.bio !== hashedPassword) {
    return jsonResponse({ error: 'Invalid credentials' }, 401, corsHeaders);
  }

  // 生成简单的 token（生产环境应使用 JWT）
  const token = await generateToken(user.id);

  return jsonResponse({
    token,
    user: {
      id: user.id,
      username: user.name
    }
  }, 200, corsHeaders);
}

// 简单的哈希函数（生产环境应使用 bcrypt 或类似库）
async function simpleHash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 生成 token
async function generateToken(userId) {
  const data = `${userId}-${Date.now()}`;
  return await simpleHash(data);
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
