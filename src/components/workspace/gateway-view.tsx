'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Cpu,
  DollarSign,
  Gauge,
  Server,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/lib/store';
import { apiGet } from '@/lib/api-client';

interface ProviderInfo {
  type: string;
  name: string;
  isAvailable: boolean;
}

interface ModelBrief {
  provider: string;
  externalId: string;
  displayName: string;
  contextWindow?: number;
  supportsStreaming?: boolean;
  status?: string;
}

export default function GatewayView() {
  const { availableModels, setAvailableModels } = useAppStore();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [providersRes, modelsRes] = await Promise.all([
        apiGet<{ providers: ProviderInfo[]; models: ModelBrief[] }>('/api/v1/ai/providers'),
        apiGet<{ models: ModelBrief[]; total: number }>('/api/v1/ai/models'),
      ]);
      if (providersRes.success && providersRes.data?.providers) {
        setProviders(providersRes.data.providers);
      }
      if (modelsRes.success && modelsRes.data?.models) {
        setAvailableModels(
          modelsRes.data.models.map((m) => ({
            id: m.externalId,
            provider: m.provider,
            displayName: m.displayName,
            contextWindow: m.contextWindow,
            supportsStreaming: m.supportsStreaming,
            status: m.status,
          }))
        );
      }
      setLoading(false);
    })();
  }, [setAvailableModels]);

  // Group models by provider
  const grouped = availableModels.reduce<Record<string, typeof availableModels>>((acc, m) => {
    (acc[m.provider] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="h-14 shrink-0 border-b border-border flex items-center gap-3 px-4">
        <h2 className="text-lg font-semibold">AI Gateway</h2>
        <Badge variant="outline" className="h-5 border-brand/30 text-brand bg-brand/10">
          {providers.length} providers
        </Badge>
        <Badge variant="outline" className="h-5">
          {availableModels.length} models
        </Badge>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-4 space-y-4 max-w-5xl mx-auto">
          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatBox icon={Server} label="Providers" value={providers.length} accent="text-cyan-400" />
            <StatBox icon={Cpu} label="Models" value={availableModels.length} accent="text-emerald-400" />
            <StatBox icon={Zap} label="Streaming" value="Enabled" accent="text-amber-400" />
            <StatBox icon={Gauge} label="Avg latency" value="—" accent="text-violet-400" />
          </div>

          {/* Providers grid */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Server className="h-4 w-4 text-brand" />
                Providers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-6 text-muted-foreground text-sm">Loading providers…</div>
              ) : providers.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">No providers configured.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {providers.map((p) => (
                    <div
                      key={p.type}
                      className="rounded-lg border border-border bg-card/50 p-3 flex items-center gap-2"
                    >
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          p.isAvailable ? 'bg-emerald-400' : 'bg-muted-foreground'
                        )}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{p.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase">{p.type}</div>
                      </div>
                      {p.isAvailable && (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400 ml-auto shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Models grouped by provider */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Cpu className="h-4 w-4 text-brand" />
                Models by Provider
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(grouped).map(([provider, models]) => (
                <div key={provider}>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {provider.replace(/_/g, ' ')}
                    </h4>
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">{models.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {models.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-lg border border-border bg-card/50 p-3 hover:border-brand/40 transition"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate flex-1">{m.displayName}</span>
                          {m.supportsStreaming && (
                            <Badge variant="outline" className="h-4 px-1 text-[9px] border-brand/30 text-brand bg-brand/10">
                              <Zap className="h-2 w-2 mr-0.5" />stream
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono truncate">{m.id}</div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          {m.contextWindow && (
                            <span>
                              {m.contextWindow >= 1000
                                ? `${Math.round(m.contextWindow / 1000)}K`
                                : m.contextWindow}{' '}
                              ctx
                            </span>
                          )}
                          {m.status && (
                            <>
                              <span>·</span>
                              <span className={cn(m.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400')}>
                                {m.status}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {availableModels.length === 0 && !loading && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  No models loaded. Configure providers to enable AI chat.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Health */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand" />
                Gateway Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase">Status</div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="font-medium">Operational</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase">Smart router</div>
                  <div className="font-medium">Active</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase">Fallback</div>
                  <div className="font-medium">Enabled</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase">Retry</div>
                  <div className="font-medium">3 attempts</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
      <div className={cn('h-9 w-9 rounded-md bg-muted/60 flex items-center justify-center', accent)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}
