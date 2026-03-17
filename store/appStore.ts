'use client';

import {
  ApiKey,
  AppSettings,
  ChatSession,
  Message,
  ProcessedDocument,
  Role,
  SourceCitation,
  WritingMode,
} from '@/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppStore {
  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  addApiKey: (key: Omit<ApiKey, 'id'>) => void;
  removeApiKey: (id: string) => void;
  updateApiKeyStatus: (id: string, status: ApiKey['status'], rateLimitedUntil?: number) => void;

  // Documents
  documents: ProcessedDocument[];
  addDocument: (doc: ProcessedDocument) => void;
  updateDocument: (id: string, updates: Partial<ProcessedDocument>) => void;
  removeDocument: (id: string) => void;

  // Chat sessions
  sessions: ChatSession[];
  currentSessionId: string | null;
  createSession: (role: Role) => string;
  deleteSession: (id: string) => void;
  setCurrentSession: (id: string) => void;

  // Messages
  addMessage: (sessionId: string, message: Message) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<Message>) => void;
  clearMessages: (sessionId: string) => void;

  // UI State
  selectedRole: Role;
  setSelectedRole: (role: Role) => void;
  writingMode: WritingMode;
  setWritingMode: (mode: WritingMode) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isSettingsOpen: boolean;
  toggleSettings: () => void;
  activePanel: 'documents' | 'history' | 'settings';
  setActivePanel: (panel: 'documents' | 'history' | 'settings') => void;

  // Current context
  pendingSources: SourceCitation[];
  setPendingSources: (sources: SourceCitation[]) => void;
}

const defaultSettings: AppSettings = {
  apiKeys: [],
  currentKeyIndex: 0,
  selectedModel: 'meta-llama/llama-3.3-70b-instruct:free',
  autoCheckPlagiarism: true,
  maxChunksPerQuery: 5,
  chunkSize: 800,
  chunkOverlap: 150,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,

      updateSettings: (updates) =>
        set((state) => ({ settings: { ...state.settings, ...updates } })),

      addApiKey: (keyData) =>
        set((state) => ({
          settings: {
            ...state.settings,
            apiKeys: [
              ...state.settings.apiKeys,
              {
                ...keyData,
                id: `key_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                status: 'untested' as const,
              },
            ],
          },
        })),

      removeApiKey: (id) =>
        set((state) => ({
          settings: {
            ...state.settings,
            apiKeys: state.settings.apiKeys.filter((k) => k.id !== id),
          },
        })),

      updateApiKeyStatus: (id, status, rateLimitedUntil) =>
        set((state) => ({
          settings: {
            ...state.settings,
            apiKeys: state.settings.apiKeys.map((k) =>
              k.id === id ? { ...k, status, rateLimitedUntil } : k
            ),
          },
        })),

      documents: [],

      addDocument: (doc) =>
        set((state) => ({
          documents: [...state.documents.filter((d) => d.id !== doc.id), doc],
        })),

      updateDocument: (id, updates) =>
        set((state) => ({
          documents: state.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        })),

      removeDocument: (id) =>
        set((state) => ({
          documents: state.documents.filter((d) => d.id !== id),
        })),

      sessions: [],
      currentSessionId: null,

      createSession: (role) => {
        const id = `session_${Date.now()}`;
        const session: ChatSession = {
          id,
          title: 'New Research Session',
          messages: [],
          createdAt: Date.now(),
          role,
        };
        set((state) => ({
          sessions: [session, ...state.sessions],
          currentSessionId: id,
        }));
        return id;
      },

      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          currentSessionId: state.currentSessionId === id ? null : state.currentSessionId,
        })),

      setCurrentSession: (id) => set({ currentSessionId: id }),

      addMessage: (sessionId, message) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: [...s.messages, message],
                  title:
                    s.messages.length === 0 && message.role === 'user'
                      ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
                      : s.title,
                }
              : s
          ),
        })),

      updateMessage: (sessionId, messageId, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === messageId ? { ...m, ...updates } : m
                  ),
                }
              : s
          ),
        })),

      clearMessages: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, messages: [] } : s
          ),
        })),

      selectedRole: 'mentor',
      setSelectedRole: (role) => set({ selectedRole: role }),

      writingMode: null,
      setWritingMode: (mode) => set({ writingMode: mode }),

      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      isSettingsOpen: false,
      toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),

      activePanel: 'documents',
      setActivePanel: (panel) => set({ activePanel: panel }),

      pendingSources: [],
      setPendingSources: (sources) => set({ pendingSources: sources }),
    }),
    {
      name: 'rag-chatbot-store',
      partialize: (state) => ({
        settings: state.settings,
        documents: state.documents.map((d) => ({
          ...d,
          chunks: [], // Don't persist chunks in localStorage
          status: d.status === 'processing' ? 'error' : d.status,
        })),
        sessions: state.sessions.map((s) => ({
          ...s,
          messages: s.messages.slice(-50), // Keep last 50 messages per session
        })),
        selectedRole: state.selectedRole,
      }),
    }
  )
);
