'use client';

import React, { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAppStore } from '@/lib/store';
import { apiGet } from '@/lib/api-client';
import { toast } from 'sonner';
import Sidebar from './sidebar';
import TopBar from './top-bar';
import RightPanel from './right-panel';
import StatusBar from './status-bar';
import CommandPalette from './command-palette';
import ChatView from './chat-view';
import FilesView from './files-view';
import NotesView from './notes-view';
import TasksView from './tasks-view';
import ArtifactsView from './artifacts-view';
import MemoryView from './memory-view';
import KnowledgeView from './knowledge-view';
import SearchView from './search-view';
import SettingsView from './settings-view';
import GatewayView from './gateway-view';

export default function WorkspaceShell() {
  const {
    activeView,
    sidebarOpen,
    rightPanelOpen,
    theme,
    locale,
    activeOrganizationId,
    setActiveOrganizationId,
    setChats,
    setAvailableModels,
    setQuickAccess,
    user,
  } = useAppStore();
  const { setTheme: setNextTheme } = useTheme();

  // Apply theme
  useEffect(() => {
    setNextTheme(theme);
  }, [theme, setNextTheme]);

  // Apply RTL
  useEffect(() => {
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [locale]);

  // Initial data load
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      // 1) Load organizations & pick first
      try {
        const orgRes = await apiGet<any[]>('/api/v1/organizations', { limit: 10 });
        if (!cancelled && orgRes.success && Array.isArray(orgRes.data) && orgRes.data.length > 0) {
          if (!activeOrganizationId) {
            setActiveOrganizationId(orgRes.data[0].id);
          }
        }
      } catch {
        /* no-op */
      }

      // 2) Load chats
      try {
        const chatsRes = await apiGet<any[]>('/api/v1/chats', { limit: 50 });
        if (!cancelled && chatsRes.success && Array.isArray(chatsRes.data)) {
          setChats(chatsRes.data);
        }
      } catch {
        /* no-op */
      }

      // 3) Load models
      try {
        const modelsRes = await apiGet<{ models: any[] }>('/api/v1/ai/models');
        if (!cancelled && modelsRes.success && modelsRes.data?.models) {
          setAvailableModels(modelsRes.data.models);
        }
      } catch {
        /* no-op */
      }

      // 4) Load quick access
      try {
        const qaRes = await apiGet<any[]>('/api/v1/quick-access');
        if (!cancelled && qaRes.success && Array.isArray(qaRes.data)) {
          setQuickAccess(qaRes.data);
        }
      } catch {
        /* no-op */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // If no active organization, prompt to create one (only once per session)
  useEffect(() => {
    if (!user) return;
    if (activeOrganizationId) return;
    let cancelled = false;
    (async () => {
      // Wait a bit then check if user has orgs
      await new Promise((r) => setTimeout(r, 1500));
      if (cancelled) return;
      const orgRes = await apiGet<any[]>('/api/v1/organizations', { limit: 1 });
      if (!cancelled && orgRes.success && Array.isArray(orgRes.data) && orgRes.data.length === 0) {
        toast.info('Creating your default workspace…');
        const createRes = await apiPostCreate('/api/v1/organizations', {
          name: `${user.name || user.email.split('@')[0]}'s Workspace`,
          slug: `ws-${user.id.slice(0, 8)}`,
          description: 'Personal workspace',
        });
        if (createRes.success && createRes.data) {
          setActiveOrganizationId(createRes.data.id);
          toast.success('Workspace ready!');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar />}

        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />

          <main className="flex-1 overflow-hidden min-h-0">
            {activeView === 'chat' && <ChatView />}
            {activeView === 'files' && <FilesView />}
            {activeView === 'notes' && <NotesView />}
            {activeView === 'tasks' && <TasksView />}
            {activeView === 'artifacts' && <ArtifactsView />}
            {activeView === 'memory' && <MemoryView />}
            {activeView === 'knowledge' && <KnowledgeView />}
            {activeView === 'search' && <SearchView />}
            {activeView === 'settings' && <SettingsView />}
            {activeView === 'gateway' && <GatewayView />}
          </main>
        </div>

        {rightPanelOpen && activeView === 'chat' && <RightPanel />}
      </div>

      <StatusBar />
      <CommandPalette />
    </div>
  );
}

// Helper to use apiPost (avoid circular import)
async function apiPostCreate<T>(path: string, body?: unknown) {
  const token = useAppStore.getState().token;
  const res = await fetch(`${path}?XTransformPort=3000`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res.json() as Promise<{ success: boolean; data?: T; error?: string }>;
}
