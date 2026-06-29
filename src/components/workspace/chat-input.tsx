'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  AtSign,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Send,
  Settings2,
  Square,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAppStore } from '@/lib/store';
import ModelSelector from './model-selector';
import { estimateTokens } from '@/lib/api-client';

interface ChatInputProps {
  onSend: (content: string) => void;
  onStop: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSend, onStop, disabled, placeholder }: ChatInputProps) {
  const { isStreaming, modelParams, setModelParams, selectedModel, locale } = useAppStore();
  const [value, setValue] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<{ name: string; size: number }[]>([]);

  // Auto-resize textarea
  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
  }, [value]);

  const tokenEstimate = estimateTokens(value);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setValue('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      setAttachments((prev) => [...prev, { name: f.name, size: f.size }]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="px-4 py-3 border-t border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-3xl mx-auto">
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted border border-border text-xs"
              >
                <Paperclip className="h-3 w-3 text-brand" />
                <span className="truncate max-w-[140px]">{a.name}</span>
                <button
                  onClick={() => removeAttachment(i)}
                  className="h-4 w-4 flex items-center justify-center rounded hover:bg-accent"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input box */}
        <div className="relative rounded-2xl border border-border bg-card focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10 transition">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || (locale === 'ar' ? 'اكتب رسالتك إلى معتز AI...' : 'Send a message to Moataz AI...')}
            rows={1}
            disabled={disabled}
            className="w-full resize-none bg-transparent px-4 py-3 pr-3 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/60 max-h-[240px] scrollbar-thin"
          />

          {/* Bottom toolbar */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-t border-border/60">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
              <AtSign className="h-4 w-4" />
            </Button>

            <ModelSelector variant="compact" />

            <Popover open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-3 glass border-border/60 shadow-xl">
                <div className="space-y-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Model parameters
                  </div>
                  <ParamSlider
                    label="Temperature"
                    value={modelParams.temperature}
                    min={0}
                    max={2}
                    step={0.05}
                    onChange={(v) => setModelParams({ temperature: v })}
                    hint="Controls randomness. Lower = focused, higher = creative."
                  />
                  <ParamSlider
                    label="Top P"
                    value={modelParams.topP}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(v) => setModelParams({ topP: v })}
                    hint="Nucleus sampling — limits token pool by cumulative probability."
                  />
                  <ParamSlider
                    label="Max tokens"
                    value={modelParams.maxTokens}
                    min={256}
                    max={32768}
                    step={256}
                    onChange={(v) => setModelParams({ maxTokens: v })}
                    hint="Maximum output tokens to generate."
                    integer
                  />
                  <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                    Active model: <span className="font-mono">{selectedModel}</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-mono hidden sm:block">
                ~{tokenEstimate} tok
              </span>
              {isStreaming ? (
                <Button
                  size="icon"
                  className="h-8 w-8 bg-destructive hover:bg-destructive/90 text-white"
                  onClick={onStop}
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  className="h-8 w-8 bg-brand-gradient hover:opacity-90 text-white"
                  onClick={handleSubmit}
                  disabled={!value.trim() || disabled}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Hint */}
        <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-muted-foreground">
          <span>
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border/60 font-mono">Enter</kbd> to send
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border/60 font-mono">Shift+Enter</kbd> for newline
          </span>
          <span className="hidden sm:inline">
            <kbd className="px-1 py-0.5 rounded bg-muted border border-border/60 font-mono">⌘K</kbd> command palette
          </span>
        </div>
      </div>
    </div>
  );
}

function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  hint,
  integer,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  hint?: string;
  integer?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-brand">{integer ? value : value.toFixed(2)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
      />
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
