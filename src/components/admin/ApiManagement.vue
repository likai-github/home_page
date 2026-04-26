<template>
  <div class="api-management">
    <!-- 平台列表 -->
    <div class="section-card">
      <div class="section-header">
        <h3>🔌 API 平台管理</h3>
        <button @click="showAddPlatform = true" class="btn-primary">
          ➕ 添加平台
        </button>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="platforms.length > 0" class="platforms-grid">
        <div 
          v-for="platform in platforms" 
          :key="platform.id" 
          class="platform-card"
          :class="{ 'platform-active': platform.status === 'active' }"
        >
          <div class="platform-header">
            <div class="platform-info">
              <h4>{{ platform.display_name }}</h4>
              <span class="platform-badge">{{ platform.name }}</span>
            </div>
            <div class="platform-actions">
              <button @click="viewPlatformModels(platform)" class="btn-icon" title="查看模型">
                📋
              </button>
              <button @click="editPlatform(platform)" class="btn-icon" title="编辑">
                ✏️
              </button>
              <button @click="deletePlatformConfirm(platform)" class="btn-icon btn-danger" title="删除">
                🗑️
              </button>
            </div>
          </div>

          <div class="platform-body">
            <p v-if="platform.description" class="platform-description">
              {{ platform.description }}
            </p>
            <div class="platform-stats">
              <span class="stat-item">
                <span class="stat-label">总模型:</span>
                <span class="stat-value">{{ platform.model_count || 0 }}</span>
              </span>
              <span class="stat-item">
                <span class="stat-label">已启用:</span>
                <span class="stat-value enabled">{{ platform.enabled_model_count || 0 }}</span>
              </span>
            </div>
            <div class="platform-meta">
              <span v-if="platform.api_key" class="meta-tag">🔑 已配置密钥</span>
              <span v-if="platform.base_url" class="meta-tag">🌐 {{ platform.base_url }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">📦</div>
        <p>暂无 API 平台</p>
        <button @click="showAddPlatform = true" class="btn-primary">
          添加第一个平台
        </button>
      </div>
    </div>

    <!-- 添加/编辑平台对话框 -->
    <div v-if="showAddPlatform || editingPlatform" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editingPlatform ? '编辑平台' : '添加平台' }}</h3>
          <button @click="closeModal" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>平台类型 *</label>
            <select v-model="platformForm.name" :disabled="!!editingPlatform" @change="onPlatformTypeChange">
              <option value="">请选择</option>
              <option value="nvidia">NVIDIA</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google AI</option>
              <option value="custom">自定义</option>
            </select>
          </div>

          <div class="form-group">
            <label>显示名称 *</label>
            <input v-model="platformForm.display_name" type="text" placeholder="例如: NVIDIA API" />
          </div>

          <div class="form-group">
            <label>API Key</label>
            <div class="input-with-button">
              <input 
                v-model="platformForm.api_key" 
                :type="showKey ? 'text' : 'password'"
                placeholder="请输入 API Key"
              />
              <button @click="showKey = !showKey" class="btn-toggle">
                {{ showKey ? '👁️' : '👁️‍🗨️' }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>Base URL</label>
            <input 
              v-model="platformForm.base_url" 
              type="text" 
              placeholder="例如: https://api.example.com"
              :readonly="isBaseUrlReadonly"
            />
            <small class="hint">{{ baseUrlHint }}</small>
          </div>

          <div class="form-group">
            <label>描述</label>
            <textarea v-model="platformForm.description" rows="3" placeholder="平台描述..."></textarea>
          </div>

          <div class="form-group">
            <label>状态</label>
            <select v-model="platformForm.status">
              <option value="active">启用</option>
              <option value="inactive">禁用</option>
            </select>
          </div>

          <div v-if="error" class="message error">{{ error }}</div>
        </div>
        <div class="modal-footer">
          <button @click="closeModal" class="btn-secondary">取消</button>
          <button @click="savePlatform" class="btn-primary" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 模型管理对话框 -->
    <div v-if="selectedPlatform" class="modal-overlay" @click.self="closeModelsModal">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h3>{{ selectedPlatform.display_name }} - 模型管理</h3>
          <button @click="closeModelsModal" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="models-toolbar">
            <button @click="syncModels" class="btn-primary" :disabled="syncing">
              {{ syncing ? '⏳ 同步中...' : '🔄 同步模型' }}
            </button>
            <div class="search-box">
              <input 
                v-model="modelSearch" 
                type="text" 
                placeholder="🔍 搜索模型..."
              />
            </div>
          </div>

          <div v-if="syncSuccess" class="message success">{{ syncSuccess }}</div>
          <div v-if="syncError" class="message error">{{ syncError }}</div>

          <div v-if="loadingModels" class="loading-state">
            <div class="spinner"></div>
            <p>加载模型列表...</p>
          </div>

          <div v-else-if="filteredModels.length > 0">
            <div class="models-stats">
              <span class="stat-badge">总计: {{ filteredModels.length }}</span>
              <span class="stat-badge enabled">已启用: {{ enabledModelsCount }}</span>
              <span class="stat-badge disabled">未启用: {{ disabledModelsCount }}</span>
            </div>

            <div class="models-list">
              <div 
                v-for="model in filteredModels" 
                :key="model.id" 
                class="model-item"
                :class="{ 'model-enabled': model.enabled }"
              >
                <div class="model-info">
                  <h4>{{ model.model_name }}</h4>
                  <p v-if="model.description" class="model-description">{{ model.description }}</p>
                  <div v-if="model.metadata" class="model-meta">
                    <span v-for="(value, key) in parseMetadata(model.metadata)" :key="key" class="meta-tag">
                      {{ key }}: {{ value }}
                    </span>
                  </div>
                </div>
                <div class="model-toggle">
                  <label class="switch">
                    <input 
                      type="checkbox" 
                      :checked="model.enabled"
                      @change="toggleModel(model)"
                    />
                    <span class="slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <div class="empty-icon">📦</div>
            <p>暂无模型</p>
            <p class="hint">点击"同步模型"从 API 获取模型列表</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../../api';

const platforms = ref([]);
const loading = ref(false);
const showAddPlatform = ref(false);
const editingPlatform = ref(null);
const platformForm = ref({
  name: '',
  display_name: '',
  api_key: '',
  base_url: '',
  description: '',
  status: 'active'
});
const showKey = ref(false);
const saving = ref(false);
const error = ref('');

const selectedPlatform = ref(null);
const models = ref([]);
const loadingModels = ref(false);
const syncing = ref(false);
const syncSuccess = ref('');
const syncError = ref('');
const modelSearch = ref('');

// 平台默认 URL 配置
const platformDefaults = {
  nvidia: {
    base_url: 'https://integrate.api.nvidia.com/v1',
    display_name: 'NVIDIA API'
  },
  openai: {
    base_url: 'https://api.openai.com/v1',
    display_name: 'OpenAI API'
  },
  anthropic: {
    base_url: 'https://api.anthropic.com/v1',
    display_name: 'Anthropic API'
  },
  google: {
    base_url: 'https://generativelanguage.googleapis.com/v1',
    display_name: 'Google AI API'
  },
  custom: {
    base_url: '',
    display_name: '自定义平台'
  }
};

const isBaseUrlReadonly = computed(() => {
  // 编辑模式下可以修改，新建模式下非自定义平台不可修改
  if (editingPlatform.value) {
    return false;
  }
  return platformForm.value.name && platformForm.value.name !== 'custom';
});

const baseUrlHint = computed(() => {
  if (editingPlatform.value) {
    return '可以修改为自定义 URL';
  }
  if (platformForm.value.name === 'custom') {
    return '请输入自定义 API 的 Base URL';
  }
  if (platformForm.value.name && platformForm.value.name !== 'custom') {
    return '已自动填充默认 URL';
  }
  return '选择平台类型后自动填充';
});

const filteredModels = computed(() => {
  if (!modelSearch.value) return models.value;
  const query = modelSearch.value.toLowerCase();
  return models.value.filter(m => 
    m.model_name.toLowerCase().includes(query) ||
    (m.description && m.description.toLowerCase().includes(query))
  );
});

const enabledModelsCount = computed(() => 
  models.value.filter(m => m.enabled).length
);

const disabledModelsCount = computed(() => 
  models.value.filter(m => !m.enabled).length
);

onMounted(() => {
  loadPlatforms();
});

const loadPlatforms = async () => {
  loading.value = true;
  try {
    const data = await api.getPlatforms();
    platforms.value = data.platforms || [];
  } catch (err) {
    console.error('加载平台失败:', err);
  } finally {
    loading.value = false;
  }
};

const editPlatform = (platform) => {
  editingPlatform.value = platform;
  platformForm.value = {
    name: platform.name,
    display_name: platform.display_name,
    api_key: platform.api_key || '',
    base_url: platform.base_url || '',
    description: platform.description || '',
    status: platform.status
  };
};

const onPlatformTypeChange = () => {
  const platformType = platformForm.value.name;
  if (platformType && platformDefaults[platformType]) {
    const defaults = platformDefaults[platformType];
    
    // 自动填充 display_name（如果为空）
    if (!platformForm.value.display_name) {
      platformForm.value.display_name = defaults.display_name;
    }
    
    // 自动填充 base_url
    platformForm.value.base_url = defaults.base_url;
  }
};

const closeModal = () => {
  showAddPlatform.value = false;
  editingPlatform.value = null;
  platformForm.value = {
    name: '',
    display_name: '',
    api_key: '',
    base_url: '',
    description: '',
    status: 'active'
  };
  error.value = '';
};

const savePlatform = async () => {
  if (!platformForm.value.name || !platformForm.value.display_name) {
    error.value = '请填写必填项';
    return;
  }

  saving.value = true;
  error.value = '';

  try {
    if (editingPlatform.value) {
      await api.updatePlatform(editingPlatform.value.id, platformForm.value);
    } else {
      await api.createPlatform(platformForm.value);
    }
    await loadPlatforms();
    closeModal();
  } catch (err) {
    error.value = err.message || '保存失败';
  } finally {
    saving.value = false;
  }
};

const deletePlatformConfirm = async (platform) => {
  if (!confirm(`确定要删除平台"${platform.display_name}"吗？这将同时删除所有关联的模型配置。`)) {
    return;
  }

  try {
    await api.deletePlatform(platform.id);
    await loadPlatforms();
  } catch (err) {
    alert('删除失败: ' + err.message);
  }
};

const viewPlatformModels = async (platform) => {
  selectedPlatform.value = platform;
  loadingModels.value = true;
  syncSuccess.value = '';
  syncError.value = '';

  try {
    const data = await api.getPlatformModels(platform.id);
    models.value = data.models || [];
  } catch (err) {
    console.error('加载模型失败:', err);
    syncError.value = '加载模型失败: ' + err.message;
  } finally {
    loadingModels.value = false;
  }
};

const closeModelsModal = () => {
  selectedPlatform.value = null;
  models.value = [];
  modelSearch.value = '';
  syncSuccess.value = '';
  syncError.value = '';
};

const syncModels = async () => {
  if (!selectedPlatform.value) return;

  syncing.value = true;
  syncSuccess.value = '';
  syncError.value = '';

  try {
    const data = await api.syncPlatformModels(selectedPlatform.value.id);
    syncSuccess.value = `✓ ${data.message} (新增: ${data.added}, 更新: ${data.updated})`;
    
    // 重新加载模型列表
    const modelsData = await api.getPlatformModels(selectedPlatform.value.id);
    models.value = modelsData.models || [];
    
    // 刷新平台列表以更新统计
    await loadPlatforms();
    
    setTimeout(() => { syncSuccess.value = ''; }, 5000);
  } catch (err) {
    syncError.value = '✗ ' + (err.message || '同步失败');
  } finally {
    syncing.value = false;
  }
};

const toggleModel = async (model) => {
  if (!selectedPlatform.value) return;

  const newEnabled = !model.enabled;
  
  try {
    await api.updateModel(selectedPlatform.value.id, model.model_id, { enabled: newEnabled });
    model.enabled = newEnabled;
    
    // 刷新平台列表以更新统计
    await loadPlatforms();
  } catch (err) {
    console.error('切换模型状态失败:', err);
    alert('操作失败: ' + err.message);
  }
};

const parseMetadata = (metadata) => {
  if (!metadata) return {};
  try {
    return typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
  } catch {
    return {};
  }
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.section-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.75rem 1.5rem;
  background: #f0f0f0;
  color: #333;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: #e0e0e0;
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

.platforms-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.platform-card {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.platform-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
}

.platform-card.platform-active {
  border-color: #4caf50;
  background: #f9fdf9;
}

.platform-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.platform-info h4 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.2rem;
}

.platform-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #667eea;
  color: white;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.platform-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  width: 36px;
  height: 36px;
  padding: 0;
  background: #f0f0f0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.3s ease;
}

