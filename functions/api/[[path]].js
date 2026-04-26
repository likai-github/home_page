// Cloudflare Pages Functions - API 路由处理器
// 这个文件会自动部署为 Cloudflare Workers
// 访问路径: https://your-site.pages.dev/api/*

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');

  // CORS 头设置
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 路由分发 - 只处理 users 和 posts
    // 其他路径（auth, platforms, settings, database, nvidia）由各自的文件夹处理
    if (path.startsWith('users')) {
      return handleUsers(request, env, corsHeaders);
    } else if (path.startsWith('posts')) {
      return handlePosts(request, env, corsHeaders);
    }
    
    // 如果不是 users 或 posts，返回 null 让其他处理器处理
    // 注意：这里不返回 404，让 Cloudflare Pages 继续查找其他匹配的路由
    return new Response(JSON.stringify({ 
      error: 'Not Found',
      message: 'This endpoint is not handled by the main API router',
      path: path
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// 用户相关 API
async function handleUsers(request, env, corsHeaders) {
  const url = new URL(request.url);
  const method = request.method;

  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  // GET /api/users - 获取所有用户
  if (method === 'GET' && url.pathname === '/api/users') {
    try {
      const { results } = await env.DB.prepare(`
        SELECT 
          u.id, 
          u.username, 
          u.email, 
          u.avatar,
          u.status,
          u.created_at,
          GROUP_CONCAT(r.display_name) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `).all();
      
      return jsonResponse({ users: results }, 200, corsHeaders);
    } catch (error) {
      console.error('Get users error:', error);
      return jsonResponse({ error: error.message }, 500, corsHeaders);
    }
  }

  // GET /api/users/:id - 获取单个用户
  if (method === 'GET' && url.pathname.match(/^\/api\/users\/\d+$/)) {
    const id = url.pathname.split('/').pop();
    try {
      const user = await env.DB.prepare(`
        SELECT 
          u.id, 
          u.username, 
          u.email, 
          u.avatar,
          u.status,
          u.created_at
        FROM users u
        WHERE u.id = ?
      `).bind(id).first();
      
      if (!user) {
        return jsonResponse({ error: 'User not found' }, 404, corsHeaders);
      }

      // 获取用户角色
      const { results: roles } = await env.DB.prepare(`
        SELECT r.id, r.name, r.display_name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = ?
      `).bind(id).all();

      user.roles = roles;
      
      return jsonResponse({ user }, 200, corsHeaders);
    } catch (error) {
      console.error('Get user error:', error);
      return jsonResponse({ error: error.message }, 500, corsHeaders);
    }
  }

  // POST /api/users - 创建用户
  if (method === 'POST' && url.pathname === '/api/users') {
    try {
      const body = await request.json();
      const { username, email, password } = body;

      if (!username || !email || !password) {
        return jsonResponse({ error: 'Username, email and password are required' }, 400, corsHeaders);
      }

      // 简单的密码哈希
      const hashedPassword = await simpleHash(password);

      const result = await env.DB.prepare(
        'INSERT INTO users (username, email, password_hash, status) VALUES (?, ?, ?, ?)'
      ).bind(username, email, hashedPassword, 'active').run();

      // 默认分配普通用户角色
      await env.DB.prepare(
        'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)'
      ).bind(result.meta.last_row_id, 4).run();

      return jsonResponse({ 
        message: 'User created',
        id: result.meta.last_row_id 
      }, 201, corsHeaders);
    } catch (error) {
      console.error('Create user error:', error);
      return jsonResponse({ error: error.message }, 500, corsHeaders);
    }
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

// 文章相关 API
async function handlePosts(request, env, corsHeaders) {
  const url = new URL(request.url);
  const method = request.method;

  if (!env.DB) {
    return jsonResponse({ error: 'Database not configured' }, 503, corsHeaders);
  }

  // GET /api/posts - 获取所有文章
  if (method === 'GET' && url.pathname === '/api/posts') {
    try {
      const { results } = await env.DB.prepare(`
        SELECT 
          p.*,
          u.username as author_name
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.id
        ORDER BY p.created_at DESC
      `).all();
      
      return jsonResponse({ posts: results }, 200, corsHeaders);
    } catch (error) {
      console.error('Get posts error:', error);
      return jsonResponse({ error: error.message }, 500, corsHeaders);
    }
  }

  // POST /api/posts - 创建文章
  if (method === 'POST' && url.pathname === '/api/posts') {
    try {
      const body = await request.json();
      const { title, content, author_id } = body;

      if (!title || !content) {
        return jsonResponse({ error: 'Title and content are required' }, 400, corsHeaders);
      }

      const result = await env.DB.prepare(
        'INSERT INTO posts (title, content, author_id) VALUES (?, ?, ?)'
      ).bind(title, content, author_id || null).run();

      return jsonResponse({ 
        message: 'Post created',
        id: result.meta.last_row_id 
      }, 201, corsHeaders);
    } catch (error) {
      console.error('Create post error:', error);
      return jsonResponse({ error: error.message }, 500, corsHeaders);
    }
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

// 简单的哈希函数
async function simpleHash(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 辅助函数：返回 JSON 响应
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}
