<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-card">
        <h1 class="login-title">{{ isRegister ? '注册账号' : '登录' }}</h1>
        <p class="login-subtitle">{{ isRegister ? '创建新账号' : '欢迎回来' }}</p>

        <form @submit.prevent="handleSubmit" class="login-form">
          <div class="form-group">
            <label>用户名</label>
            <input 
              v-model="form.username" 
              type="text" 
              placeholder="请输入用户名"
              required
            />
          </div>

          <div class="form-group">
            <label>密码</label>
            <input 
              v-model="form.password" 
              type="password" 
              placeholder="请输入密码"
              required
            />
          </div>

          <div v-if="isRegister" class="form-group">
            <label>确认密码</label>
            <input 
              v-model="form.confirmPassword" 
              type="password" 
              placeholder="请再次输入密码"
              required
            />
          </div>

          <div v-if="error" class="error-message">{{ error }}</div>
          <div v-if="success" class="success-message">{{ success }}</div>

          <button type="submit" class="btn-submit" :disabled="loading">
            {{ loading ? '处理中...' : (isRegister ? '注册' : '登录') }}
          </button>
        </form>

        <div class="login-footer">
          <button @click="toggleMode" class="btn-toggle">
            {{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';

const router = useRouter();
const isRegister = ref(false);
const loading = ref(false);
const error = ref('');
const success = ref('');

const form = ref({
  username: '',
  password: '',
  confirmPassword: ''
});

const toggleMode = () => {
  isRegister.value = !isRegister.value;
  error.value = '';
  success.value = '';
  form.value = {
    username: '',
    password: '',
    confirmPassword: ''
  };
};

const handleSubmit = async () => {
  error.value = '';
  success.value = '';

  if (isRegister.value && form.value.password !== form.value.confirmPassword) {
    error.value = '两次密码输入不一致';
    return;
  }

  loading.value = true;

  try {
    if (isRegister.value) {
      await api.register({
        username: form.value.username,
        password: form.value.password
      });
      success.value = '注册成功！正在跳转...';
      setTimeout(() => {
        isRegister.value = false;
        form.value = { username: '', password: '', confirmPassword: '' };
        success.value = '';
      }, 1500);
    } else {
      const data = await api.login({
        username: form.value.username,
        password: form.value.password
      });
      
      // 保存 token
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', form.value.username);
      
      success.value = '登录成功！';
      setTimeout(() => {
        router.push('/admin');
      }, 1000);
    }
  } catch (err) {
    error.value = err.message || '操作失败，请重试';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.login-container {
  width: 100%;
  max-width: 450px;
}

.login-card {
  background: white;
  border-radius: 20px;
  padding: 3rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-title {
  font-size: 2rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.5rem;
  text-align: center;
}

.login-subtitle {
  color: #666;
  text-align: center;
  margin-bottom: 2rem;
}

.login-form {
  margin-bottom: 1.5rem;
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

.form-group input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.error-message {
  padding: 0.875rem;
  background: #fee;
  color: #c33;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.success-message {
  padding: 0.875rem;
  background: #efe;
  color: #3c3;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.btn-submit {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-footer {
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.btn-toggle {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  font-size: 0.95rem;
  transition: color 0.3s ease;
}

.btn-toggle:hover {
  color: #764ba2;
  text-decoration: underline;
}

@media (max-width: 768px) {
  .login-card {
    padding: 2rem;
  }

  .login-title {
    font-size: 1.5rem;
  }
}
</style>
