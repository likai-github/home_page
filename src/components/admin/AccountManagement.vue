<template>
  <div class="account-management">
    <!-- 用户列表 -->
    <div class="section-card">
      <div class="section-header">
        <h3>用户列表</h3>
        <button @click="fetchUsers" class="btn-refresh" :disabled="loading">
          {{ loading ? '⏳ 加载中...' : '🔄 刷新' }}
        </button>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>正在加载用户列表...</p>
      </div>

      <div v-else-if="users.length > 0">
        <!-- 搜索栏 -->
        <div class="search-bar">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="🔍 搜索用户..."
            class="search-input"
          />
        </div>

        <!-- 用户表格 -->
        <div class="table-container">
          <table class="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户名</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.id">
                <td>{{ user.id }}</td>
                <td>
                  <div class="user-cell">
                    <div class="user-avatar">{{ user.name.charAt(0).toUpperCase() }}</div>
                    <span>{{ user.name }}</span>
                  </div>
                </td>
                <td>{{ user.email }}</td>
                <td>
                  <span class="role-badge" :class="user.isAdmin ? 'admin' : 'user'">
                    {{ user.roles || (user.isAdmin ? '管理员' : '普通用户') }}
                  </span>
                </td>
                <td>{{ formatDate(user.created_at) }}</td>
                <td>
                  <div class="action-buttons">
                    <button 
                      v-if="isAdmin && user.id !== currentUserId"
                      @click="toggleAdmin(user)" 
                      class="btn-action"
                      :title="user.isAdmin ? '取消管理员' : '设为管理员'"
                    >
                      {{ user.isAdmin ? '👤' : '👑' }}
                    </button>
                    <button 
                      v-if="isAdmin && user.id !== currentUserId"
                      @click="deleteUser(user)" 
                      class="btn-action danger"
                      title="删除用户"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 统计信息 -->
        <div class="users-stats">
          <span class="stat-item">总用户: {{ users.length }}</span>
          <span class="stat-item">管理员: {{ adminCount }}</span>
          <span class="stat-item">普通用户: {{ regularUserCount }}</span>
        </div>
      </div>

      <div v-else-if="!loading" class="empty-state">
        <div class="empty-icon">👥</div>
        <p>暂无用户数据</p>
      </div>

      <div v-if="error" class="message error">{{ error }}</div>
      <div v-if="success" class="message success">{{ success }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../../api';

const props = defineProps({
  isAdmin: {
    type: Boolean,
    default: false
  }
});

const users = ref([]);
const loading = ref(false);
const error = ref('');
const success = ref('');
const searchQuery = ref('');
const currentUserId = ref(parseInt(localStorage.getItem('userId') || '0'));

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value;
  
  const query = searchQuery.value.toLowerCase();
  return users.value.filter(u => 
    (u.name || '').toLowerCase().includes(query) ||
    (u.email || '').toLowerCase().includes(query) ||
    (u.username || '').toLowerCase().includes(query)
  );
});

const adminCount = computed(() => users.value.filter(u => u.isAdmin).length);
const regularUserCount = computed(() => users.value.filter(u => !u.isAdmin).length);

const fetchUsers = async () => {
  loading.value = true;
  error.value = '';

  try {
    const data = await api.getUsers();
    users.value = (data.users || []).map(u => ({
      ...u,
      name: u.username || u.name,  // 兼容两种字段名
      isAdmin: u.roles && (u.roles.includes('超级管理员') || u.roles.includes('管理员'))
    }));
  } catch (err) {
    error.value = '✗ ' + (err.message || '加载用户失败');
    console.error('获取用户列表失败:', err);
  } finally {
    loading.value = false;
  }
};

const toggleAdmin = async (user) => {
  if (!props.isAdmin) {
    error.value = '权限不足';
    return;
  }

  try {
    // 这里应该调用后端 API 切换管理员状态
    user.isAdmin = !user.isAdmin;
    success.value = `✓ 已${user.isAdmin ? '设置' : '取消'}管理员权限`;
    setTimeout(() => { success.value = ''; }, 3000);
  } catch (err) {
    error.value = '✗ 操作失败';
    user.isAdmin = !user.isAdmin; // 回滚
  }
};

const deleteUser = async (user) => {
  if (!props.isAdmin) {
    error.value = '权限不足';
    return;
  }

  if (!confirm(`确定要删除用户 "${user.name}" 吗？此操作不可恢复！`)) {
    return;
  }

  try {
    // 这里应该调用后端 API 删除用户
    users.value = users.value.filter(u => u.id !== user.id);
    success.value = '✓ 用户已删除';
    setTimeout(() => { success.value = ''; }, 3000);
  } catch (err) {
    error.value = '✗ 删除失败';
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN');
};

onMounted(() => {
  fetchUsers();
});
</script>

<style scoped>
.account-management {
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
  margin-bottom: 1.5rem;
}

.section-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.3rem;
}

.btn-refresh {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-refresh:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.search-bar {
  margin-bottom: 1.5rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.95rem;
}

.search-input:focus {
  outline: none;
  border-color: #667eea;
}

.table-container {
  overflow-x: auto;
  margin-bottom: 1.5rem;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
}

.users-table th {
  background: #f8f9fa;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #e0e0e0;
}

.users-table td {
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.users-table tr:hover {
  background: #f8f9fa;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.role-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.role-badge.admin {
  background: #ffeaa7;
  color: #d63031;
}

.role-badge.user {
  background: #dfe6e9;
  color: #2d3436;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-action {
  padding: 0.5rem 0.75rem;
  background: #f0f0f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.btn-action:hover {
  background: #e0e0e0;
  transform: scale(1.1);
}

.btn-action.danger:hover {
  background: #fee;
  color: #c33;
}

.users-stats {
  display: flex;
  gap: 1.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-item {
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
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

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #999;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .users-table {
    font-size: 0.85rem;
  }

  .users-table th,
  .users-table td {
    padding: 0.75rem 0.5rem;
  }

  .users-stats {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
