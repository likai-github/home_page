# 🔌 API 平台管理系统使用指南

## 概述

新的 API 管理系统支持多个 AI 平台的统一管理，包括：
- ✅ NVIDIA API
- ✅ OpenAI API
- ✅ Anthropic API
- ✅ Google AI API
- ✅ 自定义 API 平台

每个平台可以独立配置 API Key、Base URL，并管理各自的模型列表。

---

## 📊 数据库表结构

### 1. api_platforms - API 平台表

存储所有 API 平台的配置信息。

```sql
CREATE TABLE api_platforms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- 平台标识 (nvidia, openai, etc.)
  display_name TEXT NOT NULL,            -- 显示名称
  api_key TEXT,                          -- API 密钥
  base_url TEXT,                         -- API 基础 URL
  description TEXT,                      -- 平台描述
  status TEXT DEFAULT 'active',          -- 状态 (active/inactive)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2. api_models - API 模型表

存储每个平台的模型配置。

```sql
CREATE TABLE api_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_id INTEGER NOT NULL,          -- 关联的平台 ID
  model_id TEXT NOT NULL,                -- 模型标识
  model_name TEXT NOT NULL,              -- 模型名称
  description TEXT,                      -- 模型描述
  enabled BOOLEAN DEFAULT 0,             -- 是否启用
  metadata TEXT,                         -- 元数据 (JSON)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform_id, model_id)
);
```

---

## 🚀 使用流程

### 步骤 1：添加 API 平台

1. 进入管理后台 → API 管理
2. 点击"➕ 添加平台"
3. 填写平台信息：
   - **平台类型**: 选择 NVIDIA、OpenAI 等
   - **显示名称**: 自定义显示名称
   - **API Key**: 输入你的 API 密钥
   - **Base URL**: (可选) 自定义 API 地址
   - **描述**: (可选) 平台说明
   - **状态**: 启用/禁用
4. 点击"保存"

### 步骤 2：同步模型列表

1. 在平台卡片上点击"📋"图标
2. 点击"🔄 同步模型"按钮
3. 系统会自动从 API 获取所有可用模型
4. 同步完成后显示模型数量统计

### 步骤 3：启用/禁用模型

1. 在模型列表中找到需要的模型
2. 使用右侧的开关切换模型状态
3. 已启用的模型会显示绿色背景

### 步骤 4：管理平台

- **查看模型**: 点击"📋"图标
- **编辑平台**: 点击"✏️"图标
- **删除平台**: 点击"🗑️"图标（会同时删除所有模型配置）

---

## 📡 API 端点

### 平台管理

#### 获取所有平台
```http
GET /api/platforms
```

**响应示例：**
```json
{
  "platforms": [
    {
      "id": 1,
      "name": "nvidia",
      "display_name": "NVIDIA API",
      "api_key": "nvapi-xxx",
      "base_url": null,
      "description": "NVIDIA AI 模型平台",
      "status": "active",
      "model_count": 25,
      "enabled_model_count": 5,
      "created_at": "2026-04-26 10:00:00",
      "updated_at": "2026-04-26 10:00:00"
    }
  ]
}
```

#### 创建平台
```http
POST /api/platforms
Content-Type: application/json

{
  "name": "nvidia",
  "display_name": "NVIDIA API",
  "api_key": "nvapi-xxx",
  "base_url": "https://integrate.api.nvidia.com/v1",
  "description": "NVIDIA AI 模型平台",
  "status": "active"
}
```

#### 获取单个平台
```http
GET /api/platforms/:id
```

#### 更新平台
```http
PUT /api/platforms/:id
Content-Type: application/json

{
  "display_name": "NVIDIA API (Updated)",
  "api_key": "nvapi-new-key",
  "base_url": "https://integrate.api.nvidia.com/v1",
  "description": "更新后的描述",
  "status": "active"
}
```

#### 删除平台
```http
DELETE /api/platforms/:id
```

### 模型管理

#### 获取平台的模型列表
```http
GET /api/platforms/:platformId/models
```

**响应示例：**
```json
{
  "models": [
    {
      "id": 1,
      "platform_id": 1,
      "model_id": "meta/llama-3.1-8b-instruct",
      "model_name": "meta/llama-3.1-8b-instruct",
      "description": "Llama 3.1 8B Instruct",
      "enabled": true,
      "metadata": "{\"owned_by\":\"meta\",\"created\":1234567890}",
      "created_at": "2026-04-26 10:00:00",
      "updated_at": "2026-04-26 10:00:00"
    }
  ]
}
```

#### 同步平台模型
```http
POST /api/platforms/:platformId/sync-models
```

**响应示例：**
```json
{
  "message": "Models synced successfully",
  "total": 25,
  "added": 20,
  "updated": 5
}
```

#### 更新模型状态
```http
PUT /api/platforms/:platformId/models/:modelId
Content-Type: application/json

