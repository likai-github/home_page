<template>
  <div class="chat-container">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <button @click="newChat" class="btn-new-chat">
          <span class="icon">✨</span>
          <span v-if="!sidebarCollapsed">新对话</span>
        </button>
        <button @click="toggleSidebar" class="btn-toggle">
          {{ sidebarCollapsed ? '☰' : '✕' }}
        </button>
      </div>

      <div v-if="!sidebarCollapsed" class="chat-history">
        <div class="history-section">
          <h3>今天</h3>
          <div 
            v-for="chat in todayChats" 
            :key="chat.id"
            @click="selectChat(chat)"
            :class="{ active: currentChatId === chat.id }"
            class="chat-item"
          >
            <span class="chat-title">{{ chat.title }}</span>
            <button @click.stop="deleteChat(chat.id)" class="btn-delete">🗑️</button>
          </div>
        </div>

        <div v-if="olderChats.length > 0" class="history-section">
          <h3>更早</h3>
          <div 
            v-for="chat in olderChats" 
            :key="chat.id"
            @click="selectChat(chat)"
            :class="{ active: currentChatId === chat.id }"
            class="chat-item"
          >
            <span class="chat-title">{{ chat.title }}</span>
            <button @click.stop="deleteChat(chat.id)" class="btn-delete">🗑️</button>
          </div>
        </div>
      </div>

      <div class="sidebar-footer">
        <button @click="goToHome" class="btn-footer">
          <span class="icon">🏠</span>
          <span v-if="!sidebarCollapsed">返回首页</span>
        </button>
        <button v-if="isLoggedIn" @click="goToAdmin" class="btn-footer">
          <span class="icon">⚙️</span>
          <span v-if="!sidebarCollapsed">管理后台</span>
        </button>
      </div>
    </aside>

    <!-- 主聊天区域 -->
    <main class="chat-main">
      <!-- 空状态 -->
      <div v-if="messages.length === 0" class="empty-state">
        <div class="welcome-content">
          <h1>你好，我是 AI 助手</h1>
          <p>我可以帮你解答问题、写代码、翻译文本等等</p>
          
          <div class="model-selector-large">
            <label>选择模型</label>
            <select v-model="selectedModel" class="model-select">
              <option value="">请选择模型</option>
              <optgroup 
                v-for="platform in availablePlatforms" 
                :key="platform.id" 
                :label="platform.display_name"
              >
                <option 
                  v-for="model in platform.models" 
                  :key="model.id"
                  :value="`${platform.id}:${model.model_id}`"
                >
                  {{ model.model_name }}
                </option>
              </optgroup>
            </select>
          </div>

          <div class="example-prompts">
            <button 
              v-for="example in examplePrompts" 
              :key="example"
              @click="sendMessage(example)"
              class="example-btn"
            >
              {{ example }}
            </button>
          </div>
        </div>
      </div>

      <!-- 消息列表 -->
      <div v-else class="messages-container" ref="messagesContainer">
        <div 
          v-for="(message, index) in messages" 
          :key="index"
          :class="['message', message.role]"
        >
          <div class="message-avatar">
            {{ message.role === 'user' ? '👤' : '🤖' }}
          </div>
          <div class="message-content">
            <div class="message-text" v-html="formatMessage(message.content)"></div>
            <div v-if="message.role === 'assistant' && message.model" class="message-meta">
              <span class="model-badge">{{ message.model }}</span>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="message assistant">
          <div class="message-avatar">🤖</div>
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-container">
        <div v-if="messages.length > 0" class="model-selector-compact">
          <select v-model="selectedModel" class="model-select-small">
            <option value="">选择模型</option>
            <optgroup 
              v-for="platform in availablePlatforms" 
              :key="platform.id" 
              :label="platform.display_name"
            >
              <option 
                v-for="model in platform.models" 
                :key="model.id"
                :value="`${platform.id}:${model.model_id}`"
              >
                {{ model.model_name }}
              </option>
            </optgroup>
          </select>
        </div>

        <div class="input-wrapper">
          <textarea
            v-model="inputMessage"
            @keydown.enter.exact.prevent="handleSend"
            @keydown.enter.shift.exact="inputMessage += '\n'"
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            rows="1"
            ref="textarea"
          ></textarea>
          <button 
            @click="handleSend" 
            :disabled="!inputMessage.trim() || !selectedModel || isLoading"
            class="btn-send"
          >
            <span v-if="isLoading">⏳</span>
            <span v-else>📤</span>
          </button>
        </div>

        <div class="input-footer">
          <span class="hint">AI 可能会出错，请核实重要信息</span>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';

const router = useRouter();

