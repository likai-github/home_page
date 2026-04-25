# Cloudflare D1 数据库设置指南

## 什么是 D1？

Cloudflare D1 是 Cloudflare 提供的 SQLite 数据库服务，运行在边缘网络上，具有以下特点：
- ✅ 免费额度：每天 500 万次读取，10 万次写入
- ✅ 低延迟：数据库运行在边缘节点
- ✅ 自动备份和复制
- ✅ 标准 SQL 语法

## 设置步骤

### 1. 创建 D1 数据库

```bash
# 创建数据库
npx wrangler d1 create personal-website-db
```

执行后会输出类似信息：
```
✅ Successfully created DB 'personal-website-db'

[[d1_databases]]
binding = "DB"
database_name = "personal-website-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2. 更新 wrangler.toml

将上面输出的 `database_id` 复制到 `wrangler.toml` 文件中：

```toml
[[d1_databases]]
binding = "DB"
database_name = "personal-website-db"
database_id = "你的数据库ID"  # 替换这里
```

### 3. 初始化数据库表

```bash
# 执行 SQL 脚本创建表和示例数据
npx wrangler d1 execute personal-website-db --file=./schema.sql
```

### 4. 验证数据库

```bash
# 查询用户表
npx wrangler d1 execute personal-website-db --command="SELECT * FROM users"

# 查询文章表
npx wrangler d1 execute personal-website-db --command="SELECT * FROM posts"
```

## 本地开发

### 方式一：使用本地 D1 数据库

```bash
# 创建本地数据库
npx wrangler d1 execute personal-website-db --local --file=./schema.sql

# 启动本地开发服务器（包含 API）
npx wrangler pages dev dist --d1=DB=personal-website-db

# 在另一个终端启动 Vue 开发服务器
npm run dev
```

### 方式二：使用远程数据库（推荐）

```bash
# 直接使用生产数据库进行开发
npm run dev

# API 会自动连接到 Cloudflare 的数据库
```

## 常用数据库命令

### 查询数据
```bash
# 查看所有表
npx wrangler d1 execute personal-website-db --command="SELECT name FROM sqlite_master WHERE type='table'"

# 查询特定表
npx wrangler d1 execute personal-website-db --command="SELECT * FROM posts LIMIT 10"
```

### 插入数据
```bash
# 添加新用户
npx wrangler d1 execute personal-website-db --command="INSERT INTO users (name, email) VALUES ('王五', 'wangwu@example.com')"

# 添加新文章
npx wrangler d1 execute personal-website-db --command="INSERT INTO posts (title, content, author_id, published) VALUES ('新文章', '内容...', 1, 1)"
```

### 更新数据
```bash
# 更新文章
npx wrangler d1 execute personal-website-db --command="UPDATE posts SET views = views + 1 WHERE id = 1"
```

### 删除数据
```bash
# 删除文章
npx wrangler d1 execute personal-website-db --command="DELETE FROM posts WHERE id = 3"
```

### 备份数据库
```bash
# 导出所有数据
npx wrangler d1 export personal-website-db --output=backup.sql
```

## API 使用示例

### 在 Vue 组件中使用

```vue
<script setup>
import { ref, onMounted } from 'vue';
import api from '../api';

const posts = ref([]);

onMounted(async () => {
  try {
    const data = await api.getPosts();
    posts.value = data.posts;
  } catch (error) {
    console.error('获取文章失败:', error);
  }
});
</script>
```

### API 端点

已配置的 API 端点：

**用户相关**
- `GET /api/users` - 获取所有用户
- `GET /api/users/:id` - 获取单个用户
- `POST /api/users` - 创建用户

**文章相关**
- `GET /api/posts` - 获取所有文章
- `GET /api/posts/:id` - 获取单个文章
- `POST /api/posts` - 创建文章

### 测试 API

```bash
# 获取所有文章
curl https://your-site.pages.dev/api/posts

# 创建新文章
curl -X POST https://your-site.pages.dev/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"测试文章","content":"这是测试内容","author_id":1}'
```

## 数据库架构

### users 表
- `id` - 主键
- `name` - 用户名
- `email` - 邮箱（唯一）
- `avatar` - 头像 URL
- `bio` - 个人简介
- `created_at` - 创建时间
- `updated_at` - 更新时间

### posts 表
- `id` - 主键
- `title` - 标题
- `content` - 内容
- `author_id` - 作者 ID（外键）
- `published` - 是否发布
- `views` - 浏览次数
- `created_at` - 创建时间
- `updated_at` - 更新时间

### projects 表
- `id` - 主键
- `name` - 项目名称
- `description` - 描述
- `url` - 项目链接
- `github_url` - GitHub 链接
- `image_url` - 项目图片
- `tags` - 标签（JSON）
- `featured` - 是否精选
- `created_at` - 创建时间
- `updated_at` - 更新时间

### comments 表
- `id` - 主键
- `post_id` - 文章 ID（外键）
- `author_name` - 评论者名称
- `author_email` - 评论者邮箱
- `content` - 评论内容
- `created_at` - 创建时间

## 扩展 API

要添加新的 API 端点，编辑 `functions/api/[[path]].js`：

```javascript
// 添加新的路由处理
if (path.startsWith('projects')) {
  return handleProjects(request, env, corsHeaders);
}

// 实现处理函数
async function handleProjects(request, env, corsHeaders) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM projects WHERE featured = 1'
  ).all();
  
  return jsonResponse({ projects: results }, 200, corsHeaders);
}
```

## 性能优化

### 使用索引
```sql
CREATE INDEX idx_posts_published ON posts(published, created_at DESC);
```

### 分页查询
```javascript
const page = 1;
const limit = 10;
const offset = (page - 1) * limit;

const { results } = await env.DB.prepare(
  'SELECT * FROM posts LIMIT ? OFFSET ?'
).bind(limit, offset).all();
```

### 缓存策略
```javascript
// 在 API 响应中添加缓存头
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300', // 缓存 5 分钟
  },
});
```

## 故障排查

### 数据库连接失败
- 检查 `wrangler.toml` 中的 `database_id` 是否正确
- 确认数据库已创建：`npx wrangler d1 list`

### API 返回 500 错误
- 查看 Cloudflare Dashboard 的日志
- 本地测试：`npx wrangler pages dev dist --d1=DB=personal-website-db`

### 本地开发无法连接数据库
- 使用 `--local` 标志创建本地数据库
- 或直接连接远程数据库（推荐）

## 安全建议

1. **不要在前端暴露敏感数据**
   - 密码、API 密钥等应该只在后端处理

2. **输入验证**
   - 始终验证用户输入
   - 使用参数化查询防止 SQL 注入

3. **访问控制**
   - 实现身份验证和授权
   - 限制 API 访问频率

4. **CORS 配置**
   - 生产环境应该限制允许的源
   - 不要使用 `Access-Control-Allow-Origin: *`

## 更多资源

- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Pages Functions 文档](https://developers.cloudflare.com/pages/platform/functions/)
- [SQLite 语法参考](https://www.sqlite.org/lang.html)
