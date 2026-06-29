'use client';

import React, { useState, useMemo } from 'react';
import {
  Archive,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderKanban,
  FolderOpen,
  LayoutGrid,
  ListTodo,
  MessageSquare,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Server,
  Settings as SettingsIcon,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore, type ChatListItem, type ViewType } from '@/lib/store';
import { apiDelete, apiPost, formatRelativeTime } from '@/lib/api-client';
import { toast } from 'sonner';

interface NavItemDef {
  id: ViewType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItemDef[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'files', label: 'Files', icon: FileText },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'artifacts', label: 'Artifacts', icon: Sparkles },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'gateway', label: 'Gateway', icon: Server },
];

const QUICK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  chat: MessageSquare,
  project: FolderKanban,
  file: FileText,
  note: FileText,
  artifact: Sparkles,
  task: ListTodo,
};

export default function Sidebar() {
  const {
    sidebarOpen,
    activeView,
    setActiveView,
    chats,
    setChats,
    activeChatId,
    setActiveChatId,
    user,
    locale,
    theme,
    toggleTheme,
    setCommandPaletteOpen,
    activeOrganizationId,
    upsertChat,
    quickAccess,
    setQuickAccess,
  } = useAppStore();

  const [search, setSearch] = useState('');
  const [sectionOpen, setSectionOpen] = useState({
    pinned: true,
    recent: true,
    folders: false,
    quick: true,
  });

  const filtered = useMemo(() => {
    if (!search) return chats;
    const q = search.toLowerCase();
    return chats.filter((c) => c.title?.toLowerCase().includes(q));
  }, [chats, search]);

  const pinned = filtered.filter((c) => c.isPinned);
  const recent = filtered.filter((c) => !c.isPinned).slice(0, 30);

  const handleNewChat = async () => {
    if (!activeOrganizationId) {
      toast.error('Please set up an organization first.');
      return;
    }
    try {
      const res = await apiPost<ChatListItem>('/api/v1/chats', {
        title: 'New Chat',
        organizationId: activeOrganizationId,
      });
      if (res.success && res.data) {
        upsertChat(res.data);
        setActiveChatId(res.data.id);
        setActiveView('chat');
      } else {
        toast.error(res.error || 'Failed to create chat');
      }
    } catch {
      toast.error('Failed to create chat');
    }
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setActiveView('chat');
  };

  const handleDeleteChat = async (chatId: string) => {
    const prev = chats;
    setChats(chats.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) setActiveChatId(null);
    try {
      await apiDelete(`/api/v1/chats/${chatId}`);
      toast.success('Chat deleted');
    } catch {
      setChats(prev);
      toast.error('Failed to delete chat');
    }
  };

  const handleTogglePin = async (chat: ChatListItem) => {
    const next = { ...chat, isPinned: !chat.isPinned };
    upsertChat(next);
    try {
      await apiPost(`/api/v1/chats/${chat.id}/share`, { isPinned: next.isPinned }).catch(() => {});
      // Update via patch on chat endpoint if available — fallback silently
    } catch {
      /* no-op */
    }
  };

  if (!sidebarOpen) return null;

  return (
    <aside className="w-[280px] shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Brand row + new chat */}
      <div className="p-3 space-y-2 border-b border-sidebar-border/60">
        <Button
          onClick={handleNewChat}
          className="w-full bg-brand-gradient hover:opacity-90 text-white border-0 h-10 shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          {locale === 'ar' ? 'محادثة جديدة' : 'New Chat'}
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'ar' ? 'بحث في المحادثات...' : 'Search chats...'}
            className="pl-8 h-9 bg-background/50 border-sidebar-border/60 text-sm"
          />
        </div>
      </div>

      {/* Scrollable middle: chats + folders */}
      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-2 space-y-4">
          {/* Pinned chats */}
          {pinned.length > 0 && (
            <Section
              open={sectionOpen.pinned}
              onToggle={() => setSectionOpen((s) => ({ ...s, pinned: !s.pinned }))}
              label={locale === 'ar' ? 'مثبّتة' : 'Pinned'}
              icon={<Pin className="h-3.5 w-3.5 text-amber-400" />}
            >
              {pinned.map((chat) => (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  active={chat.id === activeChatId}
                  onSelect={() => handleSelectChat(chat.id)}
                  onDelete={() => handleDeleteChat(chat.id)}
                  onTogglePin={() => handleTogglePin(chat)}
                  locale={locale}
                />
              ))}
            </Section>
          )}

          {/* Recent chats */}
          <Section
            open={sectionOpen.recent}
            onToggle={() => setSectionOpen((s) => ({ ...s, recent: !s.recent }))}
            label={locale === 'ar' ? 'الأخيرة' : 'Recent'}
            icon={<Zap className="h-3.5 w-3.5 text-cyan-400" />}
            count={recent.length}
          >
            {recent.length === 0 ? (
              <div className="text-xs text-muted-foreground px-3 py-4 text-center">
                {locale === 'ar' ? 'لا توجد محادثات بعد' : 'No chats yet. Start a new one!'}
              </div>
            ) : (
              recent.map((chat) => (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  active={chat.id === activeChatId}
                  onSelect={() => handleSelectChat(chat.id)}
                  onDelete={() => handleDeleteChat(chat.id)}
                  onTogglePin={() => handleTogglePin(chat)}
                  locale={locale}
                />
              ))
            )}
          </Section>

          {/* Folders (placeholder section) */}
          <Section
            open={sectionOpen.folders}
            onToggle={() => setSectionOpen((s) => ({ ...s, folders: !s.folders }))}
            label={locale === 'ar' ? 'المجلدات' : 'Folders'}
            icon={<FolderOpen className="h-3.5 w-3.5 text-emerald-400" />}
          >
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition flex items-center gap-2"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              {locale === 'ar' ? 'إدارة المجلدات' : 'Manage folders'}
            </button>
          </Section>

          {/* Quick access items */}
          {quickAccess.length > 0 && (
            <Section
              open={sectionOpen.quick}
              onToggle={() => setSectionOpen((s) => ({ ...s, quick: !s.quick }))}
              label={locale === 'ar' ? 'وصول سريع' : 'Quick Access'}
              icon={<Star className="h-3.5 w-3.5 text-amber-400" />}
            >
              {quickAccess.map((item) => {
                const Icon = QUICK_ICONS[item.itemType] || FileText;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.itemType === 'chat') handleSelectChat(item.itemId);
                    }}
                    className="w-full px-3 py-1.5 rounded-md hover:bg-accent/60 transition flex items-center gap-2 text-sm group"
                  >
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  </button>
                );
              })}
            </Section>
          )}
        </div>
      </ScrollArea>

      {/* Bottom navigation + user */}
      <div className="border-t border-sidebar-border/60 p-2 space-y-1">
        {/* View switcher */}
        <div className="grid grid-cols-2 gap-1 mb-1">
          {NAV_ITEMS.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              active={activeView === item.id}
              onClick={() => setActiveView(item.id)}
            />
          ))}
          <NavButton
            item={{ id: 'settings', label: 'Settings', icon: SettingsIcon }}
            active={activeView === 'settings'}
            onClick={() => setActiveView('settings')}
          />
        </div>

        <div className="h-px bg-sidebar-border/60 my-2" />

        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full px-3 py-2 rounded-md hover:bg-accent/60 transition flex items-center gap-2 text-xs text-muted-foreground"
        >
          <Search className="h-3.5 w-3.5" />
          <span>{locale === 'ar' ? 'بحث أو انتقال إلى...' : 'Search or jump to...'}</span>
          <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border/60 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Theme + user */}
        <div className="flex items-center gap-2 pt-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? <Sparkles className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Toggle theme</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <button
            onClick={() => setActiveView('settings')}
            className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/60 transition text-left min-w-0"
          >
            <div className="h-7 w-7 rounded-full bg-brand-gradient flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{user?.name || 'User'}</div>
              <div className="text-[10px] text-muted-foreground truncate">{user?.email}</div>
            </div>
          </button>
        </div>
      </div>
    </aside>
  );
}

