'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  RefreshCw,
  Edit,
  Trash2,
  FolderPlus,
  Sparkles,
  Hash,
  Globe,
  Layers,
  Type,
  FileCode,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Quote,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';
import Markdown from './markdown';

// ─── Types ────────────────────────────────────────────
type DocStatus = 'PENDING' | 'PROCESSING' | 'INDEXED' | 'FAILED';
type DocType = 'TEXT' | 'MARKDOWN' | 'PDF' | 'CODE' | 'HTML' | 'JSON' | 'CSV' | 'DOC';

export interface DocChunk {
  id: string;
  index: number;
  content: string;
  embeddingStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  tokenCount?: number;
  isCited?: boolean;
}

export interface ViewerDoc {
  id: string;
  title: string;
  content?: string;
  summary?: string | null;
  type: DocType;
  status: DocStatus;
  language?: string | null;
  wordCount?: number;
  charCount?: number;
  chunkCount?: number;
  embeddingStatus?: string | null;
  tags?: string[];
  categories?: string[];
  keywords?: string[];
  topics?: string[];
  collection?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  chunks?: DocChunk[];
  citedChunkIds?: string[];
}

// ─── Constants ────────────────────────────────────────
const DOC_TYPE_META: Record<DocType, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  TEXT: { icon: FileText, color: 'text-cyan-400 bg-cyan-500/10', label: 'Text' },
  MARKDOWN: { icon: FileText, color: 'text-teal-400 bg-teal-500/10', label: 'Markdown' },
  PDF: { icon: FileText, color: 'text-rose-400 bg-rose-500/10', label: 'PDF' },
  CODE: { icon: FileCode, color: 'text-amber-400 bg-amber-500/10', label: 'Code' },
  HTML: { icon: FileCode, color: 'text-orange-400 bg-orange-500/10', label: 'HTML' },
  JSON: { icon: FileCode, color: 'text-yellow-400 bg-yellow-500/10', label: 'JSON' },
  CSV: { icon: FileText, color: 'text-emerald-400 bg-emerald-500/10', label: 'CSV' },
  DOC: { icon: FileText, color: 'text-sky-400 bg-sky-500/10', label: 'Document' },
};

const STATUS_META: Record<DocStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: 'Pending', color: 'text-amber-300 bg-amber-500/10 border-amber-500/30', icon: Clock },
  PROCESSING: { label: 'Processing', color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30', icon: Loader2 },
  INDEXED: { label: 'Indexed', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 },
  FAILED: { label: 'Failed', color: 'text-rose-300 bg-rose-500/10 border-rose-500/30', icon: XCircle },
};

// ─── Sample chunks (for demo when API doesn't return them) ───
function buildSampleChunks(doc: ViewerDoc): DocChunk[] {
  if (!doc.content) return [];
  const paragraphs = doc.content.split(/\n\n+/).filter((p) => p.trim().length > 20);
  return paragraphs.slice(0, 12).map((p, i) => ({
    id: `${doc.id}-chunk-${i}`,
    index: i,
    content: p.slice(0, 200) + (p.length > 200 ? '…' : ''),
    embeddingStatus: doc.status === 'INDEXED' ? 'COMPLETED' : doc.status === 'FAILED' ? 'FAILED' : 'PENDING',
    tokenCount: Math.ceil(p.length / 4),
    isCited: i < 2, // first two chunks are "cited" for demo
  }));
}

