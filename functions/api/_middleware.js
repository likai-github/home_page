// API 中间件 - 在所有 /api/* 请求之前执行
import { runMigrations } from '../db/migrations.js';

// 用于跟踪迁移是否已执行
let migrationsExecuted = false;

export async function onRequest(context) {
  const { env, next } = context;

  // 只在第一次请求时执行迁移
  if (!migrationsExecuted && env.DB) {
    try {
      console.log('🚀 检测到数据库，开始执行迁移...');
      await runMigrations(env.DB);
      migrationsExecuted = true;
      console.log('✅ 数据库迁移完成');
    } catch (error) {
      console.error('❌ 数据库迁移失败:', error);
      console.error('错误详情:', error.message);
      console.error('错误堆栈:', error.stack);
    }
  }

  // 继续处理请求
  return next();
}