const sidebarCollapsed = ref(false);
const currentChatId = ref(null);
const chats = ref([]);
const messages = ref([]);
const inputMessage = ref('');
const isLoading = ref(false);
const selectedModel = ref('');
const availablePlatforms = ref([]);
const isLoggedIn = ref(!!localStorage.getItem('token'));
const messagesContainer = ref(null);
const textarea = ref(null);

const examplePrompts = [
  '用 Python 写一个快速排序算法',
  '解释什么是量子计算',
  '帮我写一封专业的邮件',
  '推荐几本好书'
];

const todayChats = computed(() => {
  const today = new Date().toDateString();
  return chats.value.filter(chat => 
    new Date(chat.createdAt).toDateString() === today
  );
});

const olderChats = computed(() => {
  const today = new Date().toDateString();
  return chats.value.filter(chat => 
    new Date(chat.createdAt).toDateString() !== today
  );
});

onMounted(async () => {
  await loadAvailableModels();
  loadChatsFromStorage();
  
  // 自动调整 textarea 高度
  watch(inputMessage, () => {
    nextTick(() => {
      if (textarea.value) {
        textarea.value.style.height = 'auto';
        textarea.value.style.height = textarea.value.scrollHeight + 'px';
      }
    });
  });
});

const loadAvailableModels = async () => {
  try {
    const data = await api.getPlatforms();
    const platforms = data.platforms || [];
    
    // 为每个平台加载已启用的模型
    for (const platform of platforms) {
      if (platform.status === 'active') {
        try {
          const modelsData = await api.getPlatformModels(platform.id);
          platform.models = (modelsData.models || []).filter(m => m.enabled);
        } catch (err) {
          console.error(`加载平台 ${platform.name} 的模型失败:`, err);
          platform.models = [];
        }
      }
    }
    
    availablePlatforms.value = platforms.filter(p => p.models && p.models.length > 0);
    
    // 自动选择第一个可用模型
    if (availablePlatforms.value.length > 0 && availablePlatforms.value[0].models.length > 0) {
      const firstPlatform = availablePlatforms.value[0];
      const firstModel = firstPlatform.models[0];
      selectedModel.value = `${firstPlatform.id}:${firstModel.model_id}`;
    }
  } catch (err) {
    console.error('加载可用模型失败:', err);
  }
};

const loadChatsFromStorage = () => {
  const stored = localStorage.getItem('chatHistory');
  if (stored) {
    chats.value = JSON.parse(stored);
  }
};

const saveChatsToStorage = () => {
  localStorage.setItem('chatHistory', JSON.stringify(chats.value));
};

const newChat = () => {
  currentChatId.value = null;
  messages.value = [];
  inputMessage.value = '';
};

const selectChat = (chat) => {
  currentChatId.value = chat.id;
  messages.value = chat.messages || [];
  nextTick(() => scrollToBottom());
};

const deleteChat = (chatId) => {
  if (confirm('确定要删除这个对话吗？')) {
    chats.value = chats.value.filter(c => c.id !== chatId);
    saveChatsToStorage();
    if (currentChatId.value === chatId) {
      newChat();
    }
  }
};

const handleSend = () => {
  if (!inputMessage.value.trim() || !selectedModel.value || isLoading.value) return;
  sendMessage(inputMessage.value);
};

const sendMessage = async (content) => {
  if (!selectedModel.value) {
    alert('请先选择一个模型');
    return;
  }

  const userMessage = {
    role: 'user',
    content: content,
    timestamp: new Date().toISOString()
  };

  messages.value.push(userMessage);
  inputMessage.value = '';
  isLoading.value = true;

  nextTick(() => scrollToBottom());

  try {
    // 解析选择的模型
    const [platformId, modelId] = selectedModel.value.split(':');
    const platform = availablePlatforms.value.find(p => p.id === parseInt(platformId));
    const model = platform?.models.find(m => m.model_id === modelId);

    // 模拟 API 调用（这里需要实现实际的 API 调用）
    await new Promise(resolve => setTimeout(resolve, 1000));

    const assistantMessage = {
      role: 'assistant',
      content: `这是一个模拟回复。实际使用时，这里会调用 ${platform?.display_name} 的 ${model?.model_name} 模型来生成回复。\n\n你的问题是：${content}`,
      model: model?.model_name,
      timestamp: new Date().toISOString()
    };

    messages.value.push(assistantMessage);

    // 保存或更新对话
    saveCurrentChat();

    nextTick(() => scrollToBottom());
  } catch (err) {
    console.error('发送消息失败:', err);
    messages.value.push({
      role: 'assistant',
      content: '抱歉，发送消息时出错了。请稍后重试。',
      timestamp: new Date().toISOString()
    });
  } finally {
    isLoading.value = false;
  }
};

