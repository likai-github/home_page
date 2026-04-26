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
        <div v-if="todayChats.length > 0" class="history-section">
          <h3>今天</h3>
          <div
            v-for="chat in todayChats"
            :key="chat.id"
            @click="selectChat(chat)"
            :class="['chat-item', { active: currentChatId === chat.id }]"
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
            :class="['chat-item', { active: currentChatId === chat.id }]"
          >
            <span class="chat-title">{{ chat.title }}</span>
            <button @click.stop="deleteChat(chat.id)" class="btn-delete">🗑️</button>
          </div>
        </div>
        <div v-if="chats.length === 0" class="empty-history">
          <p>暂无对话记录</p>
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

      <!-- Header -->
      <header class="chat-header">
        <div class="header-left">
          <div class="logo-icon">AI</div>
          <span class="header-title">AI Chat</span>
        </div>
        <select v-model="selectedModel" class="model-select-header">
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
      </header>

      <!-- 消息区域 -->
      <div class="messages-area" ref="messagesContainer">

        <!-- 欢迎页 -->
        <div v-if="messages.length === 0" class="welcome-screen">
          <h1 class="welcome-title">Hello, 有什么可以帮你？</h1>
          <p class="welcome-sub">选择模型后开始对话</p>
          <div class="example-grid">
            <button
              v-for="ex in examplePrompts"
              :key="ex"
              @click="fillExample(ex)"
              class="example-card"
            >
              {{ ex }}
            </button>
          </div>
        </div>

        <!-- 消息列表 -->
        <template v-else>
          <div
            v-for="(msg, i) in messages"
            :key="i"
            :class="['message-row', msg.role]"
          >
            <!-- 用户消息：气泡靠右 -->
            <div v-if="msg.role === 'user'" class="bubble user-bubble">
              {{ msg.content }}
            </div>

            <!-- AI 消息：左侧带头像 -->
            <template v-else>
              <div class="bot-avatar">AI</div>
              <div class="bubble bot-bubble" v-html="renderMarkdown(msg.content)"></div>
            </template>
          </div>

          <!-- 流式加载中 -->
          <div v-if="isLoading" class="message-row assistant">
            <div class="bot-avatar">AI</div>
            <div class="bubble bot-bubble streaming">
              <span v-if="streamingText" v-html="renderMarkdown(streamingText)"></span>
              <span v-else class="typing-dots">
                <span></span><span></span><span></span>
              </span>
            </div>
          </div>
        </template>
      </div>

      <!-- 输入区域 -->
      <footer class="input-area">
        <div class="input-box">
          <textarea
            v-model="inputMessage"
            ref="textareaRef"
            rows="1"
            placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
            @keydown.enter.exact.prevent="handleSend"
            @keydown.enter.shift.exact="inputMessage += '\n'"
            @input="autoResize"
          ></textarea>
          <button
            @click="handleSend"
            :disabled="!inputMessage.trim() || !selectedModel || isLoading"
            class="send-btn"
          >
            <svg v-if="!isLoading" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
            <span v-else class="loading-ring"></span>
          </button>
        </div>
        <p class="input-hint">AI 可能会出错，请核实重要信息</p>
      </footer>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';

const router = useRouter();

// --- 状态 ---
const sidebarCollapsed = ref(false);
const currentChatId    = ref(null);
const chats            = ref([]);
const messages         = ref([]);
const inputMessage     = ref('');
const isLoading        = ref(false);
const streamingText    = ref('');
const selectedModel    = ref('');
const availablePlatforms = ref([]);
const isLoggedIn       = ref(!!localStorage.getItem('token'));
const messagesContainer = ref(null);
const textareaRef      = ref(null);

const examplePrompts = [
  '用 Python 写一个快速排序算法',
  '解释什么是量子计算',
  '帮我写一封专业的邮件',
  '推荐几本好书',
];

// --- 计算属性 ---
const todayChats = computed(() => {
  const today = new Date().toDateString();
  return chats.value.filter(c => new Date(c.createdAt).toDateString() === today);
});
const olderChats = computed(() => {
  const today = new Date().toDateString();
  return chats.value.filter(c => new Date(c.createdAt).toDateString() !== today);
});

// --- 生命周期 ---
onMounted(async () => {
  await loadAvailableModels();
  loadChatsFromStorage();
});

