import { createApp, reactive } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import './style.css'

// 全局响应式认证状态，供 App.vue 等组件共享
export const authState = reactive({
  token: localStorage.getItem('token') || '',
  username: localStorage.getItem('username') || '',
  isAdmin: localStorage.getItem('isAdmin') === 'true',
})

export function setAuth({ token, username, isAdmin }) {
  authState.token = token
  authState.username = username
  authState.isAdmin = isAdmin
  localStorage.setItem('token', token)
  localStorage.setItem('username', username)
  localStorage.setItem('isAdmin', String(isAdmin))
}

export function clearAuth() {
  authState.token = ''
  authState.username = ''
  authState.isAdmin = false
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  localStorage.removeItem('isAdmin')
}

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/chat', name: 'Chat', component: () => import('./views/Chat.vue') },
  { path: '/blog', name: 'Blog', component: () => import('./views/Blog.vue') },
  { path: '/login', name: 'Login', component: () => import('./views/Login.vue') },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('./views/Admin.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：有 requiresAuth 的页面必须有 token，否则跳登录
router.beforeEach((to, _from, next) => {
  if (to.meta.requiresAuth) {
    if (!authState.token) {
      next({ path: '/login', query: { redirect: to.fullPath } })
    } else {
      next()
    }
  } else {
    // 已登录时访问 /login，直接跳到后台或首页
    if (to.path === '/login' && authState.token) {
      next(authState.isAdmin ? '/admin' : '/')
    } else {
      next()
    }
  }
})

const app = createApp(App)
app.use(router)
app.mount('#app')
