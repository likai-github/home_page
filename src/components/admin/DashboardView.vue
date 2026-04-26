<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card" v-for="card in statCards" :key="card.label">
        <div class="stat-icon" :style="{ background: card.gradient }">
          {{ card.icon }}
        </div>
        <div class="stat-content">
          <div class="stat-label">{{ card.label }}</div>
          <div class="stat-value" :class="card.valueClass">
            <span v-if="loading">—</span>
            <span v-else>{{ card.value }}</span>
          </div>
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
        <button class="action-btn" @click="$emit('navigate', 'database')">
          <span class="action-icon">🗄️</span>
          <span class="action-label">数据库</span>
        </button>
        <button class="action-btn" @click="$emit('navigate', 'settings')">
          <span class="action-icon">⚙️</span>
          <span class="action-label">系统设置</span>
        </button>
      </div>
    </div>

    <!-- 系统信息 -->
    <div class="system-info">
      <h3>系统信息</h3>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-key">运行环境</span>
          <span class="info-val">Cloudflare Pages</span>
        </div>
        <div class="info-row">
          <span class="info-key">数据库</span>
          <span class="info-val">Cloudflare D1</span>
        </div>
        <div class="info-row">
          <span class="info-key">系统状态</span>
          <span class="info-val status-ok">● 运行中</span>
        </div>
        <div class="info-row">
          <span class="info-key">当前时间</span>
          <span class="info-val">{{ currentTime }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import api from '../../api';

defineEmits(['navigate']);

const loading = ref(true);
const realStats = ref({ totalUsers: 0, enabledModels: 0, platforms: 0 });
const currentTime = ref('');

const statCards = computed(() => [
  {
    icon: '👥', label: '总用户数',
    value: realStats.value.totalUsers,
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    icon: '🔌', label: '启用模型',
    value: realStats.value.enabledModels,
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    icon: '🌐', label: 'API 平台',
    value: realStats.value.platforms,
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  },
  {
    icon: '✓', label: '系统状态',
    value: '运行中',
    valueClass: 'status',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  },
]);

const updateTime = () => {
  currentTime.value = new Date().toLocaleString('zh-CN');
};

let timer;
onMounted(async () => {
  updateTime();
  timer = setInterval(updateTime, 1000);

  try {
    const [usersData, platformsData] = await Promise.all([
      api.getUsers().catch(() => ({ users: [] })),
      api.getPlatforms().catch(() => ({ platforms: [] })),
    ]);

    const platforms = platformsData.platforms || [];
    const enabledModels = platforms.reduce((sum, p) => sum + (p.enabled_model_count || 0), 0);

    realStats.value = {
      totalUsers: (usersData.users || []).length,
      enabledModels,
      platforms: platforms.length,
    };
  } catch (e) {
    console.error('Dashboard 数据加载失败:', e);
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => clearInterval(timer));
</script>

<style scoped>
.dashboard { animation: fadeIn 0.3s ease; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 20px rgba(0,0,0,0.1);
}

.stat-icon {
  width: 56px; height: 56px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.6rem;
  flex-shrink: 0;
}

.stat-label { font-size: 0.85rem; color: #7f8c8d; margin-bottom: 0.25rem; }
.stat-value { font-size: 1.9rem; font-weight: 700; color: #2c3e50; }
.stat-value.status { font-size: 1.1rem; color: #27ae60; }

/* 快速操作 */
.quick-actions, .system-info {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.quick-actions h3, .system-info h3 {
  margin: 0 0 1.25rem 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 1rem;
}

.action-btn {
  padding: 1.25rem 1rem;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex; flex-direction: column;
  align-items: center; gap: 0.5rem;
}
.action-btn:hover {
  border-color: #667eea;
  background: #f0f4ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102,126,234,0.15);
}
.action-icon { font-size: 1.8rem; }
.action-label { font-size: 0.85rem; font-weight: 500; color: #2c3e50; }

/* 系统信息 */
.info-grid { display: flex; flex-direction: column; gap: 0.75rem; }
.info-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}
.info-key { font-size: 0.9rem; color: #7f8c8d; }
.info-val { font-size: 0.9rem; font-weight: 500; color: #2c3e50; }
.status-ok { color: #27ae60; }

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .actions-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
