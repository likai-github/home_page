# 个人网站

基于 Vue 3 + Vite 构建的现代化个人网站

## 功能特点

- ✨ 大气简洁的首页设计
- 🎨 渐变色主题，视觉效果出色
- 📱 完全响应式设计，适配各种设备
- 🚀 预留导航菜单和路由结构，方便扩展
- 💫 流畅的页面过渡动画
- 🗄️ 集成 Cloudflare D1 数据库支持
- 🔌 RESTful API（自动部署为 Workers）
- 📝 示例博客页面（连接数据库）

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看网站

### 构建生产版本

```bash
npm run build
```

## 项目结构

```
├── src/
│   ├── views/          # 页面组件
│   │   └── Home.vue    # 首页
│   ├── App.vue         # 根组件（包含导航栏）
│   ├── main.js         # 入口文件
│   └── style.css       # 全局样式
├── index.html          # HTML 模板
├── vite.config.js      # Vite 配置
└── package.json        # 项目配置

```

## 后续扩展

### 添加新页面

1. 在 `src/views/` 目录下创建新的 Vue 组件
2. 在 `src/main.js` 中添加路由配置
3. 导航菜单会自动显示（已在 App.vue 中配置）

示例：

```javascript
// src/main.js
const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/about', name: 'About', component: () => import('./views/About.vue') },
  // 添加更多路由...
]
```

### 自定义内容

- 修改 `Home.vue` 中的文字内容
- 调整 `App.vue` 中的导航菜单项
- 在 `style.css` 中自定义全局样式
- 修改渐变色主题（在各组件的 style 部分）

## 技术栈

- Vue 3 - 渐进式 JavaScript 框架
- Vue Router - 官方路由管理器
- Vite - 下一代前端构建工具

## 自定义建议

1. **个人信息**：修改 Home.vue 中的 "Your Name" 和描述文字
2. **配色方案**：调整渐变色（当前使用紫色系）
3. **统计数据**：更新 stats 数组中的数字
4. **特色卡片**：修改 features 数组的内容
5. **Logo**：替换 App.vue 中的 "MY SITE" 文字

## 部署

本项目已配置好 Cloudflare Pages 部署。详细部署步骤请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

快速部署：
```bash
npm install
npx wrangler login
npm run deploy
```

祝你使用愉快！🎉
