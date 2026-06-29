'use client';

import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, Cpu, Eye, GitBranch, Search, Sparkles, Wrench, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore, type ModelInfo } from '@/lib/store';
import { modelPricingLabel } from '@/lib/api-client';

interface ModelSelectorProps {
  value?: string;
  onChange?: (modelId: string) => void;
  variant?: 'default' | 'compact' | 'ghost';
  className?: string;
  align?: 'start' | 'center' | 'end';
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google',
  deepseek: 'DeepSeek',
  groq: 'Groq',
  mistral: 'Mistral',
  ollama: 'Ollama',
  cohere: 'Cohere',
  huggingface: 'Hugging Face',
  azure_openai: 'Azure',
  openrouter: 'OpenRouter',
  nvidia_nim: 'NVIDIA',
  custom: 'Custom',
};

function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] || provider.replace(/_/g, ' ');
}

function providerColor(provider: string): string {
  const colors: Record<string, string> = {
    openai: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    anthropic: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    gemini: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    deepseek: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    groq: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    mistral: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    ollama: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
    cohere: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
    openrouter: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    huggingface: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  };
  return colors[provider] || 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
}

function ModelRow({
  model,
  selected,
  onSelect,
}: {
  model: ModelInfo;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(model.id)}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded-md hover:bg-accent/70 transition-colors group flex items-start gap-3',
        selected && 'bg-accent'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-foreground truncate">{model.displayName}</span>
          <Badge variant="outline" className={cn('h-4 px-1.5 text-[10px] font-medium border', providerColor(model.provider))}>
            {providerLabel(model.provider)}
          </Badge>
        </div>
        {model.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{model.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[10px] text-muted-foreground">
          {model.contextWindow && (
            <span className="flex items-center gap-0.5">
              <Cpu className="h-3 w-3" />
              {model.contextWindow >= 1000 ? `${Math.round(model.contextWindow / 1000)}K` : model.contextWindow} ctx
            </span>
          )}
          {model.supportsVision && (
            <span className="flex items-center gap-0.5" title="Vision">
              <Eye className="h-3 w-3" />
            </span>
          )}
          {model.supportsToolCalling && (
            <span className="flex items-center gap-0.5" title="Tool calling">
              <Wrench className="h-3 w-3" />
            </span>
          )}
          {model.supportsThinking && (
            <span className="flex items-center gap-0.5" title="Reasoning / thinking">
              <Sparkles className="h-3 w-3" />
            </span>
          )}
          {model.supportsStreaming && (
            <span className="flex items-center gap-0.5" title="Streaming">
              <Zap className="h-3 w-3" />
            </span>
          )}
          <span className="ml-auto opacity-70">{modelPricingLabel(model.pricing)}</span>
        </div>
      </div>
      {selected && <Check className="h-4 w-4 text-brand shrink-0 mt-1" />}
    </button>
  );
}

export default function ModelSelector({
  value,
  onChange,
  variant = 'default',
  className,
  align = 'end',
}: ModelSelectorProps) {
  const { availableModels, selectedModel, setSelectedModel } = useAppStore();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const current = value ?? selectedModel;

  const grouped = useMemo(() => {
    const filtered = availableModels.filter((m) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        m.displayName.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q)
      );
    });
    const groups: Record<string, ModelInfo[]> = {};
    for (const m of filtered) {
      (groups[m.provider] ??= []).push(m);
    }
    return groups;
  }, [availableModels, search]);

  const currentModel = availableModels.find((m) => m.id === current);

  const handleChange = (id: string) => {
    if (onChange) onChange(id);
    else setSelectedModel(id);
    setOpen(false);
    setSearch('');
  };

  const trigger = () => {
    if (variant === 'compact') {
      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs font-medium hover:bg-accent"
        >
          <span className="max-w-[120px] truncate">
            {current === 'auto' ? 'Auto' : currentModel?.displayName || current}
          </span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      );
    }
    if (variant === 'ghost') {
      return (
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-accent transition text-sm"
        >
          <span className="font-medium truncate max-w-[160px]">
            {current === 'auto' ? 'Auto' : currentModel?.displayName || current}
          </span>
          {currentModel && (
            <Badge variant="outline" className={cn('h-4 px-1.5 text-[10px] border', providerColor(currentModel.provider))}>
              {providerLabel(currentModel.provider)}
            </Badge>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      );
    }
    return (
      <Button variant="outline" className="justify-between gap-2 h-9 min-w-[200px]">
        <div className="flex items-center gap-2 min-w-0">
          <Cpu className="h-4 w-4 text-brand shrink-0" />
          <span className="truncate text-sm font-medium">
            {current === 'auto' ? 'Auto-routing' : currentModel?.displayName || current}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 opacity-60 shrink-0" />
      </Button>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn('inline-flex', className)}>{trigger()}</div>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-[360px] p-0 glass border-border/60 shadow-2xl"
        sideOffset={6}
      >
        <div className="p-2 border-b border-border/60">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models..."
              className="pl-8 h-9 bg-background/50 border-0 focus-visible:ring-1 focus-visible:ring-brand/40"
            />
          </div>
        </div>
        <ScrollArea className="h-[340px]">
          <div className="p-2 space-y-3">
            <button
              type="button"
              onClick={() => handleChange('auto')}
              className={cn(
                'w-full text-left px-3 py-2.5 rounded-md hover:bg-accent/70 transition-colors flex items-center gap-3',
                current === 'auto' && 'bg-accent'
              )}
            >
              <div className="h-8 w-8 rounded-md bg-brand-gradient flex items-center justify-center text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Auto</span>
                  <Badge variant="outline" className="h-4 px-1.5 text-[10px] border-brand/30 text-brand bg-brand/10">
                    Smart routing
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pick the best model automatically based on prompt.
                </p>
              </div>
              {current === 'auto' && <Check className="h-4 w-4 text-brand shrink-0" />}
            </button>

            {Object.entries(grouped).map(([provider, models]) => (
              <div key={provider} className="space-y-1">
                <div className="flex items-center gap-2 px-2 pt-1 pb-0.5">
                  <Badge variant="outline" className={cn('h-4 px-1.5 text-[10px] border', providerColor(provider))}>
                    {providerLabel(provider)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{models.length} models</span>
                </div>
                {models.map((m) => (
                  <ModelRow
                    key={m.id}
                    model={m}
                    selected={m.id === current}
                    onSelect={handleChange}
                  />
                ))}
              </div>
            ))}

            {availableModels.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <GitBranch className="h-6 w-6 mx-auto mb-2 opacity-40" />
                No models available.
                <div className="text-xs mt-1 opacity-70">Configure providers in AI Gateway.</div>
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
