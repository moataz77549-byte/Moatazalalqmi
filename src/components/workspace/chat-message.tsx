'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Branch,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit3,
  GitBranch,
  MoreHorizontal,
  RefreshCw,
  Smile,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore, type MessageItem } from '@/lib/store';
import { formatRelativeTime } from '@/lib/api-client';
import Markdown from './markdown';
import { toast } from 'sonner';

interface ChatMessageProps {
  message: MessageItem;
  onRetry?: () => void;
  onBranch?: () => void;
  onEdit?: (newContent: string) => void;
  isLast?: boolean;
}

export default function ChatMessage({ message, onRetry, onBranch, onEdit, isLast }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.status === 'STREAMING';
  const isFailed = message.status === 'FAILED';
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const editRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.style.height = 'auto';
      editRef.current.style.height = `${editRef.current.scrollHeight}px`;
    }
  }, [editing]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* no-op */
    }
  };

  const handleSaveEdit = () => {
    setEditing(false);
    if (onEdit && editValue.trim() !== message.content.trim()) {
      onEdit(editValue.trim());
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-3 group animate-fade-in-up">
        <div className="max-w-[80%] flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>You</span>
            <span>·</span>
            <span>{formatRelativeTime(message.createdAt)}</span>
          </div>
          {editing ? (
            <div className="w-full min-w-[280px] space-y-2">
              <textarea
                ref={editRef}
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                className="w-full rounded-lg border border-brand/40 bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/30"
                rows={2}
              />
              <div className="flex items-center justify-end gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditing(false); setEditValue(message.content); }}>
                  Cancel
                </Button>
                <Button size="sm" className="h-7 text-xs bg-brand-gradient text-white" onClick={handleSaveEdit}>
                  Save & Send
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl rounded-tr-md bg-brand-gradient text-white px-4 py-2.5 text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
              <Edit3 className="h-3.5 w-3.5" />
            </Button>
            {onBranch && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onBranch}>
                <GitBranch className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 group animate-fade-in-up">
      <div className="flex gap-3 max-w-full">
        {/* Avatar */}
        <div className="h-8 w-8 rounded-md bg-brand-gradient flex items-center justify-center text-white shrink-0 mt-0.5">
          <Sparkles className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Header */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Moataz AI</span>
            {message.model && (
              <>
                <span>·</span>
                <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-mono">
                  {message.model}
                </Badge>
              </>
            )}
            <span>·</span>
            <span>{formatRelativeTime(message.createdAt)}</span>
            {isStreaming && (
              <>
                <span>·</span>
                <span className="text-brand animate-pulse">streaming…</span>
              </>
            )}
            {isFailed && (
              <>
                <span>·</span>
                <span className="text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  failed
                </span>
              </>
            )}
            {(message.tokensIn || message.tokensOut) && !isStreaming && (
              <>
                <span>·</span>
                <span className="font-mono">
                  {message.tokensIn || 0}↑ {message.tokensOut || 0}↓
                </span>
              </>
            )}
          </div>

          {/* Body */}
          {editing ? (
            <div className="space-y-2">
              <textarea
                ref={editRef}
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                className="w-full rounded-lg border border-brand/40 bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand/30"
                rows={4}
              />
              <div className="flex items-center justify-end gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditing(false); setEditValue(message.content); }}>
                  Cancel
                </Button>
                <Button size="sm" className="h-7 text-xs bg-brand-gradient text-white" onClick={handleSaveEdit}>
                  Save
                </Button>
              </div>
            </div>
          ) : message.content ? (
            <div className={cn(isStreaming && 'streaming-cursor')}>
              <Markdown content={message.content} />
            </div>
          ) : isStreaming ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-brand/60 animate-pulse" />
                <span className="h-2 w-2 rounded-full bg-brand/60 animate-pulse [animation-delay:200ms]" />
                <span className="h-2 w-2 rounded-full bg-brand/60 animate-pulse [animation-delay:400ms]" />
              </div>
              <span className="text-xs">Thinking…</span>
            </div>
          ) : isFailed ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {message.content || 'This message failed to generate.'}
            </div>
          ) : null}

          {/* Actions */}
          {!isStreaming && !editing && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition pt-1">
              <ActionBtn icon={copied ? Check : Copy} label={copied ? 'Copied' : 'Copy'} onClick={handleCopy} active={copied} />
              {onRetry && isLast && (
                <ActionBtn icon={RefreshCw} label="Retry" onClick={onRetry} />
              )}
              {onBranch && <ActionBtn icon={GitBranch} label="Branch" onClick={onBranch} />}
              <ActionBtn icon={Edit3} label="Edit" onClick={() => setEditing(true)} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent transition text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  <DropdownMenuItem onClick={() => toast.info('Reaction saved')}>
                    <ThumbsUp className="h-3.5 w-3.5 mr-2" />
                    Good response
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info('Feedback recorded')}>
                    <ThumbsDown className="h-3.5 w-3.5 mr-2" />
                    Needs improvement
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info('Reaction added')}>
                    <Smile className="h-3.5 w-3.5 mr-2" />
                    Add reaction
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => toast.info('Message deleted')}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              'h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent transition',
              active ? 'text-emerald-400' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
