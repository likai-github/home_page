<template>
  <div class="database-management">
    <!-- 数据库状态概览 -->
    <div class="section-card">
      <h3>📊 数据库状态</h3>
      
      <div v-if="loadingStatus" class="loading-state">
        <div class="spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="dbStatus" class="status-grid">
        <div class="status-item">
          <div class="status-label">当前版本</div>
          <div class="status-value">v{{ dbStatus.currentVersion }}</div>
        </div>
        <div class="status-item">
          <div class="status-label">最新版本</div>
          <div class="status-value">v{{ dbStatus.latestVersion }}</div>
        </div>
        <div class="status-item">
          <div class="status-label">数据库状态</div>
          <div class="status-value" :class="dbStatus.needsUpdate ? 'status-warning' : 'status-success'">
            {{ dbStatus.needsUpdate ? '需要更新' : '最新' }}
          </div>
        </div>
        <div class="status-item">
          <div class="status-label">表数量</div>
          <div class="status-value">{{ dbStatus.tableCount }}</div>
        </div>
      </div>

      <div class="action-buttons">
        <button @click="checkStatus" class="btn-secondary" :disabled="loadingStatus">
          🔄 刷新状态
        </button>
        <button 
          v-if="dbStatus && dbStatus.needsUpdate" 
          @click="runMigration" 
          class="btn-primary" 
          :disabled="migrating"
        >
          {{ migrating ? '⏳ 更新中...' : '⬆️ 执行更新' }}
        </button>
      </div>

      <div v-if="migrationResult" class="message" :class="migrationResult.success ? 'success' : 'error'">
        {{ migrationResult.message }}
      </div>
    </div>

    <!-- 表信息 -->
    <div class="section-card">
      <div class="section-header">
        <h3>📋 数据表信息</h3>
        <button @click="loadTables" class="btn-secondary" :disabled="loadingTables">
          {{ loadingTables ? '⏳ 加载中...' : '🔄 刷新' }}
        </button>
      </div>

      <div v-if="loadingTables" class="loading-state">
        <div class="spinner"></div>
        <p>加载表信息...</p>
      </div>

      <div v-else-if="tables.length > 0" class="tables-container">
        <div class="tables-summary">
          <span class="summary-badge">总计: {{ tables.length }} 个表</span>
          <span class="summary-badge">预期: 14 个表</span>
        </div>

        <div class="tables-grid">
          <div 
            v-for="table in tables" 
            :key="table.name" 
            class="table-card"
            @click="viewTableDetails(table)"
          >
            <div class="table-header">
              <h4>{{ table.name }}</h4>
              <span class="table-badge">{{ table.row_count }} 行</span>
            </div>
            <div class="table-meta">
              <span class="meta-item">📊 {{ table.description || '数据表' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">📦</div>
        <p>暂无表信息</p>
        <button @click="loadTables" class="btn-primary">加载表信息</button>
      </div>
    </div>

    <!-- 迁移历史 -->
    <div class="section-card">
      <div class="section-header">
        <h3>📜 迁移历史</h3>
        <button @click="loadMigrations" class="btn-secondary" :disabled="loadingMigrations">
          {{ loadingMigrations ? '⏳ 加载中...' : '🔄 刷新' }}
        </button>
      </div>

      <div v-if="loadingMigrations" class="loading-state">
        <div class="spinner"></div>
        <p>加载迁移历史...</p>
      </div>

      <div v-else-if="migrations.length > 0" class="migrations-list">
        <div 
          v-for="migration in migrations" 
          :key="migration.version" 
          class="migration-item"
        >
          <div class="migration-info">
            <div class="migration-version">v{{ migration.version }}</div>
            <div class="migration-details">
              <div class="migration-name">{{ migration.name }}</div>
              <div class="migration-date">{{ formatDate(migration.executed_at) }}</div>
            </div>
          </div>
          <div class="migration-status">✅</div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">📜</div>
        <p>暂无迁移记录</p>
      </div>
    </div>

    <!-- 危险操作 -->
    <div class="section-card danger-zone">
      <h3>⚠️ 危险操作</h3>
      <p class="warning-text">以下操作会影响数据库，请谨慎使用！</p>
      
      <div class="danger-actions">
        <button @click="showResetConfirm = true" class="btn-danger">
          🗑️ 重置数据库
        </button>
      </div>

      <div v-if="resetResult" class="message" :class="resetResult.success ? 'success' : 'error'">
        {{ resetResult.message }}
      </div>
    </div>

    <!-- 表详情对话框 -->
    <div v-if="selectedTable" class="modal-overlay" @click.self="closeTableDetails">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h3>{{ selectedTable.name }} - 表详情</h3>
          <button @click="closeTableDetails" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="table-info">
            <div class="info-item">
              <span class="info-label">表名:</span>
              <span class="info-value">{{ selectedTable.name }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">记录数:</span>
              <span class="info-value">{{ selectedTable.row_count }}</span>
            </div>
          </div>

          <h4>字段结构</h4>
          <div v-if="loadingColumns" class="loading-state">
            <div class="spinner"></div>
            <p>加载字段信息...</p>
          </div>
          <div v-else-if="tableColumns.length > 0" class="columns-table">
            <table>
              <thead>
                <tr>
                  <th>字段名</th>
                  <th>类型</th>
                  <th>非空</th>
                  <th>默认值</th>
                  <th>主键</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="col in tableColumns" :key="col.name">
                  <td><code>{{ col.name }}</code></td>
                  <td>{{ col.type }}</td>
                  <td>{{ col.notnull ? '✓' : '' }}</td>
                  <td>{{ col.dflt_value || '-' }}</td>
                  <td>{{ col.pk ? '✓' : '' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h4>示例数据</h4>
          <div v-if="loadingSampleData" class="loading-state">
            <div class="spinner"></div>
            <p>加载示例数据...</p>
          </div>
          <div v-else-if="sampleData.length > 0" class="sample-data">
            <pre>{{ JSON.stringify(sampleData, null, 2) }}</pre>
          </div>
          <div v-else class="empty-state">
            <p>暂无数据</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 重置确认对话框 -->
    <div v-if="showResetConfirm" class="modal-overlay" @click.self="showResetConfirm = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>⚠️ 确认重置数据库</h3>
          <button @click="showResetConfirm = false" class="btn-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="warning-box">
            <p><strong>警告：此操作将删除所有数据！</strong></p>
            <p>包括：</p>
            <ul>
              <li>所有用户账号</li>
              <li>所有 API 平台配置</li>
              <li>所有模型配置</li>
              <li>所有文章和项目</li>
              <li>所有系统设置</li>
            </ul>
            <p>此操作<strong>不可恢复</strong>！</p>
          </div>

          <div class="form-group">
            <label>请输入 <code>RESET</code> 确认：</label>
            <input 
              v-model="resetConfirmText" 
              type="text" 
              placeholder="输入 RESET"
              @keyup.enter="confirmReset"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showResetConfirm = false" class="btn-secondary">取消</button>
          <button 
            @click="confirmReset" 
            class="btn-danger" 
            :disabled="resetConfirmText !== 'RESET' || resetting"
          >
            {{ resetting ? '⏳ 重置中...' : '确认重置' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../../api';

const loadingStatus = ref(false);
const dbStatus = ref(null);
const migrating = ref(false);
const migrationResult = ref(null);

const loadingTables = ref(false);
const tables = ref([]);

const loadingMigrations = ref(false);
const migrations = ref([]);

const selectedTable = ref(null);
const loadingColumns = ref(false);
const tableColumns = ref([]);
const loadingSampleData = ref(false);
const sampleData = ref([]);

const showResetConfirm = ref(false);
const resetConfirmText = ref('');
const resetting = ref(false);
const resetResult = ref(null);

onMounted(() => {
  checkStatus();
  loadTables();
  loadMigrations();
});

const checkStatus = async () => {
  loadingStatus.value = true;
  try {
    const data = await api.getDatabaseStatus();
    dbStatus.value = data;
  } catch (err) {
    console.error('获取数据库状态失败:', err);
  } finally {
    loadingStatus.value = false;
  }
};

const runMigration = async () => {
  if (!confirm('确定要执行数据库更新吗？')) return;

  migrating.value = true;
  migrationResult.value = null;

  try {
    const data = await api.runMigration();
    migrationResult.value = {
      success: true,
      message: `✓ ${data.message} (v${data.previousVersion} → v${data.currentVersion})`
    };
    await checkStatus();
    await loadMigrations();
  } catch (err) {
    migrationResult.value = {
      success: false,
      message: `✗ 更新失败: ${err.message}`
    };
  } finally {
    migrating.value = false;
  }
};

const loadTables = async () => {
  loadingTables.value = true;
  try {
    const data = await api.getDatabaseTables();
    tables.value = data.tables || [];
  } catch (err) {
    console.error('加载表信息失败:', err);
  } finally {
    loadingTables.value = false;
  }
};

const loadMigrations = async () => {
  loadingMigrations.value = true;
  try {
    const data = await api.getMigrationHistory();
    migrations.value = data.migrations || [];
  } catch (err) {
    console.error('加载迁移历史失败:', err);
  } finally {
    loadingMigrations.value = false;
  }
};

const viewTableDetails = async (table) => {
  selectedTable.value = table;
  loadingColumns.value = true;
  loadingSampleData.value = true;

  try {
    const colData = await api.getTableColumns(table.name);
    tableColumns.value = colData.columns || [];
  } catch (err) {
    console.error('加载字段信息失败:', err);
  } finally {
    loadingColumns.value = false;
  }

  try {
    const sampleDataResult = await api.getTableSampleData(table.name);
    sampleData.value = sampleDataResult.data || [];
  } catch (err) {
    console.error('加载示例数据失败:', err);
  } finally {
    loadingSampleData.value = false;
  }
};

const closeTableDetails = () => {
  selectedTable.value = null;
  tableColumns.value = [];
  sampleData.value = [];
};

const confirmReset = async () => {
  if (resetConfirmText.value !== 'RESET') return;

  resetting.value = true;
  resetResult.value = null;

  try {
    const data = await api.resetDatabase();
    resetResult.value = {
      success: true,
      message: `✓ ${data.message}`
    };
    showResetConfirm.value = false;
    resetConfirmText.value = '';
    
    // 刷新状态
    setTimeout(() => {
      checkStatus();
      loadTables();
      loadMigrations();
    }, 1000);
  } catch (err) {
    resetResult.value = {
      success: false,
      message: `✗ 重置失败: ${err.message}`
    };
  } finally {
    resetting.value = false;
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN');
};
</script>

<style scoped>
.database-management {
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

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.status-item {
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  text-align: center;
}

.status-label {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.status-value {
  font-size: 1.8rem;
  font-weight: 600;
  color: #2c3e50;
}

.status-value.status-success {
  color: #4caf50;
}

.status-value.status-warning {
  color: #ff9800;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.btn-primary, .btn-secondary, .btn-danger {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn-danger {
  background: #f44336;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #d32f2f;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.4);
}

.btn-primary:disabled, 
.btn-secondary:disabled, 
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.message {
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.message.success {
  background: #efe;
  color: #3c3;
}

.message.error {
  background: #fee;
  color: #c33;
}

.tables-summary {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-badge {
  padding: 0.5rem 1rem;
  background: #f0f0f0;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
}

.tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.table-card {
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.table-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.table-header h4 {
  margin: 0;
  font-size: 1rem;
  color: #2c3e50;
}

.table-badge {
  padding: 0.25rem 0.75rem;
  background: #667eea;
  color: white;
  border-radius: 12px;
  font-size: 0.85rem;
}

.table-meta {
  color: #666;
  font-size: 0.9rem;
}

.meta-item {
  display: block;
}

.migrations-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.migration-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.migration-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.migration-version {
  padding: 0.5rem 1rem;
  background: #667eea;
  color: white;
  border-radius: 8px;
  font-weight: 600;
}

.migration-name {
  font-weight: 500;
  color: #2c3e50;
}

.migration-date {
  font-size: 0.85rem;
  color: #999;
}

.migration-status {
  font-size: 1.5rem;
}

.danger-zone {
  border: 2px solid #f44336;
}

.warning-text {
  color: #f44336;
  margin-bottom: 1rem;
}

.danger-actions {
  display: flex;
  gap: 1rem;
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

.table-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 2rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-label {
  font-size: 0.9rem;
  color: #666;
}

.info-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
}

.modal-body h4 {
  margin: 2rem 0 1rem 0;
  color: #2c3e50;
}

.columns-table {
  overflow-x: auto;
}

.columns-table table {
  width: 100%;
  border-collapse: collapse;
}

.columns-table th,
.columns-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.columns-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.columns-table code {
  padding: 0.25rem 0.5rem;
  background: #f0f0f0;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.sample-data pre {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.warning-box {
  padding: 1.5rem;
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.warning-box strong {
  color: #f44336;
}

.warning-box ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
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

.form-group code {
  padding: 0.25rem 0.5rem;
  background: #f0f0f0;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

@media (max-width: 768px) {
  .status-grid {
    grid-template-columns: 1fr;
  }

  .tables-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }

  .table-info {
    grid-template-columns: 1fr;
  }
}
</style>
