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

  // 检查注册开关（从配置表读取）
  const registrationConfig = await env.DB.prepare(
    'SELECT value FROM config WHERE key = ?'
  ).bind('allow_registration').first();

  // 检查是否有用户存在
  const userCount = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM users'
  ).first();

  const isFirstUser = userCount.count === 0;

  // 如果不是第一个用户，且注册已关闭，则拒绝注册
  if (!isFirstUser && registrationConfig && registrationConfig.value === 'false') {
    return jsonResponse({ error: 'Registration is currently disabled' }, 403, corsHeaders);
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

  // 第一个用户自动成为管理员
  const role = isFirstUser ? 'admin' : 'user';
  const bio = `${hashedPassword}|role:${role}`;

  // 创建用户
  const result = await env.DB.prepare(
    'INSERT INTO users (name, email, bio) VALUES (?, ?, ?)'
  ).bind(username, username, bio).run();

  return jsonResponse({
    message: 'User registered successfully',
    userId: result.meta.last_row_id,
    isAdmin: isFirstUser
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

  // 解析 bio 字段（格式：hashedPassword|role:admin）
  const bioparts = user.bio.split('|');
  const storedHash = bioparts[0];
  const roleInfo = bioparts[1] || 'role:user';
  const role = roleInfo.split(':')[1] || 'user';

  // 验证密码
  const hashedPassword = await simpleHash(password);
  if (storedHash !== hashedPassword) {
    return jsonResponse({ error: 'Invalid credentials' }, 401, corsHeaders);
  }

  // 生成简单的 token（生产环境应使用 JWT）
  const token = await generateToken(user.id);

  return jsonResponse({
    token,
    user: {
      id: user.id,
      username: user.name,
      isAdmin: role === 'admin'
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
