'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  Search,
  Sparkles,
  Filter,
  Clock,
  FileText,
  MessageSquare,
  Folder,
  Brain,
  Tag,
  RefreshCw,
  History,
  ChevronRight,
  Layers,
  Code2,
  Lightbulb,
  Trash2,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';
import { apiPost, formatRelativeTime } from '@/lib/api-client';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────
type ResultType =
  | 'chat'
  | 'document'
  | 'file'
  | 'note'
  | 'artifact'
  | 'project'
  | 'memory'
  | 'prompt'
  | 'all';

interface SearchResult {
  id: string;
  type: Exclude<ResultType, 'all'>;
  title: string;
  content: string;
  preview: string;
  score: number; // 0-1
  url?: string;
  createdAt?: string;
  tags?: string[];
  language?: string;
  topics?: string[];
  meta?: Record<string, unknown>;
}

interface SmartSearchResponse {
  query: string;
  summary: string;
  keywords: string[];
  classification: string;
  results: SearchResult[];
  total: number;
}

// ─── Constants ────────────────────────────────────────
const TYPE_META: Record<
  Exclude<ResultType, 'all'>,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; tabLabel: string }
> = {
  chat: { label: 'Chat', icon: MessageSquare, color: 'text-cyan-400 bg-cyan-500/10', tabLabel: 'Chats' },
  document: { label: 'Document', icon: FileText, color: 'text-teal-400 bg-teal-500/10', tabLabel: 'Documents' },
  file: { label: 'File', icon: FileText, color: 'text-amber-400 bg-amber-500/10', tabLabel: 'Files' },
  note: { label: 'Note', icon: FileText, color: 'text-violet-400 bg-violet-500/10', tabLabel: 'Notes' },
  artifact: { label: 'Artifact', icon: Code2, color: 'text-pink-400 bg-pink-500/10', tabLabel: 'Artifacts' },
  project: { label: 'Project', icon: Folder, color: 'text-emerald-400 bg-emerald-500/10', tabLabel: 'Projects' },
  memory: { label: 'Memory', icon: Brain, color: 'text-sky-400 bg-sky-500/10', tabLabel: 'Memories' },
  prompt: { label: 'Prompt', icon: Lightbulb, color: 'text-orange-400 bg-orange-500/10', tabLabel: 'Prompts' },
};

const TABS: ResultType[] = [
  'all',
  'chat',
  'document',
  'file',
  'note',
  'artifact',
  'project',
  'memory',
  'prompt',
];

const HISTORY_KEY = 'moataz_search_history';
const MAX_HISTORY = 12;

// ─── Sample data fallback ─────────────────────────────
function buildSampleResponse(query: string): SmartSearchResponse {
  const q = query.toLowerCase();
  const results: SearchResult[] = [
    {
      id: 's1',
      type: 'chat',
      title: 'Discussion about Next.js 16 App Router',
      content: 'We discussed migrating to App Router and the benefits of Server Components for our dashboard...',
      preview: '...migrating to **App Router** and the benefits of Server Components for our dashboard...',
      score: 0.94,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      tags: ['nextjs', 'frontend'],
      language: 'en',
      topics: ['frontend', 'react'],
    },
    {
      id: 's2',
      type: 'document',
      title: 'Next.js 16 App Router Migration Guide',
      content: 'Comprehensive guide covering migration from Pages Router to App Router, including Server Components, layouts, and data fetching patterns.',
      preview: '...migration from Pages Router to **App Router**, including Server Components, layouts, and data fetching...',
      score: 0.91,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      tags: ['nextjs', 'frontend', 'migration'],
      language: 'en',
      topics: ['frontend', 'react'],
    },
    {
      id: 's3',
      type: 'memory',
      title: 'User preference: concise code answers',
      content: 'User prefers concise answers with code examples. Avoid lengthy explanations unless explicitly requested.',
      preview: '...prefers **concise** answers with code examples. Avoid lengthy explanations...',
      score: 0.82,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
      tags: ['communication', 'style'],
      language: 'en',
      topics: ['preferences'],
    },
    {
      id: 's4',
      type: 'artifact',
      title: 'app-router-layout.tsx',
      content: 'export default function Layout({ children }) { return <html><body>{children}</body></html>; }',
      preview: 'export default function Layout({ children }) { return <html><body>{children}</body></html>; }',
      score: 0.78,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
      tags: ['react', 'layout'],
      language: 'typescript',
      topics: ['frontend'],
    },
    {
      id: 's5',
      type: 'note',
      title: 'RAG architecture notes',
      content: 'Retrieval-Augmented Generation: combine vector search with LLM generation. Use pgvector + OpenAI embeddings.',
      preview: '...combine vector search with LLM generation. Use pgvector + OpenAI **embeddings**...',
      score: 0.71,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
      tags: ['rag', 'ai', 'architecture'],
      language: 'en',
      topics: ['ai', 'architecture'],
    },
    {
      id: 's6',
      type: 'project',
      title: 'Moataz AI Platform',
      content: 'The AI Operating System for Enterprise — unifying 13+ providers, agents, memory, and knowledge base.',
      preview: '...unifying 13+ providers, agents, **memory**, and knowledge base...',
      score: 0.65,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
      tags: ['platform', 'ai'],
      language: 'en',
      topics: ['product'],
    },
    {
      id: 's7',
      type: 'prompt',
      title: 'Code review assistant',
      content: 'You are a senior code reviewer. Analyze the provided code for bugs, performance issues, and best practices.',
      preview: '...senior code reviewer. Analyze the provided **code** for bugs, performance issues...',
      score: 0.58,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
      tags: ['prompts', 'review'],
      language: 'en',
      topics: ['prompts'],
    },
  ];

  // Filter sample by query terms
  const filtered = results.filter(
    (r) =>
      q === '' ||
      r.title.toLowerCase().includes(q) ||
      r.content.toLowerCase().includes(q) ||
      r.tags?.some((t) => t.toLowerCase().includes(q))
  );

  return {
    query,
    summary: `Found ${filtered.length} results across ${new Set(filtered.map((r) => r.type)).size} content types. The top results relate to "${query}" with strong matches in chats and documents. Key themes: frontend development, React ecosystem, and AI memory systems.`,
    keywords: ['app router', 'nextjs', 'memory', 'rag', 'server components', 'embeddings', 'frontend'],
    classification: 'Technical / Frontend Development',
    results: filtered,
    total: filtered.length,
  };
}