// --- 模型加载 ---
const loadAvailableModels = async () => {
  try {
    const data = await api.getPlatforms();
    const platforms = data.platforms || [];
    for (const p of platforms) {
      if (p.status === 'active') {
        try {
          const md = await api.getPlatformModels(p.id);
          p.models = (md.models || []).filter(m => m.enabled);
        } catch {
          p.models = [];
        }
      }
    }
    availablePlatforms.value = platforms.filter(p => p.models && p.models.length > 0);
    // 自动选第一个
    if (availablePlatforms.value.length > 0) {
      const fp = availablePlatforms.value[0];
      if (fp.models.length > 0) {
        selectedModel.value = `${fp.id}:${fp.models[0].model_id}`;
      }
    }
  } catch (err) {
    console.error('加载模型失败:', err);
  }
};

// --- 本地存储 ---
const loadChatsFromStorage = () => {
  const s = localStorage.getItem('chatHistory');
  if (s) chats.value = JSON.parse(s);
};
const saveChatsToStorage = () => {
  localStorage.setItem('chatHistory', JSON.stringify(chats.value));
};

// --- 对话管理 ---
const newChat = () => {
  currentChatId.value = null;
  messages.value = [];
  inputMessage.value = '';
};
const selectChat = (chat) => {
  currentChatId.value = chat.id;
  messages.value = chat.messages || [];
  nextTick(scrollToBottom);
};
const deleteChat = (id) => {
  if (!confirm('确定要删除这个对话吗？')) return;
  chats.value = chats.value.filter(c => c.id !== id);
  saveChatsToStorage();
  if (currentChatId.value === id) newChat();
};
const saveCurrentChat = () => {
  if (!messages.value.length) return;
  const title = messages.value[0].content.slice(0, 30) + (messages.value[0].content.length > 30 ? '…' : '');
  if (currentChatId.value) {
    const chat = chats.value.find(c => c.id === currentChatId.value);
    if (chat) { chat.messages = messages.value; chat.updatedAt = new Date().toISOString(); }
  } else {
    const obj = { id: Date.now(), title, messages: messages.value, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    chats.value.unshift(obj);
    currentChatId.value = obj.id;
  }
  saveChatsToStorage();
};

// --- 发送消息 ---
const fillExample = (text) => { inputMessage.value = text; textareaRef.value?.focus(); };

const handleSend = () => {
  const text = inputMessage.value.trim();
  if (!text || !selectedModel.value || isLoading.value) return;
  sendMessage(text);
};

const sendMessage = async (content) => {
  if (!selectedModel.value) { alert('请先选择一个模型'); return; }

  messages.value.push({ role: 'user', content, timestamp: new Date().toISOString() });
  inputMessage.value = '';
  if (textareaRef.value) { textareaRef.value.style.height = 'auto'; }
  isLoading.value = true;
  streamingText.value = '';
  nextTick(scrollToBottom);

  try {
    const [platformId, modelId] = selectedModel.value.split(':');
    const platform = availablePlatforms.value.find(p => p.id === parseInt(platformId));
    const model = platform?.models.find(m => m.model_id === modelId);

    // 构建历史消息（OpenAI 格式）
    const history = messages.value.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
    history.push({ role: 'user', content });

    // 调用后端 /api/chat，由后端持有 API Key 并转发
    const data = await api.sendChat(parseInt(platformId), modelId, history);
    const reply = data.choices?.[0]?.message?.content || '（无回复）';
    messages.value.push({
      role: 'assistant',
      content: reply,
      model: model?.model_name,
      timestamp: new Date().toISOString(),
    });

    saveCurrentChat();
    nextTick(scrollToBottom);
  } catch (err) {
    console.error('发送失败:', err);
    messages.value.push({
      role: 'assistant',
      content: `❌ 错误：${err.message}`,
      timestamp: new Date().toISOString(),
    });
  } finally {
    isLoading.value = false;
    streamingText.value = '';
  }
};

// --- 工具函数 ---
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const autoResize = () => {
  const el = textareaRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 150) + 'px';
};

