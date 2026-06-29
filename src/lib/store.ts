import { create } from 'zustand';

export type ViewType =
  | 'chat'
  | 'files'
  | 'notes'
  | 'tasks'
  | 'artifacts'
  | 'memory'
  | 'knowledge'
  | 'search'
  | 'settings'
  | 'gateway';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isSuperAdmin: boolean;
  preferredLocale: string;
}

export interface ChatListItem {
  id: string;
  title: string;
  modelId?: string | null;
  providerType?: string | null;
  isPinned?: boolean;
  isFavorite?: boolean;
  lastMessageAt?: string | null;
  updatedAt: string;
  createdAt: string;
  _count?: { messages: number };
  folder?: { id: string; name: string } | null;
}

export interface MessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status: 'PENDING' | 'STREAMING' | 'COMPLETED' | 'FAILED';
  model?: string | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
  createdAt: string;
  reactions?: { type: string; userId: string }[];
  _count?: { artifacts: number };
}

export interface ModelInfo {
  id: string;
  provider: string;
  displayName: string;
  description?: string;
  contextWindow?: number;
  maxOutputTokens?: number;
  supportsVision?: boolean;
  supportsAudio?: boolean;
  supportsStreaming?: boolean;
  supportsToolCalling?: boolean;
  supportsJsonMode?: boolean;
  supportsThinking?: boolean;
  pricing?: { input?: number; output?: number } | null;
  capabilities?: string[];
  status?: string;
}

export interface ModelParams {
  temperature: number;
  maxTokens: number;
  topP: number;
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  activeOrganizationId: string | null;
  setUser: (user: User | null, token?: string | null) => void;
  setActiveOrganizationId: (orgId: string | null) => void;
  logout: () => void;

  // Navigation
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  activeChatId: string | null;
  setActiveChatId: (chatId: string | null) => void;
  activeProjectId: string | null;
  setActiveProjectId: (projectId: string | null) => void;

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // Locale
  locale: 'en' | 'ar';
  setLocale: (locale: 'en' | 'ar') => void;

  // Layout
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  rightPanelOpen: boolean;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;

  // Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  // Model & params
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  modelParams: ModelParams;
  setModelParams: (params: Partial<ModelParams>) => void;
  availableModels: ModelInfo[];
  setAvailableModels: (models: ModelInfo[]) => void;

  // Chat data
  chats: ChatListItem[];
  setChats: (chats: ChatListItem[]) => void;
  upsertChat: (chat: ChatListItem) => void;
  removeChat: (chatId: string) => void;

  messages: MessageItem[];
  setMessages: (messages: MessageItem[]) => void;
  appendMessage: (message: MessageItem) => void;
  updateMessage: (id: string, patch: Partial<MessageItem>) => void;
  appendDelta: (id: string, delta: string) => void;

  // Streaming
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;
  abortController: AbortController | null;
  setAbortController: (controller: AbortController | null) => void;

  // Stats bar
  totalTokens: number;
  totalCost: number;
  addTokens: (tokens: number) => void;
  addCost: (cost: number) => void;

  // Quick access
  quickAccess: { id: string; itemType: string; itemId: string; label: string; icon: string | null }[];
  setQuickAccess: (items: AppState['quickAccess']) => void;
}

const initialModelParams: ModelParams = {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1,
};

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('moataz_token') : null,
  isAuthenticated: false,
  activeOrganizationId: null,
  setUser: (user, token) => {
    if (token) localStorage.setItem('moataz_token', token);
    if (!user) localStorage.removeItem('moataz_token');
    set({ user, token: token || null, isAuthenticated: !!user });
  },
  setActiveOrganizationId: (orgId) => set({ activeOrganizationId: orgId }),
  logout: () => {
    localStorage.removeItem('moataz_token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      activeView: 'chat',
      activeChatId: null,
      chats: [],
      messages: [],
      activeOrganizationId: null,
    });
  },

  // Navigation
  activeView: 'chat',
  setActiveView: (activeView) => set({ activeView }),
  activeChatId: null,
  setActiveChatId: (chatId) => set({ activeChatId: chatId }),
  activeProjectId: null,
  setActiveProjectId: (projectId) => set({ activeProjectId: projectId }),

  // Theme
  theme: 'dark',
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  setTheme: (theme) => set({ theme }),

  // Locale
  locale: 'en',
  setLocale: (locale) => set({ locale }),

  // Layout
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  rightPanelOpen: true,
  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),

  // Command palette
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

  // Model & params
  selectedModel: 'auto',
  setSelectedModel: (modelId) => set({ selectedModel: modelId }),
  modelParams: initialModelParams,
  setModelParams: (params) =>
    set((state) => ({ modelParams: { ...state.modelParams, ...params } })),
  availableModels: [],
  setAvailableModels: (models) => set({ availableModels: models }),

  // Chat data
  chats: [],
  setChats: (chats) => set({ chats }),
  upsertChat: (chat) =>
    set((state) => {
      const existing = state.chats.findIndex((c) => c.id === chat.id);
      if (existing >= 0) {
        const next = [...state.chats];
        next[existing] = { ...next[existing], ...chat };
        return { chats: next };
      }
      return { chats: [chat, ...state.chats] };
    }),
  removeChat: (chatId) =>
    set((state) => ({
      chats: state.chats.filter((c) => c.id !== chatId),
      activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
    })),

  messages: [],
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, patch) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  appendDelta: (id, delta) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + delta } : m
      ),
    })),

  // Streaming
  isStreaming: false,
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  abortController: null,
  setAbortController: (controller) => set({ abortController: controller }),

  // Stats
  totalTokens: 0,
  totalCost: 0,
  addTokens: (tokens) => set((state) => ({ totalTokens: state.totalTokens + tokens })),
  addCost: (cost) => set((state) => ({ totalCost: state.totalCost + cost })),

  // Quick access
  quickAccess: [],
  setQuickAccess: (items) => set({ quickAccess: items }),
}));
