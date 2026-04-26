<template>
  <div id="app">
    <header class="header">
      <nav class="nav-container">
        <div class="logo">
          <router-link to="/">gaoying的网站</router-link>
        </div>
        <ul class="nav-menu">
          <li :class="{ active: currentRoute === '/' }">
            <router-link to="/">首页</router-link>
          </li>
          <li :class="{ active: currentRoute === '/chat' }">
            <router-link to="/chat">AI 对话</router-link>
          </li>
          <li :class="{ active: currentRoute === '/blog' }">
            <router-link to="/blog">博客</router-link>
          </li>

          <!-- 未登录：显示登录 -->
          <li v-if="!auth.token" :class="{ active: currentRoute === '/login' }">
            <router-link to="/login">登录</router-link>
          </li>

          <!-- 已登录：显示后台 + 退出 -->
          <template v-else>
            <li v-if="auth.isAdmin" :class="{ active: currentRoute.startsWith('/admin') }">
              <router-link to="/admin">管理后台</router-link>
            </li>
            <li>
              <button class="btn-logout-nav" @click="handleLogout">
                退出 ({{ auth.username }})
              </button>
            </li>
          </template>
        </ul>
      </nav>
    </header>

    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="footer">
      <p>&copy; 2026 个人网站. All rights reserved.</p>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authState, clearAuth } from './main.js'

const route  = useRoute()
const router = useRouter()

const auth = authState
const currentRoute = computed(() => route.path)

const handleLogout = () => {
  clearAuth()
  router.push('/login')
}
</script>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo a {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1e293b;
  text-decoration: none;
}

.nav-menu {
  list-style: none;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin: 0;
  padding: 0;
}

.nav-menu li a,
.btn-logout-nav {
  display: block;
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #475569;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
}

.nav-menu li a:hover,
.btn-logout-nav:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.nav-menu li.active a {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 600;
}

.btn-logout-nav {
  color: #ef4444;
}
.btn-logout-nav:hover {
  background: #fef2f2;
  color: #dc2626;
}

.main-content {
  padding-top: 64px;
  min-height: 100vh;
}

.footer {
  text-align: center;
  padding: 1.5rem;
  color: #94a3b8;
  font-size: 0.85rem;
  border-top: 1px solid #f1f5f9;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .nav-container { padding: 0 1rem; }
  .nav-menu { gap: 0; }
  .nav-menu li a,
  .btn-logout-nav { padding: 0.4rem 0.6rem; font-size: 0.82rem; }
}
</style>
