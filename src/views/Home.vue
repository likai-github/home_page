<template>
  <div class="home">
    <!-- 英雄区域 -->
    <section class="hero">
      <div class="hero-content">
        <div class="hero-text">
          <h1 class="hero-title">
            <span class="greeting">Hello, I'm</span>
            <span class="name">Your Name</span>
          </h1>
          <p class="hero-subtitle">创造者 · 开发者 · 设计师</p>
          <p class="hero-description">
            欢迎来到我的个人空间，这里记录着我的创作、思考与成长
          </p>
          <div class="hero-buttons">
            <button class="btn btn-primary">了解更多</button>
            <button class="btn btn-secondary">查看作品</button>
          </div>
        </div>
        <div class="hero-visual">
          <div class="visual-circle circle-1"></div>
          <div class="visual-circle circle-2"></div>
          <div class="visual-circle circle-3"></div>
        </div>
      </div>
      <div class="scroll-indicator">
        <span>向下滚动</span>
        <div class="scroll-arrow">↓</div>
      </div>
    </section>

    <!-- 特色区域 -->
    <section class="features">
      <div class="container">
        <div class="feature-grid">
          <div class="feature-card" v-for="(feature, index) in features" :key="index">
            <div class="feature-icon">{{ feature.icon }}</div>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 统计区域 -->
    <section class="stats">
      <div class="container">
        <div class="stats-grid">
          <div class="stat-item" v-for="(stat, index) in stats" :key="index">
            <div class="stat-number">{{ stat.number }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const features = ref([
  {
    icon: '🎨',
    title: '创意设计',
    description: '追求极致的用户体验与视觉美感'
  },
  {
    icon: '💻',
    title: '技术开发',
    description: '用代码实现想法，创造价值'
  },
  {
    icon: '📱',
    title: '产品思维',
    description: '从用户需求出发，打磨每个细节'
  },
  {
    icon: '🚀',
    title: '持续学习',
    description: '保持好奇心，探索未知领域'
  }
])

const stats = ref([
  { number: '50+', label: '完成项目' },
  { number: '3+', label: '工作年限' },
  { number: '100+', label: '代码提交' },
  { number: '10+', label: '技术栈' }
])
</script>

<style scoped>
.home {
  width: 100%;
}

/* 英雄区域 */
.hero {
  position: relative;
  min-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  overflow: hidden;
}

.hero-content {
  max-width: 1400px;
  width: 100%;
  padding: 0 3rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4rem;
  z-index: 1;
}

.hero-text {
  flex: 1;
  max-width: 600px;
}

.hero-title {
  font-size: 4rem;
  font-weight: 800;
  margin: 0 0 1rem 0;
  line-height: 1.2;
}

.greeting {
  display: block;
  font-size: 2rem;
  font-weight: 400;
  opacity: 0.9;
  margin-bottom: 0.5rem;
}

.name {
  display: block;
  background: linear-gradient(135deg, #fff 0%, #f0f0f0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.5rem;
  margin: 1rem 0;
  opacity: 0.95;
  font-weight: 300;
  letter-spacing: 2px;
}

.hero-description {
  font-size: 1.1rem;
  line-height: 1.8;
  opacity: 0.9;
  margin: 2rem 0;
}

.hero-buttons {
  display: flex;
  gap: 1.5rem;
  margin-top: 3rem;
}

.btn {
  padding: 1rem 2.5rem;
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  letter-spacing: 1px;
}

.btn-primary {
  background: white;
  color: #667eea;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.btn-secondary {
  background: transparent;
  color: white;
  border: 2px solid white;
}

.btn-secondary:hover {
  background: white;
  color: #667eea;
  transform: translateY(-2px);
}

/* 视觉元素 */
.hero-visual {
  position: relative;
  width: 400px;
  height: 400px;
  flex-shrink: 0;
}

.visual-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  animation: float 6s ease-in-out infinite;
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: 50px;
  left: 50px;
  animation-delay: 0s;
}

.circle-2 {
  width: 200px;
  height: 200px;
  top: 100px;
  left: 150px;
  animation-delay: 1s;
}

.circle-3 {
  width: 150px;
  height: 150px;
  top: 50px;
  left: 100px;
  animation-delay: 2s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-20px) scale(1.05);
  }
}

.scroll-indicator {
  position: absolute;
  bottom: 3rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: white;
  opacity: 0.8;
  animation: bounce 2s infinite;
}

.scroll-arrow {
  font-size: 1.5rem;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(10px);
  }
}

/* 特色区域 */
.features {
  padding: 6rem 0;
  background: #f8f9fa;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 3rem;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: white;
  padding: 3rem 2rem;
  border-radius: 20px;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.05);
}

.feature-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1.5rem;
}

.feature-card h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
  color: #333;
}

.feature-card p {
  color: #666;
  line-height: 1.6;
}

/* 统计区域 */
.stats {
  padding: 6rem 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 3rem;
  text-align: center;
}

.stat-number {
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
}

.stat-label {
  font-size: 1.1rem;
  opacity: 0.9;
  letter-spacing: 1px;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .hero-content {
    flex-direction: column;
    text-align: center;
  }

  .hero-text {
    max-width: 100%;
  }

  .hero-buttons {
    justify-content: center;
  }

  .hero-visual {
    width: 300px;
    height: 300px;
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2.5rem;
  }

  .greeting {
    font-size: 1.5rem;
  }

  .hero-subtitle {
    font-size: 1.2rem;
  }

  .hero-buttons {
    flex-direction: column;
    gap: 1rem;
  }

  .btn {
    width: 100%;
  }

  .hero-visual {
    display: none;
  }

  .container {
    padding: 0 1.5rem;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }

  .stat-number {
    font-size: 2.5rem;
  }
}
</style>