// ─── Component ────────────────────────────────────────
export default function DocumentViewer({
  doc,
  open,
  onOpenChange,
  onReprocess,
  onDelete,
}: {
  doc: ViewerDoc | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onReprocess?: (doc: ViewerDoc) => void;
  onDelete?: (doc: ViewerDoc) => void;
}) {
  const [collectionToAdd, setCollectionToAdd] = useState('none');
  const [copied, setCopied] = useState(false);

  const chunks = useMemo<DocChunk[]>(() => {
    if (!doc) return [];
    if (doc.chunks && doc.chunks.length > 0) return doc.chunks;
    return buildSampleChunks(doc);
  }, [doc]);

  const citedCount = useMemo(
    () => chunks.filter((c) => c.isCited).length,
    [chunks]
  );

  if (!doc) return null;

  const typeMeta = DOC_TYPE_META[doc.type] || DOC_TYPE_META.TEXT;
  const statusMeta = STATUS_META[doc.status];
  const TypeIcon = typeMeta.icon;

  const handleDownload = () => {
    const blob = new Blob([doc.content || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/[^a-z0-9]+/gi, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Document downloaded');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(doc.content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success('Content copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 bg-background border-border overflow-hidden gap-0">
        <DialogHeader className="px-5 py-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className={cn('p-1.5 rounded', typeMeta.color)}>
              <TypeIcon className="h-4 w-4" />
            </div>
            <span className="truncate flex-1">{doc.title}</span>
            <Badge variant="outline" className={cn('text-[10px] gap-1 shrink-0', statusMeta.color)}>
              <statusMeta.icon className={cn('h-2.5 w-2.5', doc.status === 'PROCESSING' && 'animate-spin')} />
              {statusMeta.label}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_300px] min-h-0 overflow-hidden">
          {/* Main content area */}
          <div className="flex flex-col min-h-0 border-r border-border">
            {/* AI Summary */}
            {doc.summary && (
              <div className="shrink-0 px-5 py-3 border-b border-border bg-gradient-to-r from-cyan-500/5 to-background">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300 mb-0.5">
                      AI Summary
                    </div>
                    <p className="text-sm leading-relaxed">{doc.summary}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Document content with markdown rendering */}
            <ScrollArea className="flex-1 scrollbar-thin">
              <div className="px-5 py-4">
                <Markdown content={doc.content || '*No content available*'} />
              </div>
            </ScrollArea>

            {/* Action footer */}
            <div className="shrink-0 px-5 py-2.5 border-t border-border bg-muted/20 flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Download
              </Button>
              <Button size="sm" variant="outline" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              {onReprocess && (
                <Button size="sm" variant="outline" onClick={() => onReprocess(doc)}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Re-process
                </Button>
              )}
              <Button size="sm" variant="outline">
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
              {onDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive ml-auto"
                  onClick={() => onDelete(doc)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              )}
            </div>
          </div>

          {/* Sidebar: metadata + chunks */}
          <div className="flex flex-col min-h-0 bg-muted/10">
            <ScrollArea className="flex-1 scrollbar-thin">
              <div className="p-4 space-y-4">
                {/* Metadata */}
                <div>
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Metadata
                  </Label>
                  <div className="mt-1.5 rounded-lg border border-border/40 divide-y divide-border/40 text-xs">
                    <MetaRow label="Type" value={typeMeta.label} />
                    <MetaRow label="Status" value={statusMeta.label} />
                    {doc.language && <MetaRow label="Language" value={doc.language} icon={Globe} />}
                    {doc.wordCount !== undefined && (
                      <MetaRow label="Word count" value={String(doc.wordCount)} icon={Type} />
                    )}
                    {doc.charCount !== undefined && (
                      <MetaRow label="Char count" value={String(doc.charCount)} />
                    )}
                    {doc.chunkCount !== undefined && (
                      <MetaRow label="Chunk count" value={String(doc.chunkCount)} icon={Layers} />
                    )}
                    <MetaRow label="Embedding" value={doc.embeddingStatus || '—'} />
                    {doc.collection && <MetaRow label="Collection" value={doc.collection.name} />}
                    <MetaRow label="Created" value={new Date(doc.createdAt).toLocaleDateString()} icon={Clock} />
                    <MetaRow label="Updated" value={new Date(doc.updatedAt).toLocaleDateString()} icon={Clock} />
                  </div>
                </div>

                {/* Keywords */}
                {doc.keywords && doc.keywords.length > 0 && (
                  <div>
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Extracted Keywords
                    </Label>
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      {doc.keywords.map((k) => (
                        <Badge key={k} variant="secondary" className="text-[10px] gap-1">
                          <Hash className="h-2.5 w-2.5" />
                          {k}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Topics */}
                {doc.topics && doc.topics.length > 0 && (
                  <div>
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Detected Topics
                    </Label>
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      {doc.topics.map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {doc.tags && doc.tags.length > 0 && (
                  <div>
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Tags
                    </Label>
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      {doc.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Citation summary */}
                {citedCount > 0 && (
                  <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5">
                    <div className="flex items-center gap-2 text-xs">
                      <Quote className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="font-medium text-cyan-300">{citedCount} cited chunks</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      These chunks were referenced in recent RAG responses.
                    </p>
                  </div>
                )}

                {/* Chunk list */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Chunks ({chunks.length})
                    </Label>
                  </div>
                  <div className="space-y-1.5">
                    {chunks.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">
                        No chunks generated
                      </p>
                    ) : (
                      chunks.map((chunk) => (
                        <ChunkItem key={chunk.id} chunk={chunk} />
                      ))
                    )}
                  </div>
                </div>

                <Separator />

                {/* Add to collection */}
                <div>
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <FolderPlus className="h-3 w-3" />
                    Add to Collection
                  </Label>
                  <Select value={collectionToAdd} onValueChange={setCollectionToAdd}>
                    <SelectTrigger className="mt-1.5 h-8 bg-background text-xs">
                      <SelectValue placeholder="Select collection" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No collection</SelectItem>
                      <SelectItem value="eng">Engineering</SelectItem>
                      <SelectItem value="prod">Product Spec</SelectItem>
                      <SelectItem value="research">Research Papers</SelectItem>
                    </SelectContent>
                  </Select>
                  {collectionToAdd !== 'none' && (
                    <Button
                      size="sm"
                      className="w-full mt-2 h-7 bg-cyan-500 hover:bg-cyan-600 text-white text-xs"
                      onClick={() => {
                        toast.success('Added to collection');
                        setCollectionToAdd('none');
                      }}
                    >
                      <FolderPlus className="h-3 w-3 mr-1" />
                      Add to Collection
                    </Button>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ───────────────────────────────────
function MetaRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5">
      <span className="text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </span>
      <span className="font-medium text-right truncate ml-2 max-w-[60%]">{value}</span>
    </div>
  );
}

function ChunkItem({ chunk }: { chunk: DocChunk }) {
  const [expanded, setExpanded] = useState(false);
  const statusIcon = {
    COMPLETED: CheckCircle2,
    PENDING: Clock,
    FAILED: XCircle,
  }[chunk.embeddingStatus];
  const StatusIcon = statusIcon;
  const statusColor = {
    COMPLETED: 'text-emerald-400',
    PENDING: 'text-amber-400',
    FAILED: 'text-rose-400',
  }[chunk.embeddingStatus];

  return (
    <div
      className={cn(
        'rounded-md border p-2 text-xs transition cursor-pointer',
        chunk.isCited
          ? 'border-cyan-500/40 bg-cyan-500/5'
          : 'border-border/40 bg-background hover:border-cyan-500/20'
      )}
      onClick={() => setExpanded((e) => !e)}
    >
      <div className="flex items-center gap-2 mb-1">
        <StatusIcon className={cn('h-3 w-3 shrink-0', statusColor)} />
        <span className="font-mono text-[10px] text-muted-foreground">#{chunk.index}</span>
        {chunk.tokenCount !== undefined && (
          <span className="text-[10px] text-muted-foreground">{chunk.tokenCount} tok</span>
        )}
        {chunk.isCited && (
          <Badge variant="outline" className="text-[9px] ml-auto text-cyan-300 border-cyan-500/30 bg-cyan-500/10 gap-0.5">
            <Quote className="h-2.5 w-2.5" />
            Cited
          </Badge>
        )}
      </div>
      <p className={cn('text-muted-foreground leading-relaxed', expanded ? '' : 'line-clamp-2')}>
        {chunk.content}
      </p>
    </div>
  );
}