.btn-icon:hover {
  background: #e0e0e0;
  transform: scale(1.1);
}

.btn-icon.btn-danger:hover {
  background: #fee;
  color: #c33;
}

.platform-body {
  color: #666;
}

.platform-description {
  margin-bottom: 1rem;
  line-height: 1.5;
  font-size: 0.95rem;
}

.platform-stats {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.85rem;
  color: #999;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
}

.stat-value.enabled {
  color: #4caf50;
}

.platform-meta {
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
  color: #bbb;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

.modal-content.modal-large {
  max-width: 900px;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
}

.btn-close {
  width: 32px;
  height: 32px;
  padding: 0;
  background: #f0f0f0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s ease;
}

.btn-close:hover {
  background: #e0e0e0;
  transform: rotate(90deg);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e0e0e0;
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

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-group input:read-only {
  background: #f8f9fa;
  cursor: not-allowed;
}

.form-group .hint {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #999;
}

.input-with-button {
  display: flex;
  gap: 0.5rem;
}

.input-with-button input {
  flex: 1;
}

.btn-toggle {
  padding: 0.75rem 1rem;
  background: #f0f0f0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-toggle:hover {
  background: #e0e0e0;
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

/* 模型管理样式 */
.models-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

.search-box {
  flex: 1;
  max-width: 300px;
}

.search-box input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
}

.search-box input:focus {
  outline: none;
  border-color: #667eea;
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

.models-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.model-item:hover {
  border-color: #667eea;
}

.model-item.model-enabled {
  border-color: #4caf50;
  background: #f1f8f4;
}

.model-info {
  flex: 1;
}

.model-info h4 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1rem;
}

.model-description {
  margin: 0 0 0.5rem 0;
  color: #666;
  font-size: 0.9rem;
}

.model-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.model-toggle {
  margin-left: 1rem;
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

@media (max-width: 768px) {
  .platforms-grid {
    grid-template-columns: 1fr;
  }

  .models-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: none;
  }

  .model-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .model-toggle {
    margin-left: 0;
    margin-top: 1rem;
  }
}
</style>
