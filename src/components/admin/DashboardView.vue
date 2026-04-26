<template>
  <div class="dashboard">
    <h2 class="section-title">系统概览</h2>
    
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
          👥
        </div>
        <div class="stat-content">
          <div class="stat-label">总用户数</div>
          <div class="stat-value">{{ stats.totalUsers }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
          🔌
        </div>
        <div class="stat-content">
          <div class="stat-label">启用模型</div>
          <div class="stat-value">{{ stats.enabledModels }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
          📊
        </div>
        <div class="stat-content">
          <div class="stat-label">API 调用</div>
          <div class="stat-value">{{ stats.apiCalls }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)">
          ✓
        </div>
        <div class="stat-content">
          <div class="stat-label">系统状态</div>
          <div class="stat-value status">{{ statusText }}</div>
        </div>
      </div>
    </div>

    <!-- 快速操作 -->
    <div class="quick-actions">
      <h3>快速操作</h3>
      <div class="actions-grid">
        <button class="action-btn" @click="$emit('navigate', 'api')">
          <span class="action-icon">🔌</span>
          <span class="action-label">配置 API</span>
        </button>
        <button class="action-btn" @click="$emit('navigate', 'accounts')">
          <span class="action-icon">👥</span>
          <span class="action-label">管理账号</span>
        </button>
        <button class="action-btn" @click="$emit('navigate', 'settings')">
          <span class="action-icon">⚙️</span>
          <span class="action-label">系统设置</span>
        </button>
      </div>
    </div>

    <!-- 最近活动 -->
    <div class="recent-activity">
      <h3>最近活动</h3>
      <div class="activity-list">
        <div class="activity-item">
          <div class="activity-icon">🔑</div>
          <div class="activity-content">
            <div class="activity-title">API Key 已更新</div>
            <div class="activity-time">2 分钟前</div>
          </div>
        </div>
        <div class="activity-item">
          <div class="activity-icon">👤</div>
          <div class="activity-content">
            <div class="activity-title">新用户注册</div>
            <div class="activity-time">15 分钟前</div>
          </div>
        </div>
        <div class="activity-item">
          <div class="activity-icon">🔌</div>
          <div class="activity-content">
            <div class="activity-title">模型状态变更</div>
            <div class="activity-time">1 小时前</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  stats: {
    type: Object,
    default: () => ({
      totalUsers: 0,
      enabledModels: 0,
      apiCalls: 0,
      systemStatus: 'running'
    })
  }
});

const statusText = computed(() => {
  return props.stats.systemStatus === 'running' ? '运行中' : '已停止';
});
</script>

<style scoped>
.dashboard {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-title {
  font-size: 1.5rem;
  color: #2c3e50;
  margin-bottom: 1.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 0.9rem;
  color: #7f8c8d;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
}

.stat-value.status {
  font-size: 1.2rem;
  color: #27ae60;
}

.quick-actions, .recent-activity {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.quick-actions h3, .recent-activity h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.2rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.action-btn {
  padding: 1.5rem 1rem;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.action-btn:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.action-icon {
  font-size: 2rem;
}

.action-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #2c3e50;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.activity-item:hover {
  background: #e9ecef;
}

.activity-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.activity-time {
  font-size: 0.85rem;
  color: #7f8c8d;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
