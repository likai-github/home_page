<template>
  <div class="api-management">
    <!-- API 配置 -->
    <div class="section-card">
      <h3>NVIDIA API 配置</h3>
      <div class="api-config">
        <div class="form-group">
          <label>API Key</label>
          <div class="input-with-button">
            <input 
              v-model="apiKey" 
              :type="showKey ? 'text' : 'password'"
              placeholder="请输入 NVIDIA API Key"
            />
            <button @click="showKey = !showKey" class="btn-toggle">
              {{ showKey ? '👁️' : '👁️‍🗨️' }}
            </button>
            <button @click="saveApiKey" class="btn-save" :disabled="saving">
              {{ saving ? '保存中...' : '💾 保存' }}
            </button>
          </div>
        </div>

        <div v-if="error" class="message error">{{ error }}</div>
        <div v-if="success" class="message success">{{ success }}</div>
      </div>
    </div>

    <!-- 模型列表 -->
    <div class="section-card">
      <div class="section-header">
        <h3>可用模型列表</h3>
        <button @click="fetchModels" class="btn-refresh" :disabled="loading">
          {{ loading ? '⏳ 加载中...' : '🔄 刷新列表' }}
        </button>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>正在加载模型列表...</p>
      </div>

      <div v-else-if="models.length > 0">
        <!-- 筛选和搜索 -->
        <div class="filter-bar">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="🔍 搜索模型..."
            class="search-input"
          />
          <select v-model="filterStatus" class="filter-select">
            <option value="all">全部状态</option>
            <option value="enabled">已启用</option>
            <option value="disabled">未启用</option>
          </select>
        </div>

        <!-- 统计信息 -->
        <div class="models-stats">
          <span class="stat-badge">总计: {{ filteredModels.length }}</span>
          <span class="stat-badge enabled">已启用: {{ enabledCount }}</span>
          <span class="stat-badge disabled">未启用: {{ disabledCount }}</span>
        </div>

        <!-- 模型网格 -->
        <div class="models-grid">
          <div 
            v-for="model in filteredModels" 
            :key="model.id" 
            class="model-card"
            :class="{ 'model-enabled': model.enabled }"
          >
            <div class="model-header">
              <h4>{{ model.id }}</h4>
              <label class="switch">
                <input 
                  type="checkbox" 
                  v-model="model.enabled"
                  @change="toggleModel(model)"
                />
                <span class="slider"></span>
              </label>
            </div>
            <div class="model-body">
              <p v-if="model.description" class="model-description">
                {{ model.description }}
              </p>
              <div class="model-meta">
                <span v-if="model.owned_by" class="meta-tag">
                  🏢 {{ model.owned_by }}
                </span>
                <span v-if="model.created" class="meta-tag">
                  📅 {{ formatDate(model.created) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="!loading" class="empty-state">
        <div class="empty-icon">📦</div>
        <p>暂无可用模型</p>
        <p class="hint">请先配置 API Key 并点击刷新</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import api from '../../api';

const apiKey = ref('');
const showKey = ref(false);
const models = ref([]);
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const success = ref('');
const searchQuery = ref('');
const filterStatus = ref('all');

const filteredModels = computed(() => {
  let result = models.value;

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(m => 
      m.id.toLowerCase().includes(query) ||
      (m.description && m.description.toLowerCase().includes(query))
    );
  }

  // 状态过滤
  if (filterStatus.value === 'enabled') {
    result = result.filter(m => m.enabled);
  } else if (filterStatus.value === 'disabled') {
    result = result.filter(m => !m.enabled);
  }

  return result;
});

const enabledCount = computed(() => models.value.filter(m => m.enabled).length);
const disabledCount = computed(() => models.value.filter(m => !m.enabled).length);

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
    success.value = '✓ API Key 保存成功！';
    setTimeout(() => { success.value = ''; }, 3000);
  } catch (err) {
    error.value = '✗ ' + (err.message || '保存失败');
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
    success.value = `✓ 成功加载 ${models.value.length} 个模型`;
    setTimeout(() => { success.value = ''; }, 3000);
  } catch (err) {
    error.value = '✗ ' + (err.message || '加载模型失败');
  } finally {
    loading.value = false;
  }
};

const toggleModel = async (model) => {
  try {
    await api.toggleNvidiaModel(model.id, model.enabled);
  } catch (err) {
    console.error('切换模型状态失败:', err);
    model.enabled = !model.enabled;
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('zh-CN');
};
</script>

<style scoped>
.api-management {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.section-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-card h3 {
  margin: 0 0 1.5rem 0;
  color: #2c3e50;
  font-size: 1.3rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h3 {
  margin: 0;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #2c3e50;
  font-weight: 500;
}

.input-with-button {
  display: flex;
  gap: 0.5rem;
}

.input-with-button input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.input-with-button input:focus {
  outline: none;
  border-color: #667eea;
}

.btn-toggle, .btn-save, .btn-refresh {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-toggle {
  background: #f0f0f0;
}

.btn-toggle:hover {
  background: #e0e0e0;
}

.btn-save, .btn-refresh {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
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

.message {
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.message.error {
  background: #fee;
  color: #c33;
}

.message.success {
  background: #efe;
  color: #3c3;
}

.loading-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 1rem;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.filter-bar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.search-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
  cursor: pointer;
}

.models-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-badge {
  padding: 0.5rem 1rem;
  background: #f0f0f0;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.stat-badge.enabled {
  background: #d4edda;
  color: #155724;
}

.stat-badge.disabled {
  background: #f8d7da;
  color: #721c24;
}

.models-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
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

.model-header h4 {
  margin: 0;
  font-size: 1rem;
  color: #2c3e50;
  word-break: break-word;
  flex: 1;
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
  flex-shrink: 0;
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

.model-body {
  color: #666;
  font-size: 0.9rem;
}

.model-description {
  margin-bottom: 1rem;
  line-height: 1.5;
}

.model-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.meta-tag {
  padding: 0.25rem 0.75rem;
  background: #f0f0f0;
  border-radius: 12px;
  font-size: 0.85rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #999;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.empty-state .hint {
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .models-grid {
    grid-template-columns: 1fr;
  }

  .filter-bar {
    flex-direction: column;
  }

  .input-with-button {
    flex-direction: column;
  }
}
</style>
