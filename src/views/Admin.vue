<template>
  <div class="admin-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <h2 v-if="!sidebarCollapsed">管理后台</h2>
        <button @click="toggleSidebar" class="btn-toggle-sidebar">
          {{ sidebarCollapsed ? '☰' : '✕' }}
        </button>
      </div>

      <nav class="sidebar-nav">
        <a 
          v-for="item in menuItems" 
          :key="item.id"
          @click="currentView = item.id"
          :class="{ active: currentView === item.id }"
          class="nav-item"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span v-if="!sidebarCollapsed" class="nav-label">{{ item.label }}</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <div v-if="!sidebarCollapsed" class="user-info">
          <div class="user-avatar">{{ username.charAt(0).toUpperCase() }}</div>
          <div class="user-details">
            <div class="user-name">{{ username }}</div>
            <div class="user-role">{{ isAdmin ? '管理员' : '用户' }}</div>
          </div>
        </div>
        <button @click="logout" class="btn-logout" :title="sidebarCollapsed ? '退出登录' : ''">
          <span class="nav-icon">🚪</span>
          <span v-if="!sidebarCollapsed">退出登录</span>
        </button>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 顶部栏 -->
      <header class="content-header">
        <h1>{{ currentViewTitle }}</h1>
        <div class="header-actions">
          <span class="current-time">{{ currentTime }}</span>
        </div>
      </header>

      <!-- 内容区域 -->
      <div class="content-body">
        <!-- 仪表盘 -->
        <div v-if="currentView === 'dashboard'" class="view-container">
          <DashboardView @navigate="currentView = $event" />
        </div>

        <!-- API 管理 -->
        <div v-if="currentView === 'api'" class="view-container">
          <ApiManagement />
        </div>

        <!-- 账号管理 -->
        <div v-if="currentView === 'accounts'" class="view-container">
          <AccountManagement :is-admin="isAdmin" />
        </div>

        <!-- 数据库管理 -->
        <div v-if="currentView === 'database'" class="view-container">
          <DatabaseManagement />
        </div>

        <!-- 系统设置 -->
        <div v-if="currentView === 'settings'" class="view-container">
          <SystemSettings :is-admin="isAdmin" />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { clearAuth } from '../main.js';
import DashboardView from '../components/admin/DashboardView.vue';
import ApiManagement from '../components/admin/ApiManagement.vue';
import AccountManagement from '../components/admin/AccountManagement.vue';
import SystemSettings from '../components/admin/SystemSettings.vue';
import DatabaseManagement from '../components/admin/DatabaseManagement.vue';

const router = useRouter();
const username = ref(localStorage.getItem('username') || '用户');
const isAdmin = ref(localStorage.getItem('isAdmin') === 'true');
const sidebarCollapsed = ref(false);
const currentView = ref('dashboard');
const currentTime = ref('');
const dashboardStats = ref({
  totalUsers: 0,
  enabledModels: 0,
  apiCalls: 0,
  systemStatus: 'running'
});

const menuItems = [
  { id: 'dashboard', label: '仪表盘', icon: '📊' },
  { id: 'api', label: 'API 管理', icon: '🔌' },
  { id: 'accounts', label: '账号管理', icon: '👥' },
  { id: 'database', label: '数据库', icon: '🗄️' },
  { id: 'settings', label: '系统设置', icon: '⚙️' },
];

const currentViewTitle = computed(() => {
  const item = menuItems.find(m => m.id === currentView.value);
  return item ? item.label : '';
});

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

const logout = () => {
  clearAuth();
  router.push('/login');
};

const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

let timeInterval;

onMounted(() => {
  const token = localStorage.getItem('token');
  if (!token) {
    router.push('/login');
    return;
  }

  updateTime();
  timeInterval = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval);
  }
});
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #f5f7fa;
}

/* 侧边栏 */
.sidebar {
  width: 260px;
  background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%);
  color: white;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: fixed;
  height: 100vh;
  z-index: 1000;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
}

.sidebar.collapsed {
  width: 70px;
}

.sidebar-header {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.btn-toggle-sidebar {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s ease;
}

.btn-toggle-sidebar:hover {
  background: rgba(255, 255, 255, 0.2);
}

.sidebar-nav {
  flex: 1;
  padding: 1rem 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-item.active {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border-left-color: #3498db;
}

.nav-icon {
  font-size: 1.3rem;
  margin-right: 1rem;
  min-width: 24px;
  text-align: center;
}

.collapsed .nav-icon {
  margin-right: 0;
}

.nav-label {
  font-size: 0.95rem;
  font-weight: 500;
}

.sidebar-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 600;
}

.user-details {
  flex: 1;
}

.user-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.user-role {
  font-size: 0.75rem;
  opacity: 0.7;
}

.btn-logout {
  width: 100%;
  padding: 0.75rem;
  background: rgba(231, 76, 60, 0.2);
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: white;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.btn-logout:hover {
  background: rgba(231, 76, 60, 0.3);
}

/* 主内容区 */
.main-content {
  flex: 1;
  margin-left: 260px;
  transition: margin-left 0.3s ease;
  display: flex;
  flex-direction: column;
}

.sidebar.collapsed ~ .main-content {
  margin-left: 70px;
}

.content-header {
  background: white;
  padding: 1.5rem 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.content-header h1 {
  margin: 0;
  font-size: 1.8rem;
  color: #2c3e50;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.current-time {
  color: #7f8c8d;
  font-size: 0.9rem;
  font-family: monospace;
}

.content-body {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

.view-container {
  max-width: 1400px;
  margin: 0 auto;
}

/* 响应式 */
@media (max-width: 768px) {
  .sidebar {
    width: 70px;
  }

  .sidebar-header h2,
  .nav-label,
  .user-info,
  .btn-logout span:not(.nav-icon) {
    display: none;
  }

  .main-content {
    margin-left: 70px;
  }

  .content-header {
    padding: 1rem;
  }

  .content-header h1 {
    font-size: 1.3rem;
  }

  .content-body {
    padding: 1rem;
  }
}
</style>
