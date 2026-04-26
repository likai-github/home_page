<template>
  <div class="admin-page">
    <div class="admin-header">
      <h1>NVIDIA API 管理后台</h1>
      <div class="user-info">
        <span>欢迎，{{ username }}</span>
        <button @click="logout" class="btn-logout">退出登录</button>
      </div>
    </div>

    <div class="admin-container">
      <!-- API 配置区域 -->
      <div class="section">
        <h2>API 配置</h2>
        <div class="api-config">
          <div class="form-group">
            <label>NVIDIA API Key</label>
            <div class="input-with-button">
              <input 
                v-model="apiKey" 
                :type="showKey ? 'text' : 'password'"
                placeholder="请输入 NVIDIA API Key"
              />
              <button @click="showKey = !showKey" class="btn-toggle-key">
                {{ showKey ? '隐藏' : '显示' }}
              </button>
            </div>
          </div>
          <button @click="saveApiKey" class="btn-save" :disabled="saving">
            {{ saving ? '保存中...' : '保存配置' }}
          </button>
        </div>
      </div>

      <!-- 可用模型列表 -->
      <div class="section">
        <div class="section-header">
          <h2>可用模型列表</h2>
          <button @click="fetchModels" class="btn-refresh" :disabled="loading">
            {{ loading ? '加载中...' : '刷新列表' }}
          </button>
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">{{ success }}</div>

        <div v-if="loading" class="loading">
          <p>正在加载模型列表...</p>
        </div>

        <div v-else-if="models.length > 0" class="models-grid">
          <div 
            v-for="model in models" 
            :key="model.id" 
            class="model-card"
            :class="{ 'model-enabled': model.enabled }"
          >
            <div class="model-header">
              <h3>{{ model.id }}</h3>
              <label class="switch">
                <input 
                  type="checkbox" 
                  v-model="model.enabled"
                  @change="toggleModel(model)"
                />
                <span class="slider"></span>
              </label>
            </div>
            <div class="model-info">
              <p v-if="model.description" class="model-description">
                {{ model.description }}
              </p>
              <div class="model-meta">
                <span v-if="model.owned_by" class="meta-item">
                  <strong>提供商:</strong> {{ model.owned_by }}
                </span>
                <span v-if="model.created" class="meta-item">
                  <strong>创建时间:</strong> {{ formatDate(model.created) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="!loading" class="empty-state">
          <p>暂无可用模型</p>
          <p class="hint">请先配置 API Key 并点击刷新</p>
        </div>
      </div>

      <!-- 已启用模型统计 -->
      <div class="section stats">
        <h2>统计信息</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">{{ models.length }}</div>
            <div class="stat-label">总模型数</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ enabledModelsCount }}</div>
            <div class="stat-label">已启用</div>
          </div>
          <div class="stat-card">
            <div class="stat-number">{{ models.length - enabledModelsCount }}</div>
            <div class="stat-label">未启用</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';

const router = useRouter();
const username = ref(localStorage.getItem('username') || '用户');
const apiKey = ref('');
const showKey = ref(false);
const models = ref([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const success = ref('');

const enabledModelsCount = computed(() => {
  return models.value.filter(m => m.enabled).length;
});

const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  router.push('/login');
};

const saveApiKey = async () => {
  if (!apiKey.value.trim()) {
    error.value = '请输入 API Key';
    return;
  }

  saving.value = true;
  error.value = '';
  success.value = '';

  try {
    await api.saveNvidiaApiKey(apiKey.value);
    success.value = 'API Key 保存成功！';
    setTimeout(() => {
      success.value = '';
    }, 3000);
  } catch (err) {
    error.value = err.message || '保存失败';
  } finally {
    saving.value = false;
  }
};

const fetchModels = async () => {
  if (!apiKey.value.trim()) {
    error.value = '请先配置 API Key';
    return;
  }

  loading.value = true;
  error.value = '';
  success.value = '';

  try {
    const data = await api.getNvidiaModels(apiKey.value);
    models.value = (data.data || []).map(model => ({
      ...model,
      enabled: false
    }));
    success.value = `成功加载 ${models.value.length} 个模型`;
    setTimeout(() => {
      success.value = '';
    }, 3000);
  } catch (err) {
    error.value = err.message || '加载模型失败';
  } finally {
    loading.value = false;
  }
};

const toggleModel = async (model) => {
  try {
    await api.toggleNvidiaModel(model.id, model.enabled);
  } catch (err) {
    console.error('切换模型状态失败:', err);
    model.enabled = !model.enabled; // 回滚状态
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('zh-CN');
};

onMounted(() => {
  // 检查登录状态
  const token = localStorage.getItem('token');
  if (!token) {
    router.push('/login');
    return;
  }

  // 加载保存的 API Key
  api.getNvidiaApiKey().then(data => {
    if (data.apiKey) {
      apiKey.value = data.apiKey;
    }
  }).catch(err => {
    console.error('加载 API Key 失败:', err);
  });
});
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.admin-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem 3rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.admin-header h1 {
  margin: 0;
  font-size: 1.8rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.btn-logout {
  padding: 0.5rem 1.5rem;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-logout:hover {
  background: rgba(255, 255, 255, 0.3);
}

.admin-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem 3rem;
}

.section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section h2 {
  margin: 0 0 1.5rem 0;
  color: #333;
  font-size: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
}

.api-config {
  max-width: 600px;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}

.input-with-button {
  display: flex;
  gap: 0.5rem;
}

.form-group input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.btn-toggle-key {
  padding: 0.75rem 1.5rem;
  background: #f0f0f0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-toggle-key:hover {
  background: #e0e0e0;
}

.btn-save, .btn-refresh {
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-save:hover:not(:disabled), 
.btn-refresh:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-save:disabled, 
.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  padding: 1rem;
  background: #fee;
  color: #c33;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.success-message {
  padding: 1rem;
  background: #efe;
  color: #3c3;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.model-card {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.model-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
}

.model-card.model-enabled {
  border-color: #4caf50;
  background: #f1f8f4;
}

.model-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.model-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
  word-break: break-word;
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 26px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #4caf50;
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.model-info {
  color: #666;
  font-size: 0.9rem;
}

.model-description {
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

.model-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.meta-item {
  font-size: 0.85rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #999;
}

.empty-state .hint {
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  text-align: center;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
}

.stat-number {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 1rem;
  opacity: 0.9;
}

@media (max-width: 768px) {
  .admin-header {
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
  }

  .admin-container {
    padding: 1rem;
  }

  .models-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
