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
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
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
}

export const api = new ApiClient();
export default api;