const saveCurrentChat = () => {
  if (messages.value.length === 0) return;

  const title = messages.value[0].content.substring(0, 30) + (messages.value[0].content.length > 30 ? '...' : '');

  if (currentChatId.value) {
    // 更新现有对话
    const chat = chats.value.find(c => c.id === currentChatId.value);
    if (chat) {
      chat.messages = messages.value;
      chat.updatedAt = new Date().toISOString();
    }
  } else {
    // 创建新对话
    const newChatObj = {
      id: Date.now(),
      title,
      messages: messages.value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    chats.value.unshift(newChatObj);
    currentChatId.value = newChatObj.id;
  }

  saveChatsToStorage();
};

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const formatMessage = (content) => {
  // 简单的 Markdown 格式化
  return content
    .replace(/\n/g, '<br>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
};

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
};

const goToHome = () => {
  router.push('/');
};

const goToAdmin = () => {
  router.push('/admin');
};
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100vh;
  background: #f5f5f5;
}

/* 侧边栏 */
.sidebar {
  width: 260px;
  background: #2c2c2c;
  color: white;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: relative;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 1rem;
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-new-chat {
  flex: 1;
  padding: 0.75rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-new-chat:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.sidebar.collapsed .btn-new-chat span:not(.icon) {
  display: none;
}

.btn-toggle {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s ease;
}

.btn-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
}

.chat-history {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.history-section {
  margin-bottom: 1.5rem;
}

.history-section h3 {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 0.5rem;
  padding: 0 0.5rem;
}

.chat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  margin-bottom: 0.25rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.chat-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.chat-item.active {
  background: rgba(102, 126, 234, 0.3);
}

.chat-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
}

.btn-delete {
  opacity: 0;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
  transition: opacity 0.3s ease;
}

.chat-item:hover .btn-delete {
  opacity: 1;
}

.btn-delete:hover {
  color: #ff6b6b;
}

.sidebar-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn-footer {
  width: 100%;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
}

.btn-footer:hover {
  background: rgba(255, 255, 255, 0.1);
}

.sidebar.collapsed .btn-footer span:not(.icon) {
  display: none;
}

.sidebar.collapsed .btn-footer {
  justify-content: center;
}

/* 主聊天区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.welcome-content {
  max-width: 600px;
  text-align: center;
}

.welcome-content h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  color: #2c3e50;
}

.welcome-content p {
  font-size: 1.1rem;
  color: #7f8c8d;
  margin-bottom: 2rem;
}

.model-selector-large {
  margin-bottom: 2rem;
}

.model-selector-large label {
  display: block;
  margin-bottom: 0.5rem;
  color: #2c3e50;
  font-weight: 500;
}

.model-select {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
  transition: border-color 0.3s ease;
}

.model-select:focus {
  outline: none;
  border-color: #667eea;
}

.example-prompts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.example-btn {
  padding: 1rem;
  background: #f8f9fa;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.3s ease;
  color: #2c3e50;
}

.example-btn:hover {
  border-color: #667eea;
  background: #f0f4ff;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.message {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.message.assistant .message-avatar {
  background: #f0f0f0;
}

.message-content {
  flex: 1;
  max-width: 800px;
}

.message-text {
  padding: 1rem;
  border-radius: 12px;
  line-height: 1.6;
}

.message.user .message-text {
  background: #f0f4ff;
  color: #2c3e50;
}

.message.assistant .message-text {
  background: #f8f9fa;
  color: #2c3e50;
}

.message-text :deep(code) {
  padding: 0.2rem 0.4rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.message-meta {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.5rem;
}

.model-badge {
  padding: 0.25rem 0.75rem;
  background: #e0e0e0;
  border-radius: 12px;
  font-size: 0.75rem;
  color: #666;
}

.typing-indicator {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #999;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-10px); }
}

.input-container {
  border-top: 1px solid #e0e0e0;
  padding: 1rem 2rem;
  background: white;
}

.model-selector-compact {
  margin-bottom: 0.5rem;
}

.model-select-small {
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  cursor: pointer;
}

.input-wrapper {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
}

.input-wrapper textarea {
  flex: 1;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 1rem;
  font-family: inherit;
  resize: none;
  max-height: 200px;
  transition: border-color 0.3s ease;
}

.input-wrapper textarea:focus {
  outline: none;
  border-color: #667eea;
}

.btn-send {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.btn-send:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-footer {
  margin-top: 0.5rem;
  text-align: center;
}

.hint {
  font-size: 0.75rem;
  color: #999;
}

@media (max-width: 768px) {
  .sidebar {
    width: 60px;
  }

  .sidebar-header h2,
  .chat-title,
  .btn-new-chat span:not(.icon),
  .btn-footer span:not(.icon) {
    display: none;
  }

  .example-prompts {
    grid-template-columns: 1fr;
  }

  .messages-container {
    padding: 1rem;
  }

  .input-container {
    padding: 1rem;
  }
}
</style>
