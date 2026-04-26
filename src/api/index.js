  // API 客户端 - 用于 Vue 组件中调用后端 API

const API_BASE = import.meta.env.PROD 
  ? '/api'  // 生产环境使用相对路径
  : 'http://localhost:8788/api';  // 本地开发使用 Wrangler dev 服务器

class ApiClient {
  constructor(baseURL = API_BASE) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers,
        },
      });

      // 401 说明 token 失效，清除本地状态
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('isAdmin');
        // 动态导入避免循环依赖
        import('./main.js').then(({ clearAuth }) => clearAuth()).catch(() => {});
        window.location.href = '/login';
        throw new Error('登录已过期，请重新登录');
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // 用户认证
  async register(data) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // API 平台管理
  async getPlatforms() {
    return this.request('/platforms');
  }

  async createPlatform(data) {
    return this.request('/platforms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPlatform(id) {
    return this.request(`/platforms/${id}`);
  }

  async updatePlatform(id, data) {
    return this.request(`/platforms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePlatform(id) {
    return this.request(`/platforms/${id}`, {
      method: 'DELETE',
    });
  }

  async getPlatformModels(platformId) {
    return this.request(`/platforms/${platformId}/models`);
  }

  async syncPlatformModels(platformId) {
    return this.request(`/platforms/${platformId}/sync-models`, {
      method: 'POST',
    });
  }

  async testPlatform(platformId) {
    return this.request(`/platforms/${platformId}/test`, {
      method: 'POST',
    });
  }

  async updateModel(platformId, modelId, data) {
    return this.request(`/platforms/${platformId}/models/${encodeURIComponent(modelId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // 用户相关
  async getUsers() {
    return this.request('/users');
  }

  async getUser(id) {
    return this.request(`/users/${id}`);
  }

  async createUser(data) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 文章相关
  async getPosts() {
    return this.request('/posts');
  }

  async getPost(id) {
    return this.request(`/posts/${id}`);
  }

  async createPost(data) {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // 项目相关
  async getProjects() {
    return this.request('/projects');
  }

  // 系统设置
  async getSystemSettings() {
    return this.request('/settings');
  }

  async saveSystemSettings(settings) {
    return this.request('/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  // 数据库管理
  async getDatabaseStatus() {
    return this.request('/database/status');
  }

  async getDatabaseTables() {
    return this.request('/database/tables');
  }

  async getTableColumns(tableName) {
    return this.request(`/database/tables/${tableName}/columns`);
  }

  async getTableSampleData(tableName) {
    return this.request(`/database/tables/${tableName}/data`);
  }

  async getMigrationHistory() {
    return this.request('/database/migrations');
  }

  async runMigration() {
    return this.request('/database/migrate', {
      method: 'POST',
    });
  }

  async resetDatabase() {
    return this.request('/database/reset', {
      method: 'POST',
    });
  }

  // AI 对话
  async sendChat(platformId, modelId, messages) {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify({ platform_id: platformId, model_id: modelId, messages }),
    });
  }
}

export const api = new ApiClient();
export default api;
