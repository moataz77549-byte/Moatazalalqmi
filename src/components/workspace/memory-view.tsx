'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Brain,
  Clock,
  Star,
  Tag,
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  History,
  Sparkles,
  Wand2,
  GitBranch,
  Activity,
  Layers,
  AlertTriangle,
  RefreshCw,
  X,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';
import { apiDelete, apiGet, apiPost, formatRelativeTime } from '@/lib/api-client';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────
type MemoryScope = 'PERSONAL' | 'WORKSPACE' | 'PROJECT' | 'ORGANIZATION' | 'PINNED';
type MemoryType =
  | 'FACT'
  | 'PREFERENCE'
  | 'DECISION'
  | 'INSTRUCTION'
  | 'CONTEXT'
  | 'SUMMARY'
  | 'ENTITY';

interface MemoryItem {
  id: string;
  content: string;
  type: MemoryType;
  scope: MemoryScope;
  importance: number; // 0-1
  confidence: number; // 0-1
  tags: string[];
  source?: string | null;
  version?: number;
  accessCount?: number;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string | null;
  expiresAt?: string | null;
  isArchived?: boolean;
  permissions?: string[];
  projectId?: string | null;
  organizationId?: string | null;
}

// ─── Constants ────────────────────────────────────────
const SCOPE_META: Record<MemoryScope, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PERSONAL: { label: 'Personal', color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30', icon: Star },
  WORKSPACE: { label: 'Workspace', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', icon: Layers },
  PROJECT: { label: 'Project', color: 'text-violet-300 bg-violet-500/10 border-violet-500/30', icon: Filter },
  ORGANIZATION: { label: 'Organization', color: 'text-amber-300 bg-amber-500/10 border-amber-500/30', icon: Shield },
  PINNED: { label: 'Pinned', color: 'text-pink-300 bg-pink-500/10 border-pink-500/30', icon: Star },
};

const TYPE_META: Record<MemoryType, { label: string; color: string }> = {
  FACT: { label: 'Fact', color: 'text-cyan-300 bg-cyan-500/10' },
  PREFERENCE: { label: 'Preference', color: 'text-emerald-300 bg-emerald-500/10' },
  DECISION: { label: 'Decision', color: 'text-amber-300 bg-amber-500/10' },
  INSTRUCTION: { label: 'Instruction', color: 'text-rose-300 bg-rose-500/10' },
  CONTEXT: { label: 'Context', color: 'text-violet-300 bg-violet-500/10' },
  SUMMARY: { label: 'Summary', color: 'text-sky-300 bg-sky-500/10' },
  ENTITY: { label: 'Entity', color: 'text-teal-300 bg-teal-500/10' },
};

const SCOPES: MemoryScope[] = ['PERSONAL', 'WORKSPACE', 'PROJECT', 'ORGANIZATION', 'PINNED'];
const TYPES: MemoryType[] = ['FACT', 'PREFERENCE', 'DECISION', 'INSTRUCTION', 'CONTEXT', 'SUMMARY', 'ENTITY'];

// ─── Sample data fallback ─────────────────────────────
const SAMPLE_MEMORIES: MemoryItem[] = [
  {
    id: 'sample-1',
    content: 'User prefers concise answers with code examples. Avoid lengthy explanations unless explicitly requested.',
    type: 'PREFERENCE',
    scope: 'PERSONAL',
    importance: 0.85,
    confidence: 0.92,
    tags: ['communication', 'style'],
    source: 'inferred',
    version: 3,
    accessCount: 47,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    permissions: ['read', 'write'],
  },
  {
    id: 'sample-2',
    content: 'Project "Phoenix" uses Next.js 16 with App Router, Prisma ORM, and Tailwind CSS 4. Production deployment via Vercel.',
    type: 'CONTEXT',
    scope: 'PROJECT',
    importance: 0.9,
    confidence: 0.98,
    tags: ['tech-stack', 'phoenix', 'frontend'],
    source: 'chat:abc123',
    version: 1,
    accessCount: 23,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    permissions: ['read'],
  },
  {
    id: 'sample-3',
    content: 'Decided to migrate from REST to tRPC for type-safe internal APIs. Rollout scheduled for Q3.',
    type: 'DECISION',
    scope: 'ORGANIZATION',
    importance: 0.95,
    confidence: 0.88,
    tags: ['architecture', 'api', 'migration'],
    source: 'meeting:2024-03-15',
    version: 2,
    accessCount: 12,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    permissions: ['read'],
  },
  {
    id: 'sample-4',
    content: 'Always run `bun run lint` before committing. CI will reject any PR that fails linting.',
    type: 'INSTRUCTION',
    scope: 'WORKSPACE',
    importance: 0.7,
    confidence: 1.0,
    tags: ['workflow', 'ci'],
    source: 'manual',
    version: 1,
    accessCount: 89,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    permissions: ['read', 'write'],
  },
  {
    id: 'sample-5',
    content: 'Summary: Q1 2024 planning meeting covered roadmap, hiring, and budget allocation. Key outcome: prioritize AI memory system.',
    type: 'SUMMARY',
    scope: 'ORGANIZATION',
    importance: 0.8,
    confidence: 0.95,
    tags: ['planning', 'q1', 'roadmap'],
    source: 'meeting:2024-01-08',
    version: 1,
    accessCount: 5,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    permissions: ['read'],
  },
  {
    id: 'sample-6',
    content: 'User speaks both English and Arabic. Default to English unless conversation starts in Arabic.',
    type: 'FACT',
    scope: 'PERSONAL',
    importance: 0.6,
    confidence: 0.99,
    tags: ['language', 'i18n'],
    source: 'inferred',
    version: 1,
    accessCount: 156,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
    lastAccessedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    permissions: ['read', 'write'],
  },
];

// ─── Component ────────────────────────────────────────
export default function MemoryView() {
  const { activeOrganizationId, locale } = useAppStore();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<MemoryScope | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<MemoryType | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [extractOpen, setExtractOpen] = useState(false);
  const [semanticResults, setSemanticResults] = useState<MemoryItem[] | null>(null);
  const [semanticQuery, setSemanticQuery] = useState('');
  const [semanticLoading, setSemanticLoading] = useState(false);

  const loadMemories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<MemoryItem[]>('/api/v1/memory', { limit: 100 });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setMemories(res.data);
      } else {
        // Fall back to sample data for demonstration
        setMemories(SAMPLE_MEMORIES);
      }
    } catch (e) {
      setMemories(SAMPLE_MEMORIES);
      setError(null); // Sample data is fine for demo
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMemories();
  }, [loadMemories, activeOrganizationId]);

  const filtered = useMemo(() => {
    let result = memories;
    if (scopeFilter !== 'ALL') result = result.filter((m) => m.scope === scopeFilter);
    if (typeFilter !== 'ALL') result = result.filter((m) => m.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.content.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return [...result].sort((a, b) => (b.importance || 0) - (a.importance || 0));
  }, [memories, scopeFilter, typeFilter, search]);

  const selected = useMemo(
    () => memories.find((m) => m.id === selectedId) || filtered[0] || null,
    [memories, selectedId, filtered]
  );

  // Stats
  const stats = useMemo(() => {
    const total = memories.length;
    const byScope: Record<string, number> = {};
    const byType: Record<string, number> = {};
    memories.forEach((m) => {
      byScope[m.scope] = (byScope[m.scope] || 0) + 1;
      byType[m.type] = (byType[m.type] || 0) + 1;
    });
    const recentlyAccessed = memories
      .filter((m) => m.lastAccessedAt)
      .sort((a, b) => new Date(b.lastAccessedAt!).getTime() - new Date(a.lastAccessedAt!).getTime())
      .slice(0, 5);
    return { total, byScope, byType, recentlyAccessed };
  }, [memories]);

  // ─── Actions ──────────────────────────────────────
  const handleSemanticSearch = async () => {
    if (!semanticQuery.trim()) return;
    setSemanticLoading(true);
    try {
      const res = await apiPost<{ results: MemoryItem[] }>('/api/v1/memory/search', {
        query: semanticQuery,
        limit: 10,
      });
      if (res.success && res.data?.results) {
        setSemanticResults(res.data.results);
      } else {
        // Fall back: filter local
        const q = semanticQuery.toLowerCase();
        const local = memories.filter((m) => m.content.toLowerCase().includes(q)).slice(0, 10);
        setSemanticResults(local);
      }
    } catch {
      const q = semanticQuery.toLowerCase();
      const local = memories.filter((m) => m.content.toLowerCase().includes(q)).slice(0, 10);
      setSemanticResults(local);
    }
    setSemanticLoading(false);
  };

  const handleExtractFromChat = async (chatId: string) => {
    try {
      const res = await apiPost<MemoryItem[]>('/api/v1/memory/extract', { chatId });
      if (res.success && res.data) {
        toast.success(`Extracted ${Array.isArray(res.data) ? res.data.length : 1} memories from chat`);
        setExtractOpen(false);
        loadMemories();
      } else {
        toast.error(res.error || 'Extraction failed');
      }
    } catch {
      toast.error('Extraction failed — service unavailable');
      setExtractOpen(false);
    }
  };

  const handleSummarize = async (memory: MemoryItem) => {
    try {
      const res = await apiPost<MemoryItem>('/api/v1/memory/summarize', { memoryId: memory.id });
      if (res.success) {
        toast.success('Memory summarized');
        loadMemories();
      } else {
        toast.error(res.error || 'Summarize failed');
      }
    } catch {
      toast.error('Summarize failed — service unavailable');
    }
  };

  const handleCreateVersion = async (memory: MemoryItem) => {
    try {
      const res = await apiPost<MemoryItem>(`/api/v1/memory/${memory.id}/version`, {
        content: memory.content,
      });
      if (res.success) {
        toast.success(`New version created (v${(memory.version || 1) + 1})`);
        loadMemories();
      } else {
        toast.error(res.error || 'Failed to create version');
      }
    } catch {
      toast.error('Failed to create version');
    }
  };

  const handleDelete = async (memory: MemoryItem) => {
    const prev = memories;
    setMemories((m) => m.filter((x) => x.id !== memory.id));
    try {
      await apiDelete(`/api/v1/memory/${memory.id}`);
      toast.success('Memory deleted');
    } catch {
      setMemories(prev);
      toast.error('Failed to delete — restored');
    }
  };

  const handleExpirationSweep = async () => {
    try {
      const res = await apiPost<{ removed: number }>('/api/v1/memory/sweep', {});
      if (res.success) {
        toast.success(`Sweep complete — removed ${res.data?.removed || 0} expired memories`);
        loadMemories();
      } else {
        toast.info('No expired memories found');
      }
    } catch {
      toast.error('Sweep failed — service unavailable');
    }
  };

  const handleSave = async (data: Partial<MemoryItem>) => {
    try {
      if (selected && editMode) {
        const res = await apiPost<MemoryItem>(`/api/v1/memory/${selected.id}`, data);
        if (res.success) {
          toast.success('Memory updated');
          setEditMode(false);
          loadMemories();
        } else {
          toast.error(res.error || 'Update failed');
        }
      } else {
        const res = await apiPost<MemoryItem>('/api/v1/memory', data);
        if (res.success) {
          toast.success('Memory created');
          setCreateOpen(false);
          loadMemories();
        } else {
          toast.error(res.error || 'Create failed');
        }
      }
    } catch {
      // Optimistic: still add locally for demo
      const newItem: MemoryItem = {
        id: `local-${Date.now()}`,
        content: data.content || '',
        type: (data.type as MemoryType) || 'FACT',
        scope: (data.scope as MemoryScope) || 'PERSONAL',
        importance: data.importance ?? 0.5,
        confidence: data.confidence ?? 0.8,
        tags: data.tags || [],
        source: 'manual',
        version: 1,
        accessCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastAccessedAt: null,
        expiresAt: data.expiresAt || null,
        permissions: ['read', 'write'],
      };
      setMemories((m) => [newItem, ...m]);
      toast.success('Memory created (offline)');
      setCreateOpen(false);
    }
  };

  // ─── Render ───────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-gradient-to-r from-cyan-500/5 via-background to-background px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Brain className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                {locale === 'ar' ? 'مركز الذاكرة' : 'Memory Center'}
                <Badge variant="outline" className="text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                  {stats.total}
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                {locale === 'ar'
                  ? 'إدارة الذاكرة الدائمة عبر الجلسات'
                  : 'Persistent memory across conversations & sessions'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setExtractOpen(true)}>
              <Wand2 className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Extract</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExpirationSweep}>
              <AlertTriangle className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Sweep</span>
            </Button>
            <Button
              size="sm"
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
              onClick={() => {
                setEditMode(false);
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              {locale === 'ar' ? 'ذاكرة جديدة' : 'New Memory'}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3 px-6 py-3 border-b border-border bg-muted/20">
        <StatCard
          icon={Layers}
          label="Total"
          value={stats.total}
          color="text-cyan-400"
        />
        <StatCard
          icon={Activity}
          label="Personal"
          value={stats.byScope.PERSONAL || 0}
          color="text-emerald-400"
        />
        <StatCard
          icon={Star}
          label="Pinned"
          value={stats.byScope.PINNED || 0}
          color="text-pink-400"
        />
        <StatCard
          icon={History}
          label="Recent Access"
          value={stats.recentlyAccessed.length}
          color="text-amber-400"
        />
      </div>

      {/* Main split layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,420px)] min-h-0">
        {/* Left: list + filters */}
        <div className="flex flex-col min-h-0 border-r border-border">
          {/* Toolbar */}
          <div className="shrink-0 p-3 border-b border-border space-y-2 bg-background/60">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={locale === 'ar' ? 'بحث في الذاكرة...' : 'Search memories...'}
                className="pl-9 bg-background"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <FilterChips
                label="Scope"
                value={scopeFilter}
                options={SCOPES.map((s) => ({ value: s, label: SCOPE_META[s].label }))}
                onChange={(v) => setScopeFilter(v as MemoryScope | 'ALL')}
              />
              <Separator orientation="vertical" className="h-4" />
              <FilterChips
                label="Type"
                value={typeFilter}
                options={TYPES.map((t) => ({ value: t, label: TYPE_META[t].label }))}
                onChange={(v) => setTypeFilter(v as MemoryType | 'ALL')}
              />
              {(scopeFilter !== 'ALL' || typeFilter !== 'ALL' || search) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs ml-auto"
                  // ghost falls back to default Button ghost variant (Button supports ghost)
                  onClick={() => {
                    setScopeFilter('ALL');
                    setTypeFilter('ALL');
                    setSearch('');
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Memory list */}
          <ScrollArea className="flex-1 scrollbar-thin">
            <div className="p-3 space-y-2">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <MemorySkeleton key={i} />)
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={Brain}
                  title="No memories found"
                  description="Try adjusting filters or create a new memory."
                  action={
                    <Button
                      size="sm"
                      className="bg-cyan-500 hover:bg-cyan-600 text-white"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      Create Memory
                    </Button>
                  }
                />
              ) : (
                filtered.map((m) => (
                  <MemoryCard
                    key={m.id}
                    memory={m}
                    active={selected?.id === m.id}
                    onClick={() => setSelectedId(m.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Semantic search bar */}
          <div className="shrink-0 border-t border-border p-3 bg-muted/20">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
              <Input
                value={semanticQuery}
                onChange={(e) => setSemanticQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
                placeholder="Semantic search (e.g. 'user communication preferences')"
                className="h-9 bg-background"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleSemanticSearch}
                disabled={semanticLoading}
              >
                {semanticLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
              </Button>
            </div>
            {semanticResults && (
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
                {semanticResults.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No semantic matches</p>
                ) : (
                  semanticResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent/60 transition truncate"
                    >
                      <Sparkles className="h-3 w-3 inline mr-1 text-cyan-400" />
                      {r.content.slice(0, 80)}…
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: detail panel */}
        <div className="hidden lg:flex flex-col min-h-0 bg-muted/10">
          {selected ? (
            <MemoryDetail
              memory={selected}
              editMode={editMode}
              onEdit={() => setEditMode(true)}
              onCancelEdit={() => setEditMode(false)}
              onSave={handleSave}
              onDelete={() => handleDelete(selected)}
              onCreateVersion={() => handleCreateVersion(selected)}
              onSummarize={() => handleSummarize(selected)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <EmptyState
                icon={Brain}
                title="Select a memory"
                description="Choose a memory from the list to view its full content, metadata, and history."
              />
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <MemoryFormDialog
        open={createOpen || editMode}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false);
            setEditMode(false);
          }
        }}
        memory={editMode ? selected : null}
        onSave={handleSave}
      />

      {/* Extract from chat dialog */}
      <ExtractDialog
        open={extractOpen}
        onOpenChange={setExtractOpen}
        onExtract={handleExtractFromChat}
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card className="p-3 bg-background/60 border-border/60">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', color)} />
        <div className="min-w-0">
          <div className="text-lg font-semibold leading-none">{value}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</div>
        </div>
      </div>
    </Card>
  );
}

function FilterChips({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 w-auto text-xs gap-1 border-border/60">
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function MemoryCard({
  memory,
  active,
  onClick,
}: {
  memory: MemoryItem;
  active: boolean;
  onClick: () => void;
}) {
  const scope = SCOPE_META[memory.scope];
  const type = TYPE_META[memory.type];
  const ScopeIcon = scope.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all group',
        active
          ? 'border-cyan-500/40 bg-cyan-500/5 shadow-sm'
          : 'border-border/60 bg-background hover:border-cyan-500/20 hover:bg-accent/30'
      )}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className={cn('p-1.5 rounded-md shrink-0', type.color)}>
          <Brain className="h-3.5 w-3.5" />
        </div>
        <p className="text-sm flex-1 line-clamp-2 leading-relaxed">{memory.content}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className={cn('text-[10px] gap-1 px-1.5', scope.color)}>
          <ScopeIcon className="h-2.5 w-2.5" />
          {scope.label}
        </Badge>
        <Badge variant="outline" className={cn('text-[10px] px-1.5', type.color)}>
          {type.label}
        </Badge>
        {(memory.tags || []).slice(0, 2).map((t) => (
          <Badge key={t} variant="secondary" className="text-[10px] px-1.5 text-muted-foreground">
            <Tag className="h-2.5 w-2.5 mr-0.5" />
            {t}
          </Badge>
        ))}
        {(memory.tags || []).length > 2 && (
          <span className="text-[10px] text-muted-foreground">+{(memory.tags || []).length - 2}</span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Star className="h-2.5 w-2.5 text-amber-400" />
          {Math.round((memory.importance || 0) * 100)}%
        </span>
        <span className="flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5 text-cyan-400" />
          {Math.round((memory.confidence || 0) * 100)}%
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {memory.lastAccessedAt ? formatRelativeTime(memory.lastAccessedAt) : 'never'}
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <Activity className="h-2.5 w-2.5" />
          {memory.accessCount || 0}×
        </span>
      </div>
      {/* Importance bar */}
      <div className="mt-2 h-0.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-teal-400"
          style={{ width: `${(memory.importance || 0) * 100}%` }}
        />
      </div>
    </button>
  );
}

function MemoryDetail({
  memory,
  editMode,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  onCreateVersion,
  onSummarize,
}: {
  memory: MemoryItem;
  editMode: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: Partial<MemoryItem>) => void;
  onDelete: () => void;
  onCreateVersion: () => void;
  onSummarize: () => void;
}) {
  const [content, setContent] = useState(memory.content);
  const [tags, setTags] = useState((memory.tags || []).join(', '));
  const scope = SCOPE_META[memory.scope];
  const type = TYPE_META[memory.type];

  useEffect(() => {
    setContent(memory.content);
    setTags((memory.tags || []).join(', '));
  }, [memory.id, memory.content, memory.tags]);

  return (
    <ScrollArea className="flex-1 scrollbar-thin">
      <div className="p-5 space-y-4">
        {/* Header badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn('gap-1', scope.color)}>
            <scope.icon className="h-3 w-3" />
            {scope.label}
          </Badge>
          <Badge variant="outline" className={type.color}>
            {type.label}
          </Badge>
          {memory.version && (
            <Badge variant="secondary" className="gap-1 text-muted-foreground">
              <GitBranch className="h-3 w-3" />
              v{memory.version}
            </Badge>
          )}
        </div>

        {/* Content */}
        <div>
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Content</Label>
          {editMode ? (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="mt-1 bg-background resize-y"
            />
          ) : (
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap p-3 rounded-lg bg-muted/30 border border-border/40">
              {memory.content}
            </p>
          )}
        </div>

        {/* Tags */}
        <div>
          <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Tags</Label>
          {editMode ? (
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="comma, separated, tags"
              className="mt-1 bg-background"
            />
          ) : (
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              {(memory.tags || []).length === 0 ? (
                <span className="text-xs text-muted-foreground">No tags</span>
              ) : (
                (memory.tags || []).map((t) => (
                  <Badge key={t} variant="outline" className="gap-1 text-xs">
                    <Tag className="h-3 w-3" />
                    {t}
                  </Badge>
                ))
              )}
            </div>
          )}
        </div>

        {/* Importance & confidence */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Importance</span>
              <span className="font-medium text-amber-400">
                {Math.round((memory.importance || 0) * 100)}%
              </span>
            </div>
            <Progress value={(memory.importance || 0) * 100} className="h-1.5 bg-muted" />
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Confidence</span>
              <span className="font-medium text-cyan-400">
                {Math.round((memory.confidence || 0) * 100)}%
              </span>
            </div>
            <Progress value={(memory.confidence || 0) * 100} className="h-1.5 bg-muted" />
          </div>
        </div>

        {/* Metadata */}
        <div className="rounded-lg border border-border/40 divide-y divide-border/40 text-xs">
          <MetaRow label="Created" value={new Date(memory.createdAt).toLocaleString()} />
          <MetaRow label="Last Updated" value={formatRelativeTime(memory.updatedAt)} />
          <MetaRow
            label="Last Accessed"
            value={memory.lastAccessedAt ? formatRelativeTime(memory.lastAccessedAt) : 'Never'}
          />
          <MetaRow label="Access Count" value={`${memory.accessCount || 0} times`} />
          <MetaRow label="Source" value={memory.source || '—'} />
          <MetaRow label="Version" value={`v${memory.version || 1}`} />
          {memory.expiresAt && (
            <MetaRow label="Expires" value={new Date(memory.expiresAt).toLocaleDateString()} />
          )}
          {memory.permissions && memory.permissions.length > 0 && (
            <MetaRow label="Permissions" value={memory.permissions.join(', ')} />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {editMode ? (
            <>
              <Button
                size="sm"
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
                onClick={() =>
                  onSave({
                    ...memory,
                    content,
                    tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
                  })
                }
              >
                Save Changes
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelEdit}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline" onClick={onEdit}>
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit this memory</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button size="sm" variant="outline" onClick={onCreateVersion}>
                <GitBranch className="h-3.5 w-3.5 mr-1.5" />
                <span className="hidden xl:inline">New Version</span>
                <span className="xl:hidden">Version</span>
              </Button>
              <Button size="sm" variant="outline" onClick={onSummarize}>
                <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                <span className="hidden xl:inline">Summarize</span>
                <span className="xl:hidden">AI</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive ml-auto"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate ml-2 max-w-[60%]">{value}</span>
    </div>
  );
}

function MemorySkeleton() {
  return (
    <div className="p-3 rounded-lg border border-border/60 bg-background animate-pulse">
      <div className="flex gap-2 mb-2">
        <div className="h-6 w-6 rounded bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-3/4 bg-muted rounded" />
          <div className="h-3 w-1/2 bg-muted rounded" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="h-4 w-20 bg-muted rounded" />
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-cyan-400" />
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function MemoryFormDialog({
  open,
  onOpenChange,
  memory,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  memory: MemoryItem | null;
  onSave: (data: Partial<MemoryItem>) => void;
}) {
  const [content, setContent] = useState('');
  const [type, setType] = useState<MemoryType>('FACT');
  const [scope, setScope] = useState<MemoryScope>('PERSONAL');
  const [importance, setImportance] = useState(0.5);
  const [confidence, setConfidence] = useState(0.8);
  const [tags, setTags] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (open) {
      setContent(memory?.content || '');
      setType(memory?.type || 'FACT');
      setScope(memory?.scope || 'PERSONAL');
      setImportance(memory?.importance ?? 0.5);
      setConfidence(memory?.confidence ?? 0.8);
      setTags(memory?.tags.join(', ') || '');
      setExpiresAt(memory?.expiresAt ? memory.expiresAt.split('T')[0] : '');
    }
  }, [open, memory]);

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error('Content is required');
      return;
    }
    onSave({
      content,
      type,
      scope,
      importance,
      confidence,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background border-border max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-cyan-400" />
            {memory ? 'Edit Memory' : 'Create Memory'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Content</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What should the AI remember?"
              rows={4}
              className="mt-1.5 bg-background resize-y"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as MemoryType)}>
                <SelectTrigger className="mt-1.5 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_META[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as MemoryScope)}>
                <SelectTrigger className="mt-1.5 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPES.filter((s) => s !== 'PINNED').map((s) => (
                    <SelectItem key={s} value={s}>
                      {SCOPE_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
              <div className="flex items-center justify-between text-xs mb-2">
                <Label className="flex items-center gap-1.5">
                  <Star className="h-3 w-3 text-amber-400" />
                  Importance
                </Label>
                <span className="font-medium text-amber-400">{Math.round(importance * 100)}%</span>
              </div>
              <Slider
                value={[importance]}
                onValueChange={(v) => setImportance(v[0])}
                min={0}
                max={1}
                step={0.05}
              />
            </div>
            <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
              <div className="flex items-center justify-between text-xs mb-2">
                <Label className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-cyan-400" />
                  Confidence
                </Label>
                <span className="font-medium text-cyan-400">{Math.round(confidence * 100)}%</span>
              </div>
              <Slider
                value={[confidence]}
                onValueChange={(v) => setConfidence(v[0])}
                min={0}
                max={1}
                step={0.05}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Tags (comma separated)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="preference, style, communication"
              className="mt-1.5 bg-background"
            />
          </div>
          <div>
            <Label className="text-xs">Expiration Date (optional)</Label>
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1.5 bg-background"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
            onClick={handleSubmit}
          >
            {memory ? 'Save Changes' : 'Create Memory'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExtractDialog({
  open,
  onOpenChange,
  onExtract,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onExtract: (chatId: string) => void;
}) {
  const [chatId, setChatId] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-cyan-400" />
            Extract from Conversation
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground">
            Paste a chat ID to extract memories automatically using AI. The system will identify
            facts, preferences, decisions, and context worth remembering.
          </p>
          <div>
            <Label className="text-xs">Chat ID</Label>
            <Input
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="e.g. abc123def456"
              className="mt-1.5 bg-background font-mono text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
            disabled={!chatId.trim()}
            onClick={() => onExtract(chatId.trim())}
          >
            <Wand2 className="h-4 w-4 mr-1.5" />
            Extract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
