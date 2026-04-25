<template>
  <div id="app">
    <header class="header">
      <nav class="nav-container">
        <div class="logo">
          <h1>gaoying的网站</h1>
        </div>
        <ul class="nav-menu">
          <li v-for="item in menuItems" :key="item.path" 
              :class="{ active: currentRoute === item.path }">
            <router-link :to="item.path">{{ item.name }}</router-link>
          </li>
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
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const menuItems = ref([
  { name: '首页', path: '/' },
  { name: '关于', path: '/about' },
  { name: '项目', path: '/projects' },
  { name: '博客', path: '/blog' },
  { name: '联系', path: '/contact' }
])

const currentRoute = computed(() => route.path)
</script>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.05);
  z-index: 1000;
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem 3rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo h1 {
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  letter-spacing: 2px;
}

.nav-menu {
  display: flex;
  gap: 3rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-menu li {
  position: relative;
}

.nav-menu a {
  color: #333;
  text-decoration: none;
  font-size: 1rem;
  font-weight: 500;
  transition: color 0.3s ease;
  padding: 0.5rem 0;
}

.nav-menu a:hover {
  color: #667eea;
}

.nav-menu li.active a {
  color: #667eea;
}

.nav-menu li.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
}

.main-content {
  margin-top: 80px;
  min-height: calc(100vh - 160px);
}

.footer {
  background: #1a1a1a;
  color: #fff;
  text-align: center;
  padding: 2rem;
  margin-top: 4rem;
}

.footer p {
  margin: 0;
  opacity: 0.8;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .nav-container {
    flex-direction: column;
    gap: 1.5rem;
    padding: 1rem 1.5rem;
  }

  .nav-menu {
    gap: 1.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .main-content {
    margin-top: 140px;
  }
}
</style>