{
  "enabled": true
}
```

---

## 🔧 支持的平台

### 1. NVIDIA API

**配置：**
- **name**: `nvidia`
- **base_url**: `https://integrate.api.nvidia.com/v1`
- **API Key**: 从 [NVIDIA AI](https://build.nvidia.com/) 获取

**模型示例：**
- `meta/llama-3.1-8b-instruct`
- `nvidia/nemotron-4-340b-instruct`
- `mistralai/mixtral-8x7b-instruct-v0.1`

### 2. OpenAI API

**配置：**
- **name**: `openai`
- **base_url**: `https://api.openai.com/v1`
- **API Key**: 从 [OpenAI Platform](https://platform.openai.com/) 获取

**模型示例：**
- `gpt-4`
- `gpt-3.5-turbo`
- `text-embedding-ada-002`

### 3. Anthropic API

**配置：**
- **name**: `anthropic`
- **base_url**: `https://api.anthropic.com/v1`
- **API Key**: 从 [Anthropic Console](https://console.anthropic.com/) 获取

**模型示例：**
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

### 4. Google AI API

**配置：**
- **name**: `google`
- **base_url**: `https://generativelanguage.googleapis.com/v1`
- **API Key**: 从 [Google AI Studio](https://makersuite.google.com/) 获取

**模型示例：**
- `gemini-pro`
- `gemini-pro-vision`

### 5. 自定义平台

**配置：**
- **name**: `custom`
- **base_url**: 你的 API 地址
- **API Key**: 你的密钥

---

## 💡 使用场景

### 场景 1：多平台模型对比

你可以同时配置多个 AI 平台，对比不同模型的效果：

1. 添加 NVIDIA、OpenAI、Anthropic 平台
2. 同步各平台的模型列表
3. 启用需要测试的模型
4. 在应用中调用不同平台的模型

### 场景 2：成本优化

根据不同任务选择最合适的模型：

- 简单任务：使用小模型（如 Llama 3.1 8B）
- 复杂任务：使用大模型（如 GPT-4）
- 批量处理：使用性价比高的模型

### 场景 3：备用方案

配置多个平台作为备用：

1. 主平台：NVIDIA API
2. 备用平台：OpenAI API
3. 当主平台不可用时自动切换

---

## 🔐 安全建议

### 1. API Key 保护

- ✅ API Key 存储在数据库中
- ✅ 前端显示时默认隐藏
- ⚠️ 建议在生产环境中加密存储

### 2. 访问控制

- ✅ 只有管理员可以访问 API 管理页面
- ✅ 使用 RBAC 系统控制权限
- ✅ 需要 `api.manage` 权限才能修改配置

### 3. 速率限制

建议在应用层实现速率限制：

```javascript
// 示例：限制每个平台的调用频率
const rateLimits = {
  nvidia: 60,   // 每分钟 60 次
  openai: 100,  // 每分钟 100 次
  anthropic: 50 // 每分钟 50 次
};
```

---

## 📊 统计信息

平台卡片显示以下统计：

- **总模型数**: 该平台的所有模型数量
- **已启用数**: 当前启用的模型数量
- **状态**: 平台是否启用

---

## 🐛 故障排除

### 问题 1：同步模型失败

**可能原因：**
- API Key 无效或过期
- 网络连接问题
- API 服务不可用

**解决方法：**
1. 检查 API Key 是否正确
2. 测试网络连接
3. 查看 Cloudflare Pages 日志

### 问题 2：模型列表为空

**可能原因：**
- 未执行同步操作
- API 返回空列表
- 数据库查询失败

**解决方法：**
1. 点击"同步模型"按钮
2. 检查 API Key 权限
3. 查看浏览器控制台错误

### 问题 3：无法切换模型状态

**可能原因：**
- 权限不足
- 网络请求失败
- 数据库更新失败

**解决方法：**
1. 确认有 `api.manage` 权限
2. 检查网络连接
3. 查看服务器日志

---

## 🔄 迁移说明

### 从旧版本迁移

如果你之前使用的是单一的 NVIDIA API 配置，需要：

1. **重置数据库**（会删除旧配置）：
   ```
   访问：/api/reset-db?confirm=yes
   ```

2. **执行迁移**：
   ```
   访问：/api/migrate
   ```

3. **重新添加平台**：
   - 在 API 管理页面添加 NVIDIA 平台
   - 输入之前的 API Key
   - 同步模型列表

---

## 📚 相关文档

- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - 数据库设置
- [DATABASE_RBAC.md](./DATABASE_RBAC.md) - 权限系统
- [TABLE_STRUCTURE.md](./TABLE_STRUCTURE.md) - 表结构
- [API_TEST.md](./API_TEST.md) - API 测试

---

## 🚀 未来计划

- [ ] 支持更多 AI 平台（Cohere、Hugging Face 等）
- [ ] 模型使用统计和分析
- [ ] 自动故障转移
- [ ] 成本追踪
- [ ] 模型性能对比
- [ ] Webhook 通知

---

**最后更新：** 2026-04-26  
**版本：** 2.0