// 简单 Markdown 渲染（不引入外部库）
const renderMarkdown = (text) => {
  if (!text) return '';
  return text
    // 代码块
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code class="lang-${lang}">${escapeHtml(code.trim())}</code></pre>`)
    // 行内代码
    .replace(/`([^`]+)`/g, (_, c) => `<code>${escapeHtml(c)}</code>`)
    // 粗体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 斜体
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 标题
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // 无序列表
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    // 换行
    .replace(/\n/g, '<br>');
};

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const toggleSidebar = () => { sidebarCollapsed.value = !sidebarCollapsed.value; };
const goToHome  = () => router.push('/');
const goToAdmin = () => router.push('/admin');
</script>

<style scoped>
/* ===== 整体布局 ===== */
.chat-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #f8fafc;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ===== 侧边栏 ===== */
.sidebar {
  width: 260px;
  background: #1e1e2e;
  color: #cdd6f4;
  display: flex;
  flex-direction: column;
  transition: width 0.25s ease;
  flex-shrink: 0;
}
.sidebar.collapsed { width: 60px; }

.sidebar-header {
  padding: 0.875rem;
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}

.btn-new-chat {
  flex: 1;
  padding: 0.65rem 0.75rem;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  border: none;
  border-radius: 10px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: opacity 0.2s;
}
.btn-new-chat:hover { opacity: 0.85; }

.btn-toggle {
  width: 38px;
  height: 38px;
  background: rgba(255,255,255,0.07);
  border: none;
  border-radius: 10px;
  color: #cdd6f4;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}
.btn-toggle:hover { background: rgba(255,255,255,0.12); }

.chat-history {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
}
.chat-history::-webkit-scrollbar { width: 4px; }
.chat-history::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

.history-section { margin-bottom: 1.25rem; }
.history-section h3 {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(205,214,244,0.4);
  padding: 0 0.5rem;
  margin-bottom: 0.4rem;
}

.chat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 2px;
}
.chat-item:hover { background: rgba(255,255,255,0.07); }
.chat-item.active { background: rgba(79,70,229,0.25); }

.chat-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
}

.btn-delete {
  opacity: 0;
  background: none;
  border: none;
  color: #f38ba8;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 2px 4px;
  transition: opacity 0.15s;
}
.chat-item:hover .btn-delete { opacity: 1; }

.empty-history {
  text-align: center;
  padding: 2rem 1rem;
  color: rgba(205,214,244,0.3);
  font-size: 0.85rem;
}

.sidebar-footer {
  border-top: 1px solid rgba(255,255,255,0.07);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.btn-footer {
  width: 100%;
  padding: 0.6rem 0.75rem;
  background: rgba(255,255,255,0.04);
  border: none;
  border-radius: 8px;
  color: #cdd6f4;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.875rem;
  transition: background 0.15s;
}
.btn-footer:hover { background: rgba(255,255,255,0.09); }
.sidebar.collapsed .btn-footer { justify-content: center; }
.sidebar.collapsed .btn-footer span:not(.icon),
.sidebar.collapsed .btn-new-chat span:not(.icon) { display: none; }

/* ===== 主区域 ===== */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: white;
}

/* Header */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(8px);
  flex-shrink: 0;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.75rem;
  font-weight: 700;
}
.header-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
}

.model-select-header {
  background: #f1f5f9;
  border: none;
  border-radius: 20px;
  padding: 0.45rem 1rem;
  font-size: 0.85rem;
  color: #334155;
  cursor: pointer;
  outline: none;
  transition: background 0.2s;
}
.model-select-header:focus { background: #e2e8f0; }

/* 消息区域 */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  scroll-behavior: smooth;
}
.messages-area::-webkit-scrollbar { width: 5px; }
.messages-area::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

/* 欢迎页 */
.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
}
.welcome-title {
  font-size: 2.2rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
}
.welcome-sub {
  color: #94a3b8;
  font-size: 0.95rem;
  margin-bottom: 2.5rem;
  font-family: monospace;
  letter-spacing: 0.05em;
}
.example-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  max-width: 560px;
  width: 100%;
}
.example-card {
  padding: 0.875rem 1rem;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  font-size: 0.875rem;
  color: #334155;
  transition: all 0.2s;
  line-height: 1.4;
}
.example-card:hover {
  border-color: #4f46e5;
  background: #f0f4ff;
  color: #4f46e5;
}

