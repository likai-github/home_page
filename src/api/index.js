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

      if (!response.ok) {
        const error = await response.json();
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

  // NVIDIA API 管理
  async saveNvidiaApiKey(apiKey) {
    return this.request('/nvidia/api-key', {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    });
  }

  async getNvidiaApiKey() {
    return this.request('/nvidia/api-key');
  }

  async getNvidiaModels(apiKey) {
    return this.request('/nvidia/models', {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    });
  }

  async toggleNvidiaModel(modelId, enabled) {
    return this.request('/nvidia/models/toggle', {
      method: 'POST',
      body: JSON.stringify({ modelId, enabled }),
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
}

export const api = new ApiClient();
export default api;
