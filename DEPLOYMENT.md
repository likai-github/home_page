# 部署到 Cloudflare Pages 指南

## 前置要求

1. 拥有 Cloudflare 账号（免费即可）
2. 安装 Node.js 和 npm

## 部署步骤

### 方法一：使用 Wrangler CLI（推荐）

1. **安装依赖**
   ```bash
   npm install
   ```

2. **登录 Cloudflare**
   ```bash
   npx wrangler login
   ```
   这会打开浏览器，让你授权 Wrangler 访问你的 Cloudflare 账号。

3. **设置数据库（如果需要）**
   
   如果你的网站需要数据库功能，请先设置 D1 数据库：
   ```bash
   # 创建数据库
   npx wrangler d1 create personal-website-db
   
   # 将输出的 database_id 复制到 wrangler.toml 文件中
   # 然后初始化数据库表
   npx wrangler d1 execute personal-website-db --file=./schema.sql
   ```
   
   详细步骤请查看 [DATABASE_SETUP.md](./DATABASE_SETUP.md)

4. **构建并部署**
   ```bash
   npm run deploy
   ```
   
   首次部署时，Wrangler 会提示你创建一个新的 Pages 项目。

5. **访问网站**
   部署成功后，Wrangler 会显示你的网站 URL，格式类似：
   ```
   https://personal-website-xxx.pages.dev
   ```

### 方法二：通过 Cloudflare Dashboard（Git 集成）

1. **推送代码到 Git 仓库**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <你的仓库地址>
   git push -u origin main
   ```

2. **在 Cloudflare Dashboard 创建 Pages 项目**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 进入 "Workers & Pages" 
   - 点击 "Create application" > "Pages" > "Connect to Git"
   - 选择你的 Git 仓库
   - 配置构建设置：
     - **构建命令**: `npm run build`
     - **构建输出目录**: `dist`
     - **Node 版本**: 18 或更高
   - 点击 "Save and Deploy"

3. **自动部署**
   之后每次推送到 main 分支，Cloudflare 会自动重新部署。

## 本地预览生产构建

```bash
# 构建项目
npm run build

# 使用 Cloudflare Pages 本地开发服务器预览
npm run cf:dev
```

## 自定义域名

1. 在 Cloudflare Dashboard 的 Pages 项目中
2. 进入 "Custom domains" 标签
3. 添加你的域名
4. 按照提示配置 DNS 记录

## 环境变量

如果需要环境变量：

1. 在项目根目录创建 `.dev.vars` 文件（本地开发）：
   ```
   API_KEY=your_api_key
   ```

2. 在 Cloudflare Dashboard 中设置生产环境变量：
   - Pages 项目 > Settings > Environment variables

## 性能优化

已配置的优化：
- ✅ 静态资源长期缓存（1年）
- ✅ HTML 文件短期缓存
- ✅ 代码分割（Vue 和 Vue Router 单独打包）
- ✅ SPA 路由回退支持
- ✅ 安全响应头

## 故障排查

### 路由 404 错误
确保 `public/_redirects` 文件存在，内容为：
```
/*    /index.html   200
```

### 构建失败
检查 Node.js 版本是否 >= 18：
```bash
node --version
```

### 部署后页面空白
1. 检查浏览器控制台错误
2. 确认 `dist` 目录已正确生成
3. 检查 `vite.config.js` 中的 base 路径配置

## 有用的命令

```bash
# 开发
npm run dev

# 构建
npm run build

# 本地预览构建结果
npm run preview

# 部署到 Cloudflare Pages
npm run deploy

# 使用 Cloudflare Pages 本地服务器
npm run cf:dev

# 查看部署列表
npx wrangler pages deployments list

# 查看项目信息
npx wrangler pages project list
```

## 数据库功能

本项目已集成 Cloudflare D1 数据库支持。如果你需要使用数据库功能：

1. 查看 [DATABASE_SETUP.md](./DATABASE_SETUP.md) 了解详细设置步骤
2. API 端点会自动部署为 Cloudflare Workers
3. 前端可以通过 `/api/*` 路径访问后端 API

已配置的功能：
- ✅ RESTful API（自动部署为 Workers）
- ✅ D1 SQLite 数据库
- ✅ 用户、文章、项目、评论表
- ✅ CORS 跨域支持
- ✅ 示例 Blog 页面

## 更多资源

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 数据库文档](https://developers.cloudflare.com/d1/)
- [Pages Functions 文档](https://developers.cloudflare.com/pages/platform/functions/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
- [Vue Router 部署指南](https://router.vuejs.org/guide/essentials/history-mode.html)
