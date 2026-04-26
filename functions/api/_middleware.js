// API 中间件 - 在所有 /api/* 请求之前执行
import { runMigrations } from '../db/migrations.js';

let migrationsExecuted = false;

// ── 公开接口（无需 token）────────────────────────────────────────────────────
// Chat 页面需要读取平台列表和模型列表，不要求登录
const PUBLIC_PATTERNS = [
  // 认证
  { method: 'POST', prefix: '/api/auth/' },
  // 读取平台列表 & 单个平台（GET）
  { method: 'GET',  prefix: '/api/platforms' },
  // 读取模型列表（GET /api/platforms/:id/models）已被上面覆盖
];

// ── 需要 token 的接口 ─────────────────────────────────────────────────────────
// 写操作（POST/PUT/DELETE）平台、设置、数据库、用户、AI 对话
const PROTECTED_PREFIXES = [
  '/api/settings',
  '/api/database',
  '/api/users',
  '/api/chat',
];

// 平台的写操作也需要 token
const PROTECTED_PLATFORM_METHODS = ['POST', 'PUT', 'DELETE'];

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // 自动迁移（只执行一次）
  if (!migrationsExecuted && env.DB) {
    try {
      await runMigrations(env.DB);
      migrationsExecuted = true;
    } catch (error) {
      console.error('❌ 数据库迁移失败:', error);
    }
  }

  // OPTIONS 预检直接放行
  if (method === 'OPTIONS') {
    return next();
  }

  // 判断是否需要鉴权
  const needsAuth = (() => {
    // 明确受保护的前缀
    if (PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) return true;
    // 平台的写操作
    if (pathname.startsWith('/api/platforms') && PROTECTED_PLATFORM_METHODS.includes(method)) return true;
    return false;
  })();

  if (needsAuth) {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: '请先登录' }),
        { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    if (env.DB) {
      try {
        const valid = await verifyToken(env.DB, token);
        if (!valid) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized', message: 'Token 无效或已过期，请重新登录' }),
            { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
          );
        }
      } catch (e) {
        console.error('Token 验证出错:', e);
        // 验证出错时放行，避免数据库问题误拦截
      }
    }
  }

  return next();
}

// 遍历 config 表中所有 token_* 记录，找到匹配且未过期的
async function verifyToken(db, token) {
  try {
    const { results } = await db.prepare(
      "SELECT value FROM config WHERE key LIKE 'token_%'"
    ).all();

    for (const row of results) {
      try {
        const data = JSON.parse(row.value);
        if (data.token === token && new Date(data.expiresAt) > new Date()) {
          return true;
        }
      } catch {}
    }
    return false;
  } catch {
    return true; // 查询失败时放行
  }
}
