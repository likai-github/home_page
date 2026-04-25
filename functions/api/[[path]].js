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
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 路由分发
    if (path.startsWith('users')) {
      return handleUsers(request, env, corsHeaders);
    } else if (path.startsWith('posts')) {
      return handlePosts(request, env, corsHeaders);
    } else {
      return jsonResponse({ error: 'Not Found' }, 404, corsHeaders);
    }
  } catch (error) {
    console.error('API Error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

// 用户相关 API
async function handleUsers(request, env, corsHeaders) {
  const url = new URL(request.url);
  const method = request.method;

  // GET /api/users - 获取所有用户
  if (method === 'GET' && url.pathname === '/api/users') {
    const { results } = await env.DB.prepare(
      'SELECT id, name, email, created_at FROM users ORDER BY created_at DESC'
    ).all();
    
    return jsonResponse({ users: results }, 200, corsHeaders);
  }

  // GET /api/users/:id - 获取单个用户
  if (method === 'GET' && url.pathname.match(/^\/api\/users\/\d+$/)) {
    const id = url.pathname.split('/').pop();
    const user = await env.DB.prepare(
      'SELECT id, name, email, created_at FROM users WHERE id = ?'
    ).bind(id).first();
    
    if (!user) {
      return jsonResponse({ error: 'User not found' }, 404, corsHeaders);
    }
    
    return jsonResponse({ user }, 200, corsHeaders);
  }

  // POST /api/users - 创建用户
  if (method === 'POST' && url.pathname === '/api/users') {
    const body = await request.json();
    const { name, email } = body;

    if (!name || !email) {
      return jsonResponse({ error: 'Name and email are required' }, 400, corsHeaders);
    }

    const result = await env.DB.prepare(
      'INSERT INTO users (name, email) VALUES (?, ?)'
    ).bind(name, email).run();

    return jsonResponse({ 
      message: 'User created',
      id: result.meta.last_row_id 
    }, 201, corsHeaders);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

// 文章相关 API
async function handlePosts(request, env, corsHeaders) {
  const url = new URL(request.url);
  const method = request.method;

  // GET /api/posts - 获取所有文章
  if (method === 'GET' && url.pathname === '/api/posts') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM posts ORDER BY created_at DESC'
    ).all();
    
    return jsonResponse({ posts: results }, 200, corsHeaders);
  }

  // POST /api/posts - 创建文章
  if (method === 'POST' && url.pathname === '/api/posts') {
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
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
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
