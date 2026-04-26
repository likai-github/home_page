import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import './style.css'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('./views/Chat.vue')
  },
  {
    path: '/blog',
    name: 'Blog',
    component: () => import('./views/Blog.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('./views/Login.vue')
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('./views/Admin.vue'),
    meta: { requiresAuth: true }
  }
  // 后续可以在这里添加更多路由
  // { path: '/about', name: 'About', component: () => import('./views/About.vue') },
  // { path: '/projects', name: 'Projects', component: () => import('./views/Projects.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫 - 检查登录状态
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('token');
    if (!token) {
      next('/login');
    } else {
      next();
    }
  } else {
    next();
  }
})

const app = createApp(App)
app.use(router)
app.mount('#app')
