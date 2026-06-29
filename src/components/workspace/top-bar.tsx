'use client';

import React from 'react';
import {
  Bell,
  ChevronsLeft,
  PanelRight,
  PanelRightClose,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore, type ViewType } from '@/lib/store';
import ModelSelector from './model-selector';

const VIEW_LABELS: Record<ViewType, string> = {
  chat: 'Chat',
  files: 'Files',
  notes: 'Notes',
  tasks: 'Tasks',
  artifacts: 'Artifacts',
  memory: 'Memory',
  knowledge: 'Knowledge',
  search: 'Search',
  settings: 'Settings',
  gateway: 'AI Gateway',
};

export default function TopBar() {
  const {
    activeView,
    activeChatId,
    chats,
    sidebarOpen,
    toggleSidebar,
    rightPanelOpen,
    toggleRightPanel,
    setCommandPaletteOpen,
    user,
    locale,
    logout,
    availableModels,
    setActiveChatId,
    activeOrganizationId,
  } = useAppStore();

  const activeChat = chats.find((c) => c.id === activeChatId);
  const breadcrumb = [VIEW_LABELS[activeView], activeView === 'chat' && activeChat ? activeChat.title : null].filter(
    Boolean
  ) as string[];

  const handleNewChat = async () => {
    if (!activeOrganizationId) return;
    try {
      const res = await fetch('/api/v1/chats?XTransformPort=3000', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAppStore.getState().token}`,
        },
        body: JSON.stringify({ title: 'New Chat', organizationId: activeOrganizationId }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        useAppStore.getState().upsertChat(data.data);
        setActiveChatId(data.data.id);
        useAppStore.getState().setActiveView('chat');
      }
    } catch {
      /* no-op */
    }
  };

  return (
    <header className="h-14 shrink-0 border-b border-border bg-background/80 backdrop-blur-md flex items-center gap-2 px-3 z-30">
      {/* Sidebar toggle */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleSidebar}>
              <ChevronsLeft className={cn('h-4 w-4 transition-transform', !sidebarOpen && 'rotate-180')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Breadcrumb */}
      <nav className="hidden md:flex items-center gap-1.5 text-sm">
        <span className="font-semibold text-foreground">{breadcrumb[0]}</span>
        {breadcrumb.length > 1 && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground truncate max-w-[280px]">{breadcrumb[1]}</span>
          </>
        )}
      </nav>

      {/* Search trigger */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="ml-auto hidden md:flex items-center gap-2 px-3 h-9 min-w-[280px] rounded-md border border-border bg-muted/40 hover:bg-muted transition text-sm text-muted-foreground"
      >
        <Search className="h-4 w-4" />
        <span>{locale === 'ar' ? 'بحث أو انتقال إلى...' : 'Search or jump to...'}</span>
        <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-background border border-border/60 font-mono">
          ⌘K
        </kbd>
      </button>

      <Button variant="ghost" size="icon" className="md:hidden ml-auto h-9 w-9" onClick={() => setCommandPaletteOpen(true)}>
        <Search className="h-4 w-4" />
      </Button>

      {/* New chat */}
      {activeView !== 'chat' && (
        <Button
          variant="outline"
          size="sm"
          className="h-9 hidden sm:flex"
          onClick={handleNewChat}
        >
          <Plus className="h-4 w-4 mr-1" />
          New Chat
        </Button>
      )}

      {/* Model selector */}
      {availableModels.length > 0 && (
        <ModelSelector variant="ghost" />
      )}

      {/* Right panel toggle */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={toggleRightPanel}
            >
              {rightPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Toggle context panel</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Notifications */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Notifications</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-9 w-9 rounded-full hover:ring-2 hover:ring-brand/30 transition flex items-center justify-center bg-brand-gradient text-white text-xs font-semibold">
            {(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-brand-gradient text-white text-xs">
                {(user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user?.name || 'User'}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => useAppStore.getState().setActiveView('settings')}>
            <Sparkles className="h-4 w-4 mr-2" />
            Profile & Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => useAppStore.getState().setActiveView('gateway')}>
            <Sparkles className="h-4 w-4 mr-2" />
            AI Gateway
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => useAppStore.getState().toggleTheme()}>
            <Sparkles className="h-4 w-4 mr-2" />
            Toggle theme
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => {
              logout();
            }}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
