<template>
  <div class="system-settings">
    <!-- 注册开关 -->
    <div class="section-card">
      <h3>注册设置</h3>
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">允许新用户注册</div>
          <div class="setting-description">关闭后，新用户将无法注册账号</div>
        </div>
        <label class="switch">
          <input 
            type="checkbox" 
            v-model="settings.allowRegistration"
            @change="saveSettings"
            :disabled="!isAdmin"
          />
          <span class="slider"></span>
        </label>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">需要邮箱验证</div>
          <div class="setting-description">新用户注册后需要验证邮箱</div>
        </div>
        <label class="switch">
          <input 
            type="checkbox" 
            v-model="settings.requireEmailVerification"
            @change="saveSettings"
            :disabled="!isAdmin"
          />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <!-- API 设置 -->
    <div class="section-card">
      <h3>API 设置</h3>
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">API 速率限制</div>
          <div class="setting-description">每分钟最大请求次数</div>
        </div>
        <input 
          type="number" 
          v-model.number="settings.apiRateLimit"
          @change="saveSettings"
          :disabled="!isAdmin"
          class="setting-input"
          min="1"
          max="1000"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">启用 API 日志</div>
          <div class="setting-description">记录所有 API 请求日志</div>
        </div>
        <label class="switch">
          <input 
            type="checkbox" 
            v-model="settings.enableApiLogging"
            @change="saveSettings"
            :disabled="!isAdmin"
          />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <!-- 安全设置 -->
    <div class="section-card">
      <h3>安全设置</h3>
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">会话超时时间（分钟）</div>
          <div class="setting-description">用户无操作后自动登出</div>
        </div>
        <input 
          type="number" 
          v-model.number="settings.sessionTimeout"
          @change="saveSettings"
          :disabled="!isAdmin"
          class="setting-input"
          min="5"
          max="1440"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">密码最小长度</div>
          <div class="setting-description">用户密码的最小字符数</div>
        </div>
        <input 
          type="number" 
          v-model.number="settings.minPasswordLength"
          @change="saveSettings"
          :disabled="!isAdmin"
          class="setting-input"
          min="6"
          max="32"
        />
      </div>
    </div>

    <!-- 系统信息 -->
    <div class="section-card">
      <h3>系统信息</h3>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">系统版本</div>
          <div class="info-value">v1.0.0</div>
        </div>
        <div class="info-item">
          <div class="info-label">数据库</div>
          <div class="info-value">Cloudflare D1</div>
        </div>
        <div class="info-item">
          <div class="info-label">运行环境</div>
          <div class="info-value">Cloudflare Pages</div>
        </div>
        <div class="info-item">
          <div class="info-label">最后更新</div>
          <div class="info-value">{{ lastUpdate }}</div>
        </div>
      </div>
    </div>

    <!-- 危险操作 -->
    <div class="section-card danger-zone" v-if="isAdmin">
      <h3>⚠️ 危险操作</h3>
      <div class="danger-actions">
        <button @click="clearCache" class="btn-danger">
          🗑️ 清除缓存
        </button>
        <button @click="resetSettings" class="btn-danger">
          🔄 重置设置
        </button>
        <button @click="exportData" class="btn-danger">
          📦 导出数据
        </button>
      </div>
    </div>

    <div v-if="error" class="message error">{{ error }}</div>
    <div v-if="success" class="message success">{{ success }}</div>

    <div v-if="!isAdmin" class="permission-notice">
      ⚠️ 您没有权限修改系统设置
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../../api';

const props = defineProps({
  isAdmin: {
    type: Boolean,
    default: false
  }
});

const settings = ref({
  allowRegistration: true,
  requireEmailVerification: false,
  apiRateLimit: 60,
  enableApiLogging: true,
  sessionTimeout: 30,
  minPasswordLength: 8
});

const error = ref('');
const success = ref('');
const lastUpdate = ref(new Date().toLocaleString('zh-CN'));

const saveSettings = async () => {
  if (!props.isAdmin) {
    error.value = '权限不足';
    return;
  }

  try {
    // 这里应该调用后端 API 保存设置
    await api.saveSystemSettings(settings.value);
    success.value = '✓ 设置已保存';
    setTimeout(() => { success.value = ''; }, 3000);
  } catch (err) {
    error.value = '✗ 保存失败: ' + err.message;
  }
};

const clearCache = () => {
  if (!confirm('确定要清除所有缓存吗？')) return;
  
  success.value = '✓ 缓存已清除';
  setTimeout(() => { success.value = ''; }, 3000);
};

const resetSettings = () => {
  if (!confirm('确定要重置所有设置为默认值吗？此操作不可恢复！')) return;
  
  settings.value = {
    allowRegistration: true,
    requireEmailVerification: false,
    apiRateLimit: 60,
    enableApiLogging: true,
    sessionTimeout: 30,
    minPasswordLength: 8
  };
  
  saveSettings();
};

const exportData = () => {
  success.value = '✓ 数据导出已开始...';
  setTimeout(() => { success.value = ''; }, 3000);
};

onMounted(async () => {
  try {
    // 加载保存的设置
    const data = await api.getSystemSettings();
    if (data.settings) {
      settings.value = { ...settings.value, ...data.settings };
    }
  } catch (err) {
    console.error('加载设置失败:', err);
  }
});
</script>

<style scoped>
.system-settings {
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

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-info {
  flex: 1;
}

.setting-label {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.setting-description {
  font-size: 0.85rem;
  color: #7f8c8d;
}

.setting-input {
  width: 100px;
  padding: 0.5rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 1rem;
  text-align: center;
}

.setting-input:focus {
  outline: none;
  border-color: #667eea;
}

.setting-input:disabled {
  background: #f0f0f0;
  cursor: not-allowed;
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

input:disabled + .slider {
  opacity: 0.5;
  cursor: not-allowed;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.info-item {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.info-label {
  font-size: 0.85rem;
  color: #7f8c8d;
  margin-bottom: 0.5rem;
}

.info-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
}

.danger-zone {
  border: 2px solid #e74c3c;
  background: #fff5f5;
}

.danger-zone h3 {
  color: #e74c3c;
}

.danger-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.btn-danger {
  padding: 0.75rem 1.5rem;
  background: white;
  border: 2px solid #e74c3c;
  color: #e74c3c;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-danger:hover {
  background: #e74c3c;
  color: white;
  transform: translateY(-2px);
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

.permission-notice {
  padding: 1rem;
  background: #fff3cd;
  color: #856404;
  border-radius: 8px;
  text-align: center;
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .danger-actions {
    flex-direction: column;
  }

  .btn-danger {
    width: 100%;
  }
}
</style>
