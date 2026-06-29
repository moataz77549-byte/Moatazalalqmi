'use client';

import React from 'react';
import { Activity, Cpu, DollarSign, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { formatCost, formatNumber } from '@/lib/api-client';

export default function StatusBar() {
  const {
    isStreaming,
    selectedModel,
    availableModels,
    totalTokens,
    totalCost,
    modelParams,
  } = useAppStore();

  const currentModel = availableModels.find((m) => m.id === selectedModel);
  const modelName = selectedModel === 'auto' ? 'Auto-routing' : currentModel?.displayName || selectedModel;

  return (
    <footer className="h-7 shrink-0 border-t border-border bg-background/80 backdrop-blur-md px-3 flex items-center gap-4 text-[11px] text-muted-foreground z-20">
      {/* Connection status */}
      <div className="flex items-center gap-1.5">
        <span className={cn('h-1.5 w-1.5 rounded-full', isStreaming ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400')} />
        <span>{isStreaming ? 'Streaming' : 'Connected'}</span>
      </div>

      <div className="h-3 w-px bg-border" />

      {/* Model */}
      <div className="flex items-center gap-1.5">
        <Cpu className="h-3 w-3" />
        <span className="truncate max-w-[180px]">{modelName}</span>
      </div>

      <div className="h-3 w-px bg-border" />

      {/* Params */}
      <div className="hidden sm:flex items-center gap-1.5">
        <Activity className="h-3 w-3" />
        <span className="font-mono">T={modelParams.temperature.toFixed(2)}</span>
        <span className="opacity-50">·</span>
        <span className="font-mono">P={modelParams.topP.toFixed(2)}</span>
        <span className="opacity-50">·</span>
        <span className="font-mono">M={formatNumber(modelParams.maxTokens)}</span>
      </div>

      <div className="h-3 w-px bg-border hidden sm:block" />

      {/* Token count */}
      <div className="flex items-center gap-1.5">
        <Zap className="h-3 w-3 text-cyan-400" />
        <span className="font-mono">{formatNumber(totalTokens)} tokens</span>
      </div>

      <div className="h-3 w-px bg-border" />

      {/* Cost */}
      <div className="flex items-center gap-1.5">
        <DollarSign className="h-3 w-3 text-emerald-400" />
        <span className="font-mono">{formatCost(totalCost)}</span>
      </div>

      {/* Spacer + version */}
      <div className="ml-auto flex items-center gap-2">
        <span className="opacity-50">Moataz AI</span>
        <span className="opacity-50">·</span>
        <span>v1.0</span>
      </div>
    </footer>
  );
}
