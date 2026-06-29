'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Clock,
  Code2,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  FileText,
  Hash,
  PanelRightClose,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';
import { apiGet, formatCost, formatNumber } from '@/lib/api-client';
import { toast } from 'sonner';

interface ArtifactItem {
  id: string;
  title: string;
  artifactType: string;
  content: string;
  language?: string | null;
  chatId?: string | null;
  createdAt: string;
  project?: { id: string; name: string } | null;
  chat?: { id: string; title: string } | null;
}

export default function RightPanel() {
  const {
    rightPanelOpen,
    setRightPanelOpen,
    activeChatId,
    activeView,
    selectedModel,
    availableModels,
    totalTokens,
    totalCost,
    isStreaming,
    messages,
    modelParams,
  } = useAppStore();

  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
  const [loadingArtifacts, setLoadingArtifacts] = useState(false);

  useEffect(() => {
    if (!activeChatId || !rightPanelOpen) return;
    setLoadingArtifacts(true);
    apiGet<ArtifactItem[]>('/api/v1/artifacts', { chatId: activeChatId, limit: 20 })
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setArtifacts(res.data);
        } else {
          setArtifacts([]);
        }
      })
      .catch(() => setArtifacts([]))
      .finally(() => setLoadingArtifacts(false));
  }, [activeChatId, rightPanelOpen, messages.length]);

  if (!rightPanelOpen) return null;

  const currentModel = availableModels.find((m) => m.id === selectedModel);
  const chatMessages = messages;
  const totalChatTokens = chatMessages.reduce(
    (acc, m) => acc + (m.tokensIn || 0) + (m.tokensOut || 0),
    0
  );
  const userMsgs = chatMessages.filter((m) => m.role === 'user').length;
  const assistantMsgs = chatMessages.filter((m) => m.role === 'assistant').length;

  return (
    <aside className="w-[320px] shrink-0 bg-sidebar/60 border-l border-border flex flex-col h-full glass">
      <div className="h-12 shrink-0 border-b border-border/60 flex items-center justify-between px-3">
        <span className="text-sm font-semibold">Context</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setRightPanelOpen(false)}
        >
          <PanelRightClose className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-3 my-2 grid grid-cols-3 bg-muted/50">
          <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
          <TabsTrigger value="artifacts" className="text-xs">
            Artifacts
            {artifacts.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                {artifacts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stats" className="text-xs">Stats</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 scrollbar-thin">
          <TabsContent value="info" className="m-0 p-3 space-y-3">
            <InfoCard label="Active Model">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-brand-gradient flex items-center justify-center text-white shrink-0">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {selectedModel === 'auto' ? 'Auto-routing' : currentModel?.displayName || selectedModel}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {selectedModel === 'auto' ? 'Smart model selection' : currentModel?.provider}
                  </div>
                </div>
              </div>
            </InfoCard>

            <InfoCard label="Model Parameters">
              <div className="grid grid-cols-3 gap-2 text-center">
                <ParamPill label="Temp" value={modelParams.temperature.toFixed(2)} />
                <ParamPill label="Top P" value={modelParams.topP.toFixed(2)} />
                <ParamPill label="Max" value={formatNumber(modelParams.maxTokens)} />
              </div>
            </InfoCard>

            {currentModel && (
              <InfoCard label="Capabilities">
                <div className="flex flex-wrap gap-1.5">
                  {currentModel.supportsStreaming && <CapabilityPill icon={Zap} label="Streaming" />}
                  {currentModel.supportsVision && <CapabilityPill icon={Activity} label="Vision" />}
                  {currentModel.supportsToolCalling && <CapabilityPill icon={Code2} label="Tools" />}
                  {currentModel.supportsJsonMode && <CapabilityPill icon={Hash} label="JSON" />}
                  {currentModel.supportsThinking && <CapabilityPill icon={Sparkles} label="Reasoning" />}
                </div>
                {currentModel.contextWindow && (
                  <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatNumber(currentModel.contextWindow)} context window
                  </div>
                )}
              </InfoCard>
            )}

            <InfoCard label="Current Chat">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Messages</span>
                  <span className="font-medium">{chatMessages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User</span>
                  <span className="font-medium">{userMsgs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assistant</span>
                  <span className="font-medium">{assistantMsgs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chat tokens</span>
                  <span className="font-medium">{formatNumber(totalChatTokens)}</span>
                </div>
              </div>
            </InfoCard>

            <InfoCard label="Project Context">
              <div className="text-xs text-muted-foreground py-2">
                No project linked. Attach a project to enable scoped memory and resources.
              </div>
              <Button variant="outline" size="sm" className="w-full h-7 text-xs">
                <ExternalLink className="h-3 w-3 mr-1" />
                Attach Project
              </Button>
            </InfoCard>
          </TabsContent>

          <TabsContent value="artifacts" className="m-0 p-3 space-y-2">
            {loadingArtifacts ? (
              <div className="text-xs text-muted-foreground text-center py-6">Loading artifacts...</div>
            ) : artifacts.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No artifacts yet</p>
                <p className="text-xs text-muted-foreground mt-1 px-4">
                  Generated code, charts, and documents from this chat will appear here.
                </p>
              </div>
            ) : (
              artifacts.map((art) => (
                <ArtifactCard key={art.id} artifact={art} />
              ))
            )}
          </TabsContent>

          <TabsContent value="stats" className="m-0 p-3 space-y-3">
            <StatCard
              icon={Zap}
              label="Session tokens"
              value={formatNumber(totalTokens)}
              accent="text-cyan-400"
            />
            <StatCard
              icon={DollarSign}
              label="Session cost"
              value={formatCost(totalCost)}
              accent="text-emerald-400"
            />
            <StatCard
              icon={TrendingUp}
              label="Streaming"
              value={isStreaming ? 'Active' : 'Idle'}
              accent={isStreaming ? 'text-amber-400' : 'text-muted-foreground'}
            />
            <StatCard
              icon={Activity}
              label="Connection"
              value="Connected"
              accent="text-emerald-400"
            />
            <div className="text-[10px] text-muted-foreground text-center pt-2">
              Stats reset when you reload the page.
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}

function ParamPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/60 border border-border/60 py-1.5">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-mono font-medium">{value}</div>
    </div>
  );
}

function CapabilityPill({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 text-[10px] font-medium">
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3 flex items-center gap-3">
      <div className={cn('h-9 w-9 rounded-md bg-muted/60 flex items-center justify-center', accent)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}

function ArtifactCard({ artifact }: { artifact: ArtifactItem }) {
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.content);
      toast.success('Copied to clipboard');
    } catch {
      /* no-op */
    }
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-accent/30 transition"
      >
        <FileText className="h-3.5 w-3.5 text-brand shrink-0" />
        <span className="text-xs font-medium truncate flex-1">{artifact.title}</span>
        <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
          {artifact.artifactType}
        </Badge>
      </button>
      {expanded && (
        <div className="border-t border-border/60">
          <pre className="text-[11px] p-2 max-h-[180px] overflow-auto scrollbar-thin bg-muted/30 font-mono">
            {artifact.content.slice(0, 2000)}
            {artifact.content.length > 2000 ? '\n…' : ''}
          </pre>
          <div className="flex items-center gap-1 px-2 py-1.5 border-t border-border/60">
            <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={handleCopy}>
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px]"
              onClick={() => {
                const blob = new Blob([artifact.content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${artifact.title || 'artifact'}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
