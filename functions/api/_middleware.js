// API 中间件 - 在所有 /api/* 请求之前执行
import { runMigrations } from '../db/migrations.js';

let migrationsExecuted = false;

// 需要登录才能访问的路径前缀（公开接口不在此列）
const PROTECTED_PREFIXES = [
  '/api/platforms',
  '/api/settings',
  '/api/database',
  '/api/users',
  '/api/chat',
];

// 完全公开的路径（无需 token）
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
];

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

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
  if (request.method === 'OPTIONS') {
    return next();
  }

  // 公开路径直接放行
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return next();
  }

  // 受保护路径：验证 token
  if (PROTECTED_PREFIXES.some(p => pathname.startsWith(p))) {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized', message: '请先登录' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // 验证 token 是否在数据库中存在且未过期
    if (env.DB) {
      try {
        const valid = await verifyToken(env.DB, token);
        if (!valid) {
          return new Response(JSON.stringify({ error: 'Unauthorized', message: 'Token 无效或已过期，请重新登录' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      } catch (e) {
        console.error('Token 验证失败:', e);
        // 验证出错时放行（避免数据库问题导致所有请求失败）
      }
    }
  }

  return next();
}

// 遍历所有 token_* 记录，找到匹配且未过期的
async function verifyToken(db, token) {
  try {
    const { results } = await db.prepare(
      "SELECT value FROM config WHERE key LIKE 'token_%'"
    ).all();

    for (const row of results) {
      try {
        const data = JSON.parse(row.value);
        if (data.token === token) {
          // 检查是否过期
          if (new Date(data.expiresAt) > new Date()) {
            return true;
          }
        }
      } catch {}
    }
    return false;
  } catch {
    return true; // 查询失败时放行，避免误拦截
  }
}
