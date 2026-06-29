'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Code2,
  FileText,
  GitBranch,
  Lightbulb,
  ListChecks,
  ScrollText,
  Share2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore, type MessageItem } from '@/lib/store';
import { apiGet, apiPost } from '@/lib/api-client';
import { toast } from 'sonner';
import ChatMessage from './chat-message';
import ChatInput from './chat-input';

const SUGGESTED_PROMPTS = [
  {
    icon: Lightbulb,
    title: 'Explain a concept',
    prompt: 'Explain quantum computing in simple terms with an everyday analogy.',
    accent: 'text-amber-400',
  },
  {
    icon: Code2,
    title: 'Write some code',
    prompt: 'Write a Python script that scrapes headlines from a news website and saves them to JSON.',
    accent: 'text-cyan-400',
  },
  {
    icon: ListChecks,
    title: 'Plan something',
    prompt: 'Help me plan a 7-day trip to Japan with a daily itinerary and budget breakdown.',
    accent: 'text-emerald-400',
  },
  {
    icon: ScrollText,
    title: 'Draft a document',
    prompt: 'Draft a professional email to introduce a new product to prospective clients.',
    accent: 'text-rose-400',
  },
];

export default function ChatView() {
  const {
    activeChatId,
    messages,
    setMessages,
    appendMessage,
    updateMessage,
    appendDelta,
    isStreaming,
    setIsStreaming,
    abortController,
    setAbortController,
    selectedModel,
    modelParams,
    activeOrganizationId,
    upsertChat,
    setActiveChatId,
    availableModels,
    addTokens,
    addCost,
    locale,
  } = useAppStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const streamingMessageIdRef = useRef<string | null>(null);

  // Load messages when chat changes
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    apiGet<MessageItem[]>(`/api/v1/chats/${activeChatId}/messages`, { limit: 100, sortBy: 'createdAt', sortOrder: 'asc' })
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setMessages(res.data);
        } else {
          setMessages([]);
        }
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [activeChatId, setMessages]);

  // Auto-scroll on new messages / streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!activeOrganizationId) {
        toast.error('No active organization. Please reload the page.');
        return;
      }

      // Ensure we have a chat
      let chatId = activeChatId;
      if (!chatId) {
        try {
          const res = await apiPost<{ id: string; title: string }>('/api/v1/chats', {
            title: content.slice(0, 60) || 'New Chat',
            organizationId: activeOrganizationId,
            providerType: null,
            modelId: selectedModel === 'auto' ? null : selectedModel,
            modelParams,
          });
          if (res.success && res.data) {
            chatId = res.data.id;
            upsertChat(res.data as any);
            setActiveChatId(chatId);
          } else {
            toast.error(res.error || 'Failed to create chat');
            return;
          }
        } catch {
          toast.error('Failed to create chat');
          return;
        }
      } else {
        // Update model params on existing chat
        try {
          await apiPost(`/api/v1/chats/${chatId}/share`, {
            modelId: selectedModel === 'auto' ? null : selectedModel,
            modelParams,
          }).catch(() => {});
        } catch {
          /* no-op */
        }
      }

      // Optimistic user message
      const optimisticUser: MessageItem = {
        id: `temp-user-${Date.now()}`,
        role: 'user',
        content,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      };
      appendMessage(optimisticUser);

      // Create placeholder assistant message
      const assistantId = `temp-assistant-${Date.now()}`;
      const optimisticAssistant: MessageItem = {
        id: assistantId,
        role: 'assistant',
        content: '',
        status: 'STREAMING',
        model: selectedModel === 'auto' ? null : selectedModel,
        createdAt: new Date().toISOString(),
      };
      appendMessage(optimisticAssistant);
      streamingMessageIdRef.current = assistantId;

      // Stream
      const controller = new AbortController();
      setAbortController(controller);
      setIsStreaming(true);

      try {
        const token = useAppStore.getState().token;
        const res = await fetch(`/api/v1/chats/${chatId}/stream?XTransformPort=3000`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content,
            model: selectedModel,
            modelParams,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalContent = '';
        let userMessageId = '';
        let assistantPersistedId = '';

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const json = trimmed.slice(5).trim();
            if (!json) continue;
            try {
              const data = JSON.parse(json);
              if (data.error) {
                updateMessage(assistantId, {
                  status: 'FAILED',
                  content: finalContent || `Error: ${data.error}`,
                });
                toast.error(data.error);
                continue;
              }
              if (data.delta) {
                finalContent += data.delta;
                appendDelta(assistantId, data.delta);
              }
              if (data.userMessageId) userMessageId = data.userMessageId;
              if (data.messageId) assistantPersistedId = data.messageId;
              if (data.done) {
                if (data.content) finalContent = data.content;
              }
            } catch {
              /* skip malformed chunk */
            }
          }
        }

        // Replace optimistic IDs with real ones from the server
        updateMessage(assistantId, {
          status: 'COMPLETED',
          content: finalContent,
          id: assistantPersistedId || assistantId,
        });
        if (optimisticUser.id.startsWith('temp-') && userMessageId) {
          updateMessage(optimisticUser.id, { id: userMessageId });
        }

        // Estimate cost
        const model = availableModels.find((m) => m.id === selectedModel);
        if (model?.pricing) {
          const tokensIn = Math.ceil(content.length / 4);
          const tokensOut = Math.ceil(finalContent.length / 4);
          addTokens(tokensIn + tokensOut);
          const cost =
            (tokensIn / 1_000_000) * (model.pricing.input ?? 0) +
            (tokensOut / 1_000_000) * (model.pricing.output ?? 0);
          addCost(cost);
        } else {
          addTokens(Math.ceil((content.length + finalContent.length) / 4));
        }

        // Refresh chat list to update timestamps / counts
        apiGet('/api/v1/chats', { limit: 30 }).then((r) => {
          if (r.success && Array.isArray(r.data)) {
            useAppStore.getState().setChats(r.data as any);
          }
        });
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          updateMessage(assistantId, { status: 'COMPLETED' });
          toast.info('Generation stopped');
        } else {
          updateMessage(assistantId, {
            status: 'FAILED',
            content: 'Failed to get response. Please try again.',
          });
          toast.error('Streaming failed. Please try again.');
        }
      } finally {
        setIsStreaming(false);
        setAbortController(null);
        streamingMessageIdRef.current = null;
      }
    },
    [activeChatId, activeOrganizationId, appendDelta, appendMessage, selectedModel, modelParams, updateMessage, upsertChat, setActiveChatId, setIsStreaming, setAbortController, availableModels, addTokens, addCost]
  );

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleRetry = async () => {
    // Find last user message and resend
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      // Remove last assistant message
      const lastAssistantIdx = [...messages].reverse().findIndex((m) => m.role === 'assistant');
      if (lastAssistantIdx >= 0) {
        const realIdx = messages.length - 1 - lastAssistantIdx;
        const newMessages = [...messages];
        newMessages.splice(realIdx, 1);
        setMessages(newMessages);
      }
      await handleSend(lastUser.content);
    }
  };

  const handleBranch = async () => {
    if (!activeChatId) return;
    try {
      const res = await apiPost<{ id: string }>(`/api/v1/chats/${activeChatId}/branch`);
      if (res.success && res.data) {
        toast.success('Branched conversation created');
        apiGet('/api/v1/chats', { limit: 30 }).then((r) => {
          if (r.success && Array.isArray(r.data)) {
            useAppStore.getState().setChats(r.data as any);
          }
        });
        setActiveChatId(res.data.id);
      } else {
        toast.error(res.error || 'Failed to branch chat');
      }
    } catch {
      toast.error('Failed to branch chat');
    }
  };

  const handleEdit = async (newContent: string) => {
    await handleSend(newContent);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat header bar */}
      {activeChatId && (
        <div className="h-10 shrink-0 border-b border-border/60 px-4 flex items-center gap-2 bg-background/60 backdrop-blur-md">
          <Badge variant="outline" className="h-5 text-[10px] font-mono">
            {messages.length} messages
          </Badge>
          <div className="ml-auto flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={async () => {
                      try {
                        const res = await apiPost<{ url?: string }>(`/api/v1/chats/${activeChatId}/share`);
                        if (res.success) {
                          await navigator.clipboard.writeText(window.location.origin + (res.data?.url || ''));
                          toast.success('Share link copied');
                        } else {
                          toast.error(res.error || 'Failed to share');
                        }
                      } catch {
                        toast.error('Failed to share');
                      }
                    }}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share chat</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleBranch}>
                    <GitBranch className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Branch this chat</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}

      {/* Messages / empty state */}
      {!activeChatId || (messages.length === 0 && !loading) ? (
        <EmptyState onPick={handleSend} locale={locale} />
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-3xl mx-auto py-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="h-8 w-8 rounded-full border-2 border-brand/30 border-t-brand animate-spin mb-3" />
                <span className="text-sm">Loading messages…</span>
              </div>
            ) : (
              messages.map((m, i) => (
                <ChatMessage
                  key={m.id}
                  message={m}
                  isLast={i === messages.length - 1}
                  onRetry={m.role === 'assistant' ? handleRetry : undefined}
                  onBranch={m.role === 'user' ? handleBranch : undefined}
                  onEdit={m.role === 'user' ? handleEdit : undefined}
                />
              ))
            )}
          </div>
        </div>
      )}

      <ChatInput onSend={handleSend} onStop={handleStop} />
    </div>
  );
}