function Section({
  label,
  icon,
  open,
  onToggle,
  count,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {icon}
        <span>{label}</span>
        {count !== undefined && (
          <span className="ml-auto text-[10px] opacity-60 normal-case">{count}</span>
        )}
      </button>
      {open && <div className="space-y-0.5 mt-0.5">{children}</div>}
    </div>
  );
}

function ChatRow({
  chat,
  active,
  onSelect,
  onDelete,
  onTogglePin,
  locale,
}: {
  chat: ChatListItem;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  locale: 'en' | 'ar';
}) {
  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors',
        active ? 'bg-accent' : 'hover:bg-accent/60'
      )}
      onClick={onSelect}
    >
      <MessageSquare
        className={cn(
          'h-3.5 w-3.5 shrink-0',
          active ? 'text-brand' : 'text-muted-foreground'
        )}
      />
      <div className="min-w-0 flex-1">
        <div className={cn('text-sm truncate', active && 'font-medium')}>{chat.title}</div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {chat._count?.messages !== undefined && (
            <span>{chat._count.messages} {locale === 'ar' ? 'رسالة' : 'msgs'}</span>
          )}
          <span>·</span>
          <span>{chat.lastMessageAt ? formatRelativeTime(chat.lastMessageAt) : formatRelativeTime(chat.updatedAt)}</span>
        </div>
      </div>
      {chat.isPinned && <Pin className="h-3 w-3 text-amber-400 fill-amber-400/40 shrink-0" />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 transition h-6 w-6 flex items-center justify-center rounded hover:bg-accent-foreground/10"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
          >
            <Pin className="h-3.5 w-3.5 mr-2" />
            {chat.isPinned ? 'Unpin' : 'Pin'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItemDef;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              'flex flex-col items-center gap-1 py-2 rounded-md transition-colors text-[10px] font-medium',
              active
                ? 'bg-brand/10 text-brand border border-brand/20'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground border border-transparent'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="truncate w-full text-center">{item.label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{item.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
