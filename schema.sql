-- Cloudflare D1 数据库初始化脚本
-- 使用命令创建表: npx wrangler d1 execute DB --file=./schema.sql

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT,
  bio TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 文章/博客表
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id INTEGER,
  published BOOLEAN DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- 项目表
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  github_url TEXT,
  image_url TEXT,
  tags TEXT, -- JSON 格式存储标签
  featured BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 留言/评论表
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER,
  author_name TEXT NOT NULL,
  author_email TEXT,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

-- 插入示例数据
INSERT INTO users (name, email, bio) VALUES 
  ('张三', 'zhangsan@example.com', '全栈开发工程师，热爱编程和开源'),
  ('李四', 'lisi@example.com', '前端开发者');

INSERT INTO posts (title, content, author_id, published) VALUES 
  ('欢迎来到我的博客', '这是我的第一篇博客文章，很高兴与大家分享我的技术心得。', 1, 1),
  ('Vue 3 最佳实践', 'Vue 3 带来了许多新特性，让我们一起探索 Composition API 的强大之处...', 1, 1);

INSERT INTO projects (name, description, url, tags, featured) VALUES 
  ('个人网站', '基于 Vue 3 和 Cloudflare Pages 构建的现代化个人网站', 'https://example.com', '["Vue", "Cloudflare", "D1"]', 1),
  ('开源项目', '一个有趣的开源项目', 'https://github.com/example', '["JavaScript", "Open Source"]', 0);
