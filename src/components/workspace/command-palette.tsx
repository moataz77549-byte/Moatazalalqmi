'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Brain,
  Command as CommandIcon,
  FileText,
  FolderKanban,
  ListTodo,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useAppStore, type ViewType } from '@/lib/store';
import { apiGet } from '@/lib/api-client';

interface SearchResult {
  type: 'chat' | 'message' | 'file' | 'note' | 'artifact' | 'project';
  id: string;
  title?: string;
  name?: string;
  content?: string;
  preview?: string;
  updatedAt?: string;
  chatId?: string;
  chat?: { id: string; title: string };
}

const QUICK_ACTIONS = [
  { id: 'new-chat', label: 'New Chat', icon: Plus, action: 'new-chat' },
  { id: 'switch-model', label: 'Switch Model', icon: Sparkles, action: 'switch-model' },
  { id: 'toggle-theme', label: 'Toggle Theme', icon: Sun, action: 'toggle-theme' },
  { id: 'open-memory', label: 'Open Memory Center', icon: Brain, action: 'open-memory' },
  { id: 'open-knowledge', label: 'Open Knowledge Base', icon: BookOpen, action: 'open-knowledge' },
  { id: 'open-search', label: 'Open Smart Search', icon: Search, action: 'open-search' },
  { id: 'open-settings', label: 'Open Settings', icon: SettingsIcon, action: 'open-settings' },
  { id: 'open-gateway', label: 'Open AI Gateway', icon: Zap, action: 'open-gateway' },
];

const NAV_VIEWS: { view: ViewType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { view: 'chat', label: 'Go to Chat', icon: MessageSquare },
  { view: 'files', label: 'Go to Files', icon: FileText },
  { view: 'notes', label: 'Go to Notes', icon: FileText },
  { view: 'tasks', label: 'Go to Tasks', icon: ListTodo },
  { view: 'artifacts', label: 'Go to Artifacts', icon: Sparkles },
  { view: 'memory', label: 'Go to Memory', icon: Brain },
  { view: 'knowledge', label: 'Go to Knowledge', icon: BookOpen },
  { view: 'search', label: 'Go to Search', icon: Search },
  { view: 'gateway', label: 'Go to AI Gateway', icon: Zap },
  { view: 'settings', label: 'Go to Settings', icon: SettingsIcon },
];

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  chat: MessageSquare,
  message: MessageSquare,
  file: FileText,
  note: FileText,
  artifact: Sparkles,
  project: FolderKanban,
};

const TYPE_LABELS: Record<string, string> = {
  chat: 'Chat',
  message: 'Message',
  file: 'File',
  note: 'Note',
  artifact: 'Artifact',
  project: 'Project',
};

export default function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    activeOrganizationId,
    setActiveChatId,
    setActiveView,
    toggleTheme,
    theme,
    chats,
    activeChatId,
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  // Debounced search
  useEffect(() => {
    if (!commandPaletteOpen) {
      setSearch('');
      setResults(null);
      return;
    }
    if (!search.trim()) {
      setResults(null);
      return;
    }
    const q = search.trim();
    const timer = setTimeout(async () => {
      try {
        const res = await apiGet<{ chats: SearchResult[]; messages: SearchResult[]; files: SearchResult[]; notes: SearchResult[]; artifacts: SearchResult[]; projects: SearchResult[] }>('/api/v1/search', { q, limit: 5 });
        if (res.success && res.data) {
          const all = [
            ...(res.data.chats || []),
            ...(res.data.messages || []),
            ...(res.data.files || []),
            ...(res.data.notes || []),
            ...(res.data.artifacts || []),
            ...(res.data.projects || []),
          ];
          setResults(all);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search, commandPaletteOpen]);

  const handleSelectResult = (r: SearchResult) => {
    if (r.type === 'chat' || r.type === 'message') {
      setActiveChatId(r.type === 'chat' ? r.id : r.chatId || r.chat?.id || null);
      setActiveView('chat');
    } else if (r.type === 'file') {
      setActiveView('files');
    } else if (r.type === 'note') {
      setActiveView('notes');
    } else if (r.type === 'artifact') {
      setActiveView('artifacts');
    } else if (r.type === 'project') {
      setActiveView('chat');
    }
    setCommandPaletteOpen(false);
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'new-chat': {
        // Trigger new chat via store — handled by sidebar normally, so we just clear & navigate
        setActiveChatId(null);
        setActiveView('chat');
        break;
      }
      case 'toggle-theme':
        toggleTheme();
        break;
      case 'open-settings':
        setActiveView('settings');
        break;
      case 'open-gateway':
        setActiveView('gateway');
        break;
      case 'open-memory':
        setActiveView('memory');
        break;
      case 'open-knowledge':
        setActiveView('knowledge');
        break;
      case 'open-search':
        setActiveView('search');
        break;
      case 'switch-model':
        setActiveView('settings');
        break;
    }
    setCommandPaletteOpen(false);
  };

  const handleNav = (view: ViewType) => {
    setActiveView(view);
    setCommandPaletteOpen(false);
  };

  // Show recent chats when no search
  const recentChats = useMemo(() => chats.slice(0, 5), [chats]);

  return (
    <CommandDialog
      open={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
      className="max-w-2xl"
    >
      <CommandInput
        placeholder="Search chats, files, notes, or jump to..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          {search ? `No results for "${search}"` : 'Type to search...'}
        </CommandEmpty>

        {!search && (
          <>
            <CommandGroup heading="Quick Actions">
              {QUICK_ACTIONS.map((a) => (
                <CommandItem key={a.id} onSelect={() => handleAction(a.action)}>
                  <a.icon className="h-4 w-4 text-brand" />
                  <span>{a.label}</span>
                  {a.action === 'toggle-theme' && (
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {theme === 'dark' ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Navigate">
              {NAV_VIEWS.map((n) => (
                <CommandItem key={n.view} onSelect={() => handleNav(n.view)}>
                  <n.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{n.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            {recentChats.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Recent Chats">
                  {recentChats.map((c) => (
                    <CommandItem
                      key={c.id}
                      onSelect={() => {
                        setActiveChatId(c.id);
                        setActiveView('chat');
                        setCommandPaletteOpen(false);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{c.title}</span>
                      {c.id === activeChatId && (
                        <span className="ml-auto text-[10px] text-brand">current</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </>
        )}

        {search && results && results.length > 0 && (
          <CommandGroup heading={`Search Results (${results.length})`}>
            {results.map((r) => {
              const Icon = TYPE_ICONS[r.type] || FileText;
              const label = r.title || r.name || (r.type === 'message' ? r.chat?.title : 'Untitled');
              return (
                <CommandItem
                  key={`${r.type}-${r.id}`}
                  onSelect={() => handleSelectResult(r)}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{label}</div>
                    {r.preview && r.type !== 'chat' && (
                      <div className="truncate text-[11px] text-muted-foreground">{r.preview}</div>
                    )}
                  </div>
                  <span className="ml-2 text-[10px] text-muted-foreground uppercase">{TYPE_LABELS[r.type]}</span>
                  <ArrowRight className="h-3 w-3 opacity-50 ml-1" />
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {search && results && results.length === 0 && (
          <CommandEmpty>No results found. Try a different query.</CommandEmpty>
        )}
      </CommandList>
    </CommandDialog>
  );
}