function EmptyState({
  onPick,
  locale,
}: {
  onPick: (prompt: string) => void;
  locale: 'en' | 'ar';
}) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto px-4 py-12 flex flex-col items-center">
        <div className="h-16 w-16 rounded-2xl bg-brand-gradient flex items-center justify-center text-white shadow-lg mb-5">
          <Sparkles className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold text-gradient-brand mb-2">
          {locale === 'ar' ? 'كيف يمكنني مساعدتك اليوم؟' : 'How can I help you today?'}
        </h1>
        <p className="text-muted-foreground text-sm mb-8 text-center max-w-md">
          {locale === 'ar'
            ? 'اسأل أي شيء — يمكنني كتابة الأكواد، تحليل البيانات، شرح المفاهيم، والمزيد.'
            : 'Ask anything — I can write code, analyze data, explain concepts, and more.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
          {SUGGESTED_PROMPTS.map((s, i) => (
            <button
              key={i}
              onClick={() => onPick(s.prompt)}
              className="group text-left rounded-xl border border-border bg-card hover:border-brand/40 hover:bg-accent/40 transition p-4"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={cn('h-7 w-7 rounded-md bg-muted/60 flex items-center justify-center', s.accent)}>
                  <s.icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold">{s.title}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground/80 transition">
                {s.prompt}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