// ─── Component ────────────────────────────────────────
export default function SearchView() {
  const { locale } = useAppStore();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ResultType>('all');
  const [dateRange, setDateRange] = useState<'any' | 'day' | 'week' | 'month' | 'year'>('any');
  const [language, setLanguage] = useState<'any' | 'en' | 'ar'>('any');
  const [scope, setScope] = useState<'any' | 'personal' | 'workspace' | 'org'>('any');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SmartSearchResponse | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      /* no-op */
    }
    // Focus input on mount
    inputRef.current?.focus();
  }, []);

  const saveHistory = useCallback((q: string) => {
    if (!q.trim()) return;
    setHistory((prev) => {
      const next = [q, ...prev.filter((h) => h !== q)].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* no-op */
      }
      return next;
    });
  }, []);

  const handleSearch = useCallback(
    async (q?: string) => {
      const searchQuery = (q ?? query).trim();
      if (!searchQuery) return;
      setQuery(searchQuery);
      setLoading(true);
      setHasSearched(true);
      saveHistory(searchQuery);
      try {
        const res = await apiPost<SmartSearchResponse>('/api/v1/smart-search', {
          query: searchQuery,
          limit: 30,
        });
        if (res.success && res.data?.results) {
          setResponse(res.data);
        } else {
          // Fallback to sample data
          setResponse(buildSampleResponse(searchQuery));
        }
      } catch {
        setResponse(buildSampleResponse(searchQuery));
      }
      setLoading(false);
    },
    [query, saveHistory]
  );

  const filteredResults = useMemo(() => {
    if (!response) return [];
    let r = response.results;
    if (activeTab !== 'all') r = r.filter((x) => x.type === activeTab);
    if (language !== 'any') r = r.filter((x) => x.language === language);
    if (dateRange !== 'any') {
      const now = Date.now();
      const cutoffs: Record<string, number> = {
        day: 1000 * 60 * 60 * 24,
        week: 1000 * 60 * 60 * 24 * 7,
        month: 1000 * 60 * 60 * 24 * 30,
        year: 1000 * 60 * 60 * 24 * 365,
      };
      const cutoff = now - cutoffs[dateRange];
      r = r.filter((x) => (x.createdAt ? new Date(x.createdAt).getTime() >= cutoff : true));
    }
    return r.sort((a, b) => b.score - a.score);
  }, [response, activeTab, language, dateRange]);

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    filteredResults.forEach((r) => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    });
    return groups;
  }, [filteredResults]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: response?.results.length || 0 };
    response?.results.forEach((r) => {
      c[r.type] = (c[r.type] || 0) + 1;
    });
    return c;
  }, [response]);

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* no-op */
    }
    toast.success('Search history cleared');
  };

  // ─── Render ───────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Hero search bar */}
      <div className="shrink-0 border-b border-border bg-gradient-to-b from-cyan-500/5 via-background to-background px-6 py-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 mb-4">
            <Sparkles className="h-3 w-3" />
            AI-Powered Smart Search
          </div>
          <h1 className="text-2xl font-semibold mb-2">
            {locale === 'ar' ? 'مركز البحث الذكي' : 'Smart Search Center'}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {locale === 'ar'
              ? 'بحث موحد عبر المحادثات والمستندات والملفات والملاحظات والذاكرة'
              : 'Unified search across chats, documents, files, notes, artifacts, memories & more'}
          </p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={locale === 'ar' ? 'ابحث عن أي شيء...' : 'Search for anything...'}
              className="h-14 pl-12 pr-32 text-base bg-background border-cyan-500/30 shadow-lg"
            />
            <Button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">Search</span>
                </>
              )}
            </Button>
          </div>

          {/* Advanced filters */}
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap text-xs">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <FilterSelect
              label="Date"
              value={dateRange}
              onChange={(v) => setDateRange(v as typeof dateRange)}
              options={[
                { value: 'any', label: 'Any time' },
                { value: 'day', label: 'Past 24h' },
                { value: 'week', label: 'Past week' },
                { value: 'month', label: 'Past month' },
                { value: 'year', label: 'Past year' },
              ]}
            />
            <FilterSelect
              label="Language"
              value={language}
              onChange={(v) => setLanguage(v as typeof language)}
              options={[
                { value: 'any', label: 'Any' },
                { value: 'en', label: 'English' },
                { value: 'ar', label: 'Arabic' },
              ]}
            />
            <FilterSelect
              label="Scope"
              value={scope}
              onChange={(v) => setScope(v as typeof scope)}
              options={[
                { value: 'any', label: 'All scopes' },
                { value: 'personal', label: 'Personal' },
                { value: 'workspace', label: 'Workspace' },
                { value: 'org', label: 'Organization' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Body: history or results */}
      <div className="flex-1 overflow-hidden min-h-0">
        {!hasSearched ? (
          <ScrollArea className="h-full scrollbar-thin">
            <div className="max-w-3xl mx-auto px-6 py-6">
              {/* Recent searches */}
              {history.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5" />
                      Recent Searches
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={handleClearHistory}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {history.map((h, i) => (
                      <button
                        key={i}
                        onClick={() => handleSearch(h)}
                        className="px-3 py-1.5 rounded-full bg-muted/60 border border-border/60 hover:bg-accent hover:border-cyan-500/30 text-xs transition flex items-center gap-1.5"
                      >
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested searches */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                  Try searching for
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    'Next.js App Router best practices',
                    'How does the memory system work?',
                    'RAG implementation with pgvector',
                    'User communication preferences',
                    'Q3 product roadmap',
                    'Transformer architecture explained',
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSearch(s)}
                      className="text-left p-3 rounded-lg border border-border/60 bg-background hover:border-cyan-500/40 hover:bg-accent/30 transition group"
                    >
                      <div className="flex items-center gap-2">
                        <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-cyan-400" />
                        <span className="text-sm flex-1">{s}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content type overview */}
              <div className="mt-8">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
                  <Layers className="h-3.5 w-3.5" />
                  Searches across
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(TYPE_META).map(([k, v]) => {
                    const Icon = v.icon;
                    return (
                      <div
                        key={k}
                        className="flex items-center gap-2 p-2.5 rounded-lg border border-border/40 bg-muted/20"
                      >
                        <div className={cn('p-1.5 rounded', v.color)}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs">{v.tabLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="h-full flex flex-col min-h-0">
            {/* AI Summary panel */}
            {response && (
              <div className="shrink-0 border-b border-border bg-gradient-to-r from-cyan-500/5 to-background px-6 py-4">
                <div className="max-w-5xl mx-auto">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                          AI Summary
                        </span>
                        <Badge variant="outline" className="text-[10px] text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                          {response.classification}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {response.total} results
                        </Badge>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/90">{response.summary}</p>
                      {response.keywords.length > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Tag className="h-2.5 w-2.5" />
                            Keywords:
                          </span>
                          {response.keywords.map((k) => (
                            <Badge
                              key={k}
                              variant="outline"
                              className="text-[10px] gap-1 cursor-pointer hover:bg-cyan-500/10 hover:text-cyan-300 hover:border-cyan-500/30"
                              onClick={() => handleSearch(k)}
                            >
                              <Hash className="h-2.5 w-2.5" />
                              {k}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filter tabs */}
            <div className="shrink-0 border-b border-border px-6 py-2 bg-background/60">
              <div className="max-w-5xl mx-auto">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ResultType)}>
                  <TabsList className="h-9 bg-muted/40 overflow-x-auto scrollbar-thin">
                    {TABS.map((t) => {
                      const label =
                        t === 'all' ? 'All' : TYPE_META[t as Exclude<ResultType, 'all'>].tabLabel;
                      const Icon = t === 'all' ? Layers : TYPE_META[t as Exclude<ResultType, 'all'>].icon;
                      return (
                        <TabsTrigger
                          key={t}
                          value={t}
                          className="text-xs gap-1.5 data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-300"
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                          {counts[t] !== undefined && counts[t] > 0 && (
                            <span className="text-[10px] opacity-70">{counts[t]}</span>
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>
              </div>
            </div>

            {/* Results */}
            <ScrollArea className="flex-1 scrollbar-thin">
              <div className="max-w-5xl mx-auto px-6 py-4">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <ResultSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredResults.length === 0 ? (
                  <EmptyState
                    icon={Search}
                    title="No results found"
                    description={`No matches for "${query}". Try different keywords or adjust your filters.`}
                  />
                ) : activeTab === 'all' ? (
                  <div className="space-y-6">
                    {Object.entries(grouped).map(([type, items]) => {
                      const meta = TYPE_META[type as Exclude<ResultType, 'all'>];
                      const Icon = meta.icon;
                      return (
                        <div key={type}>
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className={cn('h-4 w-4', meta.color.split(' ')[0])} />
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {meta.tabLabel}
                            </h3>
                            <Badge variant="secondary" className="text-[10px]">
                              {items.length}
                            </Badge>
                            <Separator className="flex-1" />
                          </div>
                          <div className="space-y-2">
                            {items.map((r) => (
                              <ResultCard key={r.id} result={r} query={query} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredResults.map((r) => (
                      <ResultCard key={r.id} result={r} query={query} />
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 w-auto text-xs gap-1 border-border/60">
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ResultCard({ result, query }: { result: SearchResult; query: string }) {
  const meta = TYPE_META[result.type];
  const Icon = meta.icon;
  return (
    <Card className="p-4 bg-background border-border/60 hover:border-cyan-500/40 hover:shadow-md transition-all group cursor-pointer">
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-md shrink-0', meta.color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={cn('text-[10px]', meta.color)}>
              {meta.label}
            </Badge>
            {result.language && (
              <Badge variant="secondary" className="text-[10px]">
                {result.language}
              </Badge>
            )}
            {result.createdAt && (
              <span className="text-[10px] text-muted-foreground ml-auto">
                {formatRelativeTime(result.createdAt)}
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium group-hover:text-cyan-300 transition line-clamp-1">
            {highlight(result.title, query)}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {highlightPreview(result.preview, query)}
          </p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {/* Relevance score bar */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Relevance</span>
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    result.score >= 0.8
                      ? 'bg-emerald-500'
                      : result.score >= 0.6
                      ? 'bg-cyan-500'
                      : 'bg-amber-500'
                  )}
                  style={{ width: `${result.score * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-medium">
                {Math.round(result.score * 100)}%
              </span>
            </div>
            {result.tags && result.tags.length > 0 && (
              <>
                <Separator orientation="vertical" className="h-3" />
                {result.tags.slice(0, 3).map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px] gap-0.5">
                    <Tag className="h-2.5 w-2.5" />
                    {t}
                  </Badge>
                ))}
              </>
            )}
            {result.topics && result.topics.length > 0 && (
              <>
                <Separator orientation="vertical" className="h-3" />
                {result.topics.slice(0, 2).map((t) => (
                  <span key={t} className="text-[10px] text-muted-foreground">
                    #{t}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ResultSkeleton() {
  return (
    <Card className="p-4 bg-background border-border/60 animate-pulse">
      <div className="flex gap-3">
        <div className="h-9 w-9 rounded bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-4 w-16 bg-muted rounded" />
            <div className="h-4 w-12 bg-muted rounded" />
          </div>
          <div className="h-3 w-3/4 bg-muted rounded" />
          <div className="h-2 w-full bg-muted rounded" />
          <div className="h-2 w-2/3 bg-muted rounded" />
        </div>
      </div>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-cyan-400" />
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>
    </div>
  );
}

// ─── Highlight helpers ────────────────────────────────
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const terms = query.trim().split(/\s+/).filter((t) => t.length > 1);
  if (terms.length === 0) return text;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    pattern.test(part) ? (
      <mark key={i} className="bg-cyan-500/20 text-cyan-200 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function highlightPreview(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const terms = query.trim().split(/\s+/).filter((t) => t.length > 1);
  if (terms.length === 0) return text;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    pattern.test(part) ? (
      <mark key={i} className="bg-cyan-500/20 text-cyan-200 rounded px-0.5 font-medium">
        {part}
      </mark>
    ) : part.startsWith('**') ? (
      <strong key={i} className="text-foreground">
        {part.replace(/\*\*/g, '')}
      </strong>
    ) : (
      part.replace(/\*\*/g, '')
    )
  );
}
