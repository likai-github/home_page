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
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return jsonResponse({ error: 'Username and password are required' }, 400, corsHeaders);
    }

    if (!env.DB) {
      return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
    }

    // 检查注册开关（从配置表读取）
    try {
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
        'SELECT id FROM users WHERE username = ? OR email = ?'
      ).bind(username, username).first();

      if (existing) {
        return jsonResponse({ error: 'User already exists' }, 400, corsHeaders);
      }

      // 简单的密码哈希
      const hashedPassword = await simpleHash(password);

      // 创建用户（使用新的表结构）
      const result = await env.DB.prepare(
        'INSERT INTO users (username, email, password_hash, status) VALUES (?, ?, ?, ?)'
      ).bind(username, username, hashedPassword, 'active').run();

      // 为第一个用户分配超级管理员角色
      if (isFirstUser) {
        await env.DB.prepare(
          'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)'
        ).bind(result.meta.last_row_id, 1).run(); // role_id = 1 是超级管理员
      } else {
        // 其他用户分配普通用户角色
        await env.DB.prepare(
          'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)'
        ).bind(result.meta.last_row_id, 4).run(); // role_id = 4 是普通用户
      }

      return jsonResponse({
        message: 'User registered successfully',
        userId: result.meta.last_row_id,
        isAdmin: isFirstUser
      }, 201, corsHeaders);

    } catch (dbError) {
      console.error('Database error:', dbError);
      return jsonResponse({ 
        error: 'Database error', 
        message: dbError.message 
      }, 500, corsHeaders);
    }
  } catch (error) {
    console.error('Register error:', error);
    return jsonResponse({ 
      error: 'Registration failed', 
      message: error.message 
    }, 500, corsHeaders);
  }
}

async function handleLogin(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return jsonResponse({ error: 'Username and password are required' }, 400, corsHeaders);
    }

    if (!env.DB) {
      return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
    }

    // 查找用户（使用新的表结构）
    const user = await env.DB.prepare(
      'SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?'
    ).bind(username, username).first();

    if (!user) {
      return jsonResponse({ error: 'Invalid credentials' }, 401, corsHeaders);
    }

    // 验证密码
    const hashedPassword = await simpleHash(password);
    if (user.password_hash !== hashedPassword) {
      return jsonResponse({ error: 'Invalid credentials' }, 401, corsHeaders);
    }

    // 查询用户角色
    const userRoles = await env.DB.prepare(`
      SELECT r.name, r.display_name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `).bind(user.id).all();

    const isAdmin = userRoles.results.some(r => r.name === 'super_admin' || r.name === 'admin');

    // 生成 token 并存入数据库
    const token = await generateToken(user.id);

    // 存储 token（有效期 30 天）
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await env.DB.prepare(`
      INSERT INTO config (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `).bind(`token_${user.id}`, JSON.stringify({ token, expiresAt }), JSON.stringify({ token, expiresAt })).run();

    return jsonResponse({
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: isAdmin
      }
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse({ 
      error: 'Login failed', 
      message: error.message 
    }, 500, corsHeaders);
  }
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