/* 消息行 */
.message-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  animation: fadeUp 0.25s ease;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
}
.message-row.user {
  flex-direction: row-reverse;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.bot-avatar {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 2px;
}

/* 气泡 */
.bubble {
  max-width: 78%;
  padding: 0.75rem 1rem;
  border-radius: 16px;
  font-size: 0.95rem;
  line-height: 1.6;
  word-break: break-word;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.user-bubble {
  background: #4f46e5;
  color: white;
  border-bottom-right-radius: 4px;
}

.bot-bubble {
  background: white;
  border: 1px solid #e2e8f0;
  color: #1e293b;
  border-bottom-left-radius: 4px;
}
.bot-bubble.streaming { border-color: #c7d2fe; }

/* Markdown 内容样式 */
.bot-bubble :deep(h1),
.bot-bubble :deep(h2),
.bot-bubble :deep(h3) {
  margin: 0.75rem 0 0.4rem;
  font-weight: 600;
  color: #1e293b;
}
.bot-bubble :deep(h1) { font-size: 1.2rem; }
.bot-bubble :deep(h2) { font-size: 1.05rem; }
.bot-bubble :deep(h3) { font-size: 0.95rem; }

.bot-bubble :deep(p) { margin-bottom: 0.5rem; }
.bot-bubble :deep(ul) { margin: 0.4rem 0 0.4rem 1.4rem; }
.bot-bubble :deep(li) { margin-bottom: 0.2rem; }

.bot-bubble :deep(code) {
  background: #f1f5f9;
  color: #e11d48;
  padding: 0.15em 0.4em;
  border-radius: 4px;
  font-size: 0.875em;
  font-family: 'Fira Code', 'Courier New', monospace;
}

.bot-bubble :deep(pre) {
  background: #1e1e2e;
  border-radius: 10px;
  padding: 1rem;
  overflow-x: auto;
  margin: 0.75rem 0;
  max-height: 400px;
}
.bot-bubble :deep(pre code) {
  background: none;
  color: #cdd6f4;
  padding: 0;
  font-size: 0.85rem;
}

.bot-bubble :deep(strong) { font-weight: 600; }
.bot-bubble :deep(em) { font-style: italic; color: #64748b; }

/* 打字动画 */
.typing-dots {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  height: 20px;
}
.typing-dots span {
  width: 7px;
  height: 7px;
  background: #94a3b8;
  border-radius: 50%;
  animation: bounce 1.3s infinite;
}
.typing-dots span:nth-child(2) { animation-delay: 0.15s; }
.typing-dots span:nth-child(3) { animation-delay: 0.3s; }
@keyframes bounce {
  0%, 60%, 100% { transform: translateY(0); }
  30% { transform: translateY(-6px); }
}

/* ===== 输入区域 ===== */
.input-area {
  padding: 0.875rem 1.5rem 1rem;
  border-top: 1px solid #e2e8f0;
  background: white;
  flex-shrink: 0;
}

.input-box {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  background: white;
  border: 1.5px solid #e2e8f0;
  border-radius: 20px;
  padding: 0.5rem 0.5rem 0.5rem 1rem;
  box-shadow: 0 4px 20px rgba(0,0,0,0.07);
  transition: border-color 0.2s, box-shadow 0.2s;
  max-width: 760px;
  margin: 0 auto;
}
.input-box:focus-within {
  border-color: #4f46e5;
  box-shadow: 0 4px 20px rgba(79,70,229,0.12);
}

.input-box textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-size: 0.95rem;
  font-family: inherit;
  color: #1e293b;
  background: transparent;
  min-height: 40px;
  max-height: 150px;
  line-height: 1.5;
  padding: 0.35rem 0;
}
.input-box textarea::placeholder { color: #94a3b8; }

.send-btn {
  width: 38px;
  height: 38px;
  background: #4f46e5;
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.2s, transform 0.15s;
}
.send-btn:hover:not(:disabled) {
  background: #4338ca;
  transform: scale(1.05);
}
.send-btn:disabled {
  background: #c7d2fe;
  cursor: not-allowed;
}

.loading-ring {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: block;
}
@keyframes spin { to { transform: rotate(360deg); } }

.input-hint {
  text-align: center;
  font-size: 0.72rem;
  color: #cbd5e1;
  margin-top: 0.5rem;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .sidebar { width: 60px; }
  .sidebar .btn-new-chat span:not(.icon),
  .sidebar .btn-footer span:not(.icon),
  .sidebar .chat-history { display: none; }
  .welcome-title { font-size: 1.6rem; }
  .example-grid { grid-template-columns: 1fr; }
  .messages-area { padding: 1rem; }
  .input-area { padding: 0.75rem 1rem; }
  .bubble { max-width: 90%; }
}
</style>
