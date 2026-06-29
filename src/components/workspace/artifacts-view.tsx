'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Code2,
  Copy,
  Download,
  FileJson,
  FileText,
  FileType2,
  Image as ImageIcon,
  LayoutGrid,
  Search,
  Sparkles,
  Table as TableIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { apiGet, formatRelativeTime } from '@/lib/api-client';
import { toast } from 'sonner';
import Markdown from './markdown';

interface ArtifactItem {
  id: string;
  title: string;
  artifactType: string;
  content: string;
  language?: string | null;
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string } | null;
  chat?: { id: string; title: string } | null;
}

const TYPE_META: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  CODE: { icon: Code2, color: 'text-cyan-400 bg-cyan-500/10', label: 'Code' },
  IMAGE: { icon: ImageIcon, color: 'text-pink-400 bg-pink-500/10', label: 'Image' },
  DOCUMENT: { icon: FileText, color: 'text-amber-400 bg-amber-500/10', label: 'Document' },
  TABLE: { icon: TableIcon, color: 'text-emerald-400 bg-emerald-500/10', label: 'Table' },
  CHART: { icon: BarChart3, color: 'text-violet-400 bg-violet-500/10', label: 'Chart' },
  MARKDOWN: { icon: FileText, color: 'text-cyan-400 bg-cyan-500/10', label: 'Markdown' },
  PDF: { icon: FileType2, color: 'text-rose-400 bg-rose-500/10', label: 'PDF' },
  JSON: { icon: FileJson, color: 'text-amber-400 bg-amber-500/10', label: 'JSON' },
  CSV: { icon: TableIcon, color: 'text-emerald-400 bg-emerald-500/10', label: 'CSV' },
  HTML: { icon: Code2, color: 'text-orange-400 bg-orange-500/10', label: 'HTML' },
  SVG: { icon: ImageIcon, color: 'text-pink-400 bg-pink-500/10', label: 'SVG' },
};

function getTypeMeta(type: string) {
  return TYPE_META[type] || { icon: Sparkles, color: 'text-brand bg-brand/10', label: type };
}

export default function ArtifactsView() {
  const { activeOrganizationId } = useAppStore();
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [preview, setPreview] = useState<ArtifactItem | null>(null);

  useEffect(() => {
    (async () => {
      if (!activeOrganizationId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const res = await apiGet<ArtifactItem[]>('/api/v1/artifacts', { limit: 100 });
      if (res.success && Array.isArray(res.data)) {
        setArtifacts(res.data);
      } else {
        setArtifacts([]);
      }
      setLoading(false);
    })();
  }, [activeOrganizationId]);

  const types = useMemo(() => {
    const set = new Set(artifacts.map((a) => a.artifactType));
    return ['ALL', ...Array.from(set)];
  }, [artifacts]);

  const filtered = useMemo(() => {
    return artifacts.filter((a) => {
      if (typeFilter !== 'ALL' && a.artifactType !== typeFilter) return false;
      if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [artifacts, search, typeFilter]);

  const handleCopy = async (a: ArtifactItem) => {
    try {
      await navigator.clipboard.writeText(a.content);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDownload = (a: ArtifactItem) => {
    const ext = a.language || a.artifactType.toLowerCase();
    const blob = new Blob([a.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${a.title || 'artifact'}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="h-14 shrink-0 border-b border-border flex items-center gap-3 px-4">
        <h2 className="text-lg font-semibold">Artifacts</h2>
        <Badge variant="secondary" className="h-5">{artifacts.length}</Badge>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search artifacts..."
              className="pl-8 h-9 w-56"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === 'ALL' ? 'All types' : getTypeMeta(t).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-4">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Loading artifacts…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No artifacts yet</p>
              <p className="text-xs text-muted-foreground mt-1 px-4 max-w-md mx-auto">
                Artifacts are AI-generated code, documents, charts, and tables. Generate one by asking in chat.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((a) => {
                const meta = getTypeMeta(a.artifactType);
                return (
                  <button
                    key={a.id}
                    onClick={() => setPreview(a)}
                    className="group text-left rounded-xl border border-border bg-card hover:border-brand/40 hover:shadow-md transition p-4 flex flex-col"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', meta.color)}>
                        <meta.icon className="h-5 w-5" />
                      </div>
                      <Badge variant="outline" className="h-5 text-[10px]">{meta.label}</Badge>
                    </div>
                    <h4 className="text-sm font-semibold truncate">{a.title}</h4>
                    <pre className="text-[11px] text-muted-foreground mt-2 font-mono line-clamp-3 whitespace-pre-wrap break-words">
                      {a.content.slice(0, 200)}
                      {a.content.length > 200 ? '…' : ''}
                    </pre>
                    <div className="mt-auto pt-2 text-[10px] text-muted-foreground flex items-center gap-2">
                      <span>{formatRelativeTime(a.updatedAt)}</span>
                      {a.chat?.title && (
                        <>
                          <span>·</span>
                          <span className="truncate">{a.chat.title}</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const meta = getTypeMeta(preview.artifactType);
                    return <meta.icon className={cn('h-4 w-4', meta.color)} />;
                  })()}
                  {preview.title}
                  <Badge variant="outline" className="text-[10px] h-5">{getTypeMeta(preview.artifactType).label}</Badge>
                  {preview.language && (
                    <Badge variant="secondary" className="text-[10px] h-5 font-mono">{preview.language}</Badge>
                  )}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="flex-1 scrollbar-thin max-h-[60vh]">
                {preview.artifactType === 'MARKDOWN' || preview.artifactType === 'DOCUMENT' ? (
                  <div className="rounded-md border border-border bg-muted/20 p-4">
                    <Markdown content={preview.content} />
                  </div>
                ) : preview.artifactType === 'HTML' ? (
                  <iframe
                    srcDoc={preview.content}
                    className="w-full h-[60vh] rounded-md border border-border bg-white"
                    sandbox="allow-scripts"
                    title={preview.title}
                  />
                ) : (
                  <pre className="text-sm font-mono whitespace-pre-wrap p-4 rounded-md border border-border bg-[#0d1117] text-foreground/90 overflow-x-auto scrollbar-thin">
                    {preview.content}
                  </pre>
                )}
              </ScrollArea>
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" onClick={() => handleCopy(preview)}>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDownload(preview)}>
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Download
                </Button>
                {preview.chat?.title && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    From: {preview.chat.title}
                  </span>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
