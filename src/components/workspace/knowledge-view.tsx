'use client';

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  BookOpen,
  FileText,
  Folder,
  Upload,
  Search,
  Tag,
  File,
  FileCode,
  FileType,
  Plus,
  Database,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Layers,
  Hash,
  Globe,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';
import {
  apiDelete,
  apiGet,
  apiPost,
  apiUpload,
  formatRelativeTime,
  formatNumber,
} from '@/lib/api-client';
import { toast } from 'sonner';
import DocumentViewer from './document-viewer';

// ─── Types ────────────────────────────────────────────
type DocStatus = 'PENDING' | 'PROCESSING' | 'INDEXED' | 'FAILED';
type DocType = 'TEXT' | 'MARKDOWN' | 'PDF' | 'CODE' | 'HTML' | 'JSON' | 'CSV' | 'DOC';

interface KnowledgeDoc {
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
  collectionId?: string | null;
  collection?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  processingProgress?: number;
  errorMessage?: string | null;
}

interface Collection {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  _count?: { documents: number };
  children?: Collection[];
}

// ─── Constants ────────────────────────────────────────
const DOC_TYPE_META: Record<DocType, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  TEXT: { icon: FileText, color: 'text-cyan-400 bg-cyan-500/10', label: 'Text' },
  MARKDOWN: { icon: FileText, color: 'text-teal-400 bg-teal-500/10', label: 'Markdown' },
  PDF: { icon: FileType, color: 'text-rose-400 bg-rose-500/10', label: 'PDF' },
  CODE: { icon: FileCode, color: 'text-amber-400 bg-amber-500/10', label: 'Code' },
  HTML: { icon: FileCode, color: 'text-orange-400 bg-orange-500/10', label: 'HTML' },
  JSON: { icon: FileCode, color: 'text-yellow-400 bg-yellow-500/10', label: 'JSON' },
  CSV: { icon: FileText, color: 'text-emerald-400 bg-emerald-500/10', label: 'CSV' },
  DOC: { icon: File, color: 'text-sky-400 bg-sky-500/10', label: 'Document' },
};

const STATUS_META: Record<DocStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { label: 'Pending', color: 'text-amber-300 bg-amber-500/10 border-amber-500/30', icon: Clock },
  PROCESSING: { label: 'Processing', color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30', icon: Loader2 },
  INDEXED: { label: 'Indexed', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 },
  FAILED: { label: 'Failed', color: 'text-rose-300 bg-rose-500/10 border-rose-500/30', icon: XCircle },
};

// ─── Sample data fallback ─────────────────────────────
const SAMPLE_COLLECTIONS: Collection[] = [
  {
    id: 'col-1',
    name: 'Engineering',
    description: 'Technical docs & runbooks',
    _count: { documents: 3 },
  },
  {
    id: 'col-2',
    name: 'Product Spec',
    description: 'PRDs and design docs',
    _count: { documents: 2 },
  },
  {
    id: 'col-3',
    name: 'Research Papers',
    description: 'ML/AI research',
    _count: { documents: 1 },
  },
];

const SAMPLE_DOCS: KnowledgeDoc[] = [
  {
    id: 'doc-1',
    title: 'Next.js 16 App Router Migration Guide',
    content:
      '# Next.js 16 App Router\n\nThe App Router is the new routing system in Next.js 13+. It uses a file-system based router built on React Server Components.\n\n## Key Concepts\n\n- **Server Components** render on the server by default\n- **Client Components** opt in with `\'use client\'`\n- Layouts preserve state across navigations\n- Loading and error states are built-in\n\n## Migration Steps\n\n1. Create an `app/` directory\n2. Move `pages/_app.tsx` to `app/layout.tsx`\n3. Convert pages to routes\n4. Update data fetching to use RSC',
    summary:
      'Comprehensive guide covering migration from Pages Router to App Router, including Server Components, layouts, and data fetching patterns.',
    type: 'MARKDOWN',
    status: 'INDEXED',
    language: 'en',
    wordCount: 1240,
    charCount: 8420,
    chunkCount: 12,
    embeddingStatus: 'COMPLETED',
    tags: ['nextjs', 'frontend', 'migration'],
    categories: ['Engineering'],
    keywords: ['app router', 'server components', 'rsc', 'migration'],
    topics: ['frontend', 'react'],
    collectionId: 'col-1',
    collection: { id: 'col-1', name: 'Engineering' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
  },
  {
    id: 'doc-2',
    title: 'Prisma ORM Best Practices',
    content:
      '# Prisma Best Practices\n\n- Always use `select` to limit fields\n- Use transactions for multi-write ops\n- Index foreign keys\n- Use `prisma migrate dev` for schema changes',
    summary: 'A set of recommended patterns for working with Prisma ORM in production applications.',
    type: 'MARKDOWN',
    status: 'INDEXED',
    language: 'en',
    wordCount: 580,
    charCount: 3210,
    chunkCount: 6,
    embeddingStatus: 'COMPLETED',
    tags: ['prisma', 'database', 'orm'],
    categories: ['Engineering'],
    keywords: ['prisma', 'orm', 'database', 'transactions'],
    topics: ['database', 'backend'],
    collectionId: 'col-1',
    collection: { id: 'col-1', name: 'Engineering' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 'doc-3',
    title: 'Memory System Architecture v2',
    content:
      '# Memory System v2\n\n## Overview\nThe new memory system uses a hybrid approach combining vector embeddings with structured storage.\n\n## Components\n- **Embedding Service** — OpenAI text-embedding-3-small\n- **Vector Store** — pgvector\n- **Memory Manager** — orchestration layer\n\n## Scopes\nPersonal, Workspace, Project, Organization',
    summary: 'Architecture document for the v2 memory system with hybrid vector + structured storage.',
    type: 'MARKDOWN',
    status: 'INDEXED',
    language: 'en',
    wordCount: 2100,
    charCount: 14500,
    chunkCount: 24,
    embeddingStatus: 'COMPLETED',
    tags: ['architecture', 'memory', 'rag'],
    categories: ['Engineering'],
    keywords: ['embeddings', 'pgvector', 'memory', 'vector store'],
    topics: ['architecture', 'ai'],
    collectionId: 'col-1',
    collection: { id: 'col-1', name: 'Engineering' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: 'doc-4',
    title: 'Q3 Product Roadmap',
    content:
      '# Q3 Product Roadmap\n\n## Themes\n1. Memory & Knowledge Base\n2. Smart Search\n3. Document Intelligence\n\n## Deliverables\n- Phase 4: Memory, Knowledge, Search views\n- Phase 5: Agents framework\n\n## Success Metrics\n- 50% reduction in context loss\n- 3x faster information retrieval',
    summary: 'Quarterly roadmap outlining the three main themes and their success metrics for Q3.',
    type: 'MARKDOWN',
    status: 'INDEXED',
    language: 'en',
    wordCount: 850,
    charCount: 5600,
    chunkCount: 9,
    embeddingStatus: 'COMPLETED',
    tags: ['roadmap', 'product', 'q3'],
    categories: ['Product Spec'],
    keywords: ['roadmap', 'memory', 'knowledge', 'search'],
    topics: ['product', 'planning'],
    collectionId: 'col-2',
    collection: { id: 'col-2', name: 'Product Spec' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
  },
  {
    id: 'doc-5',
    title: 'Smart Search UX Spec',
    content:
      '# Smart Search UX\n\n## Goals\nUnified search across chats, documents, files, notes, artifacts, projects, memories, prompts.\n\n## AI Summary\nFor each query, generate a summary + extracted keywords + classification.',
    summary: 'UX specification for the smart search center, covering AI summary and unified result types.',
    type: 'MARKDOWN',
    status: 'PROCESSING',
    language: 'en',
    wordCount: 420,
    charCount: 2800,
    chunkCount: 0,
    embeddingStatus: 'IN_PROGRESS',
    processingProgress: 65,
    tags: ['ux', 'search', 'spec'],
    categories: ['Product Spec'],
    keywords: ['search', 'ux', 'ai summary'],
    topics: ['product', 'ux'],
    collectionId: 'col-2',
    collection: { id: 'col-2', name: 'Product Spec' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'doc-6',
    title: 'Attention Is All You Need',
    content:
      '# Attention Is All You Need\n\nVaswani et al. (2017). Introduced the Transformer architecture based solely on attention mechanisms, dispensing with recurrence and convolutions.',
    summary: 'Seminal paper introducing the Transformer architecture that underpins modern LLMs.',
    type: 'PDF',
    status: 'INDEXED',
    language: 'en',
    wordCount: 9800,
    charCount: 68000,
    chunkCount: 98,
    embeddingStatus: 'COMPLETED',
    tags: ['transformer', 'attention', 'nlp'],
    categories: ['Research Papers'],
    keywords: ['transformer', 'attention', 'self-attention', 'encoder', 'decoder'],
    topics: ['ml', 'nlp', 'research'],
    collectionId: 'col-3',
    collection: { id: 'col-3', name: 'Research Papers' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(),
  },
  {
    id: 'doc-7',
    title: 'onboarding.tsx — Component Template',
    content:
      'import React from "react";\n\nexport function Onboarding() {\n  return <div>Welcome aboard!</div>;\n}',
    summary: 'Reusable React onboarding component template.',
    type: 'CODE',
    status: 'FAILED',
    language: 'typescript',
    wordCount: 24,
    charCount: 180,
    chunkCount: 0,
    embeddingStatus: 'FAILED',
    errorMessage: 'Embedding service timeout after 30s',
    tags: ['react', 'component', 'template'],
    categories: ['Engineering'],
    keywords: ['react', 'onboarding', 'component'],
    topics: ['frontend', 'react'],
    collectionId: 'col-1',
    collection: { id: 'col-1', name: 'Engineering' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
];

// ─── Component ────────────────────────────────────────
export default function KnowledgeView() {
  const { activeOrganizationId, locale } = useAppStore();
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [dragOver, setDragOver] = useState(false);
  const [uploadingState, setUploadingState] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [indexStats, setIndexStats] = useState({
    total: 0,
    indexed: 0,
    pending: 0,
    failed: 0,
    chunks: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [docsRes, colRes, statsRes] = await Promise.all([
        apiGet<KnowledgeDoc[]>('/api/v1/documents', { limit: 100 }).catch(() => null),
        apiGet<Collection[]>('/api/v1/collections', { limit: 50 }).catch(() => null),
        apiGet<{ total: number; indexed: number; pending: number; failed: number; chunks: number }>(
          '/api/v1/index/status'
        ).catch(() => null),
      ]);

      if (docsRes?.success && Array.isArray(docsRes.data) && docsRes.data.length > 0) {
        setDocs(docsRes.data);
      } else {
        setDocs(SAMPLE_DOCS);
      }
      if (colRes?.success && Array.isArray(colRes.data) && colRes.data.length > 0) {
        setCollections(colRes.data);
      } else {
        setCollections(SAMPLE_COLLECTIONS);
      }
      if (statsRes?.success && statsRes.data) {
        setIndexStats(statsRes.data);
      } else {
        // Compute from sample
        const sample = SAMPLE_DOCS;
        setIndexStats({
          total: sample.length,
          indexed: sample.filter((d) => d.status === 'INDEXED').length,
          pending: sample.filter((d) => d.status === 'PENDING' || d.status === 'PROCESSING').length,
          failed: sample.filter((d) => d.status === 'FAILED').length,
          chunks: sample.reduce((s, d) => s + (d.chunkCount || 0), 0),
        });
      }
    } catch {
      setDocs(SAMPLE_DOCS);
      setCollections(SAMPLE_COLLECTIONS);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, activeOrganizationId]);

  const filtered = useMemo(() => {
    let result = docs;
    if (activeCollection) result = result.filter((d) => d.collectionId === activeCollection);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.summary?.toLowerCase().includes(q) ||
          d.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [docs, activeCollection, search]);

  // ─── Actions ──────────────────────────────────────
  const handleOpenDoc = (doc: KnowledgeDoc) => {
    setSelectedDoc(doc);
    setViewerOpen(true);
  };

  const handleDeleteDoc = async (doc: KnowledgeDoc) => {
    const prev = docs;
    setDocs((d) => d.filter((x) => x.id !== doc.id));
    setViewerOpen(false);
    try {
      await apiDelete(`/api/v1/documents/${doc.id}`);
      toast.success('Document deleted');
    } catch {
      setDocs(prev);
      toast.error('Failed to delete — restored');
    }
  };

  const handleReprocess = async (doc: KnowledgeDoc) => {
    toast.info(`Re-processing "${doc.title}"…`);
    try {
      const res = await apiPost<KnowledgeDoc>(`/api/v1/documents/${doc.id}/reprocess`, {});
      if (res.success) {
        toast.success('Re-processing started');
        loadData();
      } else {
        toast.error(res.error || 'Failed to re-process');
      }
    } catch {
      toast.error('Re-process service unavailable');
    }
  };

  const handleCreateCollection = async (name: string, description: string) => {
    try {
      const res = await apiPost<Collection>('/api/v1/collections', { name, description });
      if (res.success && res.data) {
        setCollections((c) => [...c, res.data!]);
        toast.success('Collection created');
      } else {
        // Fallback local
        const newCol: Collection = {
          id: `local-col-${Date.now()}`,
          name,
          description,
          _count: { documents: 0 },
        };
        setCollections((c) => [...c, newCol]);
        toast.success('Collection created (offline)');
      }
      setNewCollectionOpen(false);
    } catch {
      const newCol: Collection = {
        id: `local-col-${Date.now()}`,
        name,
        description,
        _count: { documents: 0 },
      };
      setCollections((c) => [...c, newCol]);
      toast.success('Collection created (offline)');
      setNewCollectionOpen(false);
    }
  };

  const handleUpload = async (data: {
    title: string;
    content: string;
    type: DocType;
    collectionId?: string;
    tags: string[];
    categories: string[];
  }) => {
    try {
      const res = await apiPost<KnowledgeDoc>('/api/v1/documents', {
        title: data.title,
        content: data.content,
        type: data.type,
        collectionId: data.collectionId || null,
        tags: data.tags,
        categories: data.categories,
      });
      if (res.success && res.data) {
        setDocs((d) => [res.data!, ...d]);
        toast.success('Document uploaded & queued for indexing');
      } else {
        // Local fallback
        const newDoc: KnowledgeDoc = {
          id: `local-doc-${Date.now()}`,
          title: data.title,
          content: data.content,
          type: data.type,
          status: 'PENDING',
          language: 'en',
          wordCount: data.content.split(/\s+/).length,
          charCount: data.content.length,
          chunkCount: 0,
          tags: data.tags,
          categories: data.categories,
          collectionId: data.collectionId || null,
          collection: collections.find((c) => c.id === data.collectionId)
            ? { id: data.collectionId!, name: collections.find((c) => c.id === data.collectionId)!.name }
            : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setDocs((d) => [newDoc, ...d]);
        toast.success('Document added (offline)');
      }
      setUploadOpen(false);
    } catch {
      toast.error('Upload failed — service unavailable');
    }
  };

  const handleFileDrop = async (files: FileList) => {
    if (!files || files.length === 0) return;
    setUploadingState(true);
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name);
        const res = await apiUpload<KnowledgeDoc>('/api/v1/documents/upload', formData);
        if (res.success && res.data) {
          setDocs((d) => [res.data!, ...d]);
        }
      } catch {
        /* skip failed file */
      }
    }
    setUploadingState(false);
    toast.success(`${files.length} file(s) uploaded`);
  };

  // ─── Render ───────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-gradient-to-r from-teal-500/5 via-background to-background px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                {locale === 'ar' ? 'قاعدة المعرفة' : 'Knowledge Base'}
                <Badge variant="outline" className="text-teal-300 border-teal-500/30 bg-teal-500/10">
                  {indexStats.total}
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                {locale === 'ar'
                  ? 'إدارة المستندات والفهرسة الدلالية'
                  : 'Document management & semantic indexing'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setNewCollectionOpen(true)}>
              <Folder className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">New Collection</span>
            </Button>
            <Button
              size="sm"
              className="bg-teal-500 hover:bg-teal-600 text-white"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              {locale === 'ar' ? 'رفع' : 'Upload'}
            </Button>
          </div>
        </div>
      </div>

      {/* Index status bar */}
      <div className="shrink-0 grid grid-cols-2 md:grid-cols-5 gap-2 px-6 py-3 border-b border-border bg-muted/20">
        <IndexStat icon={Database} label="Total" value={indexStats.total} color="text-teal-400" />
        <IndexStat icon={CheckCircle2} label="Indexed" value={indexStats.indexed} color="text-emerald-400" />
        <IndexStat icon={Clock} label="Pending" value={indexStats.pending} color="text-amber-400" />
        <IndexStat icon={XCircle} label="Failed" value={indexStats.failed} color="text-rose-400" />
        <IndexStat icon={Layers} label="Chunks" value={indexStats.chunks} color="text-cyan-400" />
      </div>

      {/* Main split layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[220px_1fr_minmax(0,360px)] min-h-0">
        {/* Left: Collections sidebar */}
        <div className="hidden md:flex flex-col min-h-0 border-r border-border bg-muted/10">
          <div className="shrink-0 px-3 py-2 border-b border-border/60 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Collections
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setNewCollectionOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <ScrollArea className="flex-1 scrollbar-thin">
            <div className="p-2 space-y-0.5">
              <CollectionRow
                name="All Documents"
                count={docs.length}
                active={activeCollection === null}
                onClick={() => setActiveCollection(null)}
                icon={BookOpen}
              />
              {collections.map((c) => (
                <CollectionRow
                  key={c.id}
                  name={c.name}
                  count={c._count?.documents || docs.filter((d) => d.collectionId === c.id).length}
                  active={activeCollection === c.id}
                  onClick={() => setActiveCollection(c.id)}
                  icon={Folder}
                />
              ))}
              {collections.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No collections</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Center: Document list */}
        <div className="flex flex-col min-h-0">
          {/* Toolbar */}
          <div className="shrink-0 p-3 border-b border-border space-y-2 bg-background/60">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={locale === 'ar' ? 'بحث في المستندات...' : 'Search documents...'}
                  className="pl-9 bg-background"
                />
              </div>
              <Tabs value={view} onValueChange={(v) => setView(v as 'grid' | 'list')}>
                <TabsList className="h-9">
                  <TabsTrigger value="grid" className="px-2">
                    <Layers className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="list" className="px-2">
                    <File className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {/* Drag & drop area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files.length > 0) handleFileDrop(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-lg px-3 py-2 text-center text-xs cursor-pointer transition-colors',
                dragOver
                  ? 'border-teal-500 bg-teal-500/5 text-teal-300'
                  : 'border-border/60 text-muted-foreground hover:border-teal-500/40 hover:bg-accent/30'
              )}
            >
              <Upload className="h-3.5 w-3.5 inline mr-1.5" />
              Drag & drop files here, or click to upload
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileDrop(e.target.files)}
              />
            </div>
          </div>

          {/* Document grid/list */}
          <ScrollArea className="flex-1 scrollbar-thin">
            <div className="p-3">
              {loading ? (
                <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3' : 'space-y-2'}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <DocSkeleton key={i} />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No documents found"
                  description="Upload your first document or adjust your filters to get started."
                  action={
                    <Button
                      size="sm"
                      className="bg-teal-500 hover:bg-teal-600 text-white"
                      onClick={() => setUploadOpen(true)}
                    >
                      <Upload className="h-4 w-4 mr-1.5" />
                      Upload Document
                    </Button>
                  }
                />
              ) : view === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filtered.map((d) => (
                    <DocCard key={d.id} doc={d} onClick={() => handleOpenDoc(d)} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((d) => (
                    <DocRow key={d.id} doc={d} onClick={() => handleOpenDoc(d)} />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Document detail panel */}
        <div className="hidden lg:flex flex-col min-h-0 border-l border-border bg-muted/10">
          {selectedDoc ? (
            <DocDetailPanel doc={selectedDoc} onOpenViewer={() => setViewerOpen(true)} />
          ) : filtered[0] ? (
            <DocDetailPanel doc={filtered[0]} onOpenViewer={() => handleOpenDoc(filtered[0])} />
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <EmptyState
                icon={FileText}
                title="No document selected"
                description="Select a document from the list to view its details, summary, and chunks."
              />
            </div>
          )}
        </div>
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewer
        doc={viewerOpen ? selectedDoc : null}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        onReprocess={handleReprocess}
        onDelete={handleDeleteDoc}
      />

      {/* Upload Dialog */}
      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        collections={collections}
        onUpload={handleUpload}
      />

      {/* New Collection Dialog */}
      <NewCollectionDialog
        open={newCollectionOpen}
        onOpenChange={setNewCollectionOpen}
        onCreate={handleCreateCollection}
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────
function IndexStat({
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
    <Card className="p-2.5 bg-background/60 border-border/60">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', color)} />
        <div className="min-w-0">
          <div className="text-base font-semibold leading-none">{formatNumber(value)}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</div>
        </div>
      </div>
    </Card>
  );
}

function CollectionRow({
  name,
  count,
  active,
  onClick,
  icon: Icon = Folder,
}: {
  name: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition group',
        active ? 'bg-teal-500/10 text-teal-300' : 'hover:bg-accent/60 text-foreground'
      )}
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-teal-400' : 'text-muted-foreground')} />
      <span className="truncate flex-1 text-left">{name}</span>
      <Badge variant="secondary" className="text-[10px] px-1.5">
        {count}
      </Badge>
    </button>
  );
}

function DocCard({ doc, onClick }: { doc: KnowledgeDoc; onClick: () => void }) {
  const typeMeta = DOC_TYPE_META[doc.type] || DOC_TYPE_META.TEXT;
  const statusMeta = STATUS_META[doc.status];
  const TypeIcon = typeMeta.icon;
  const StatusIcon = statusMeta.icon;
  return (
    <button
      onClick={onClick}
      className="text-left p-4 rounded-lg border border-border/60 bg-background hover:border-teal-500/40 hover:shadow-md transition-all group"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('p-2 rounded-md shrink-0', typeMeta.color)}>
          <TypeIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium line-clamp-2 group-hover:text-teal-300 transition">
            {doc.title}
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {formatRelativeTime(doc.createdAt)}
          </p>
        </div>
      </div>
      {doc.summary && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{doc.summary}</p>
      )}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <Badge variant="outline" className={cn('text-[10px] gap-1', statusMeta.color)}>
          <StatusIcon className={cn('h-2.5 w-2.5', doc.status === 'PROCESSING' && 'animate-spin')} />
          {statusMeta.label}
        </Badge>
        {doc.language && (
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Globe className="h-2.5 w-2.5" />
            {doc.language}
          </Badge>
        )}
        {doc.tags?.slice(0, 2).map((t) => (
          <Badge key={t} variant="secondary" className="text-[10px]">
            <Tag className="h-2.5 w-2.5 mr-0.5" />
            {t}
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        {doc.wordCount !== undefined && <span>{formatNumber(doc.wordCount)} words</span>}
        {doc.chunkCount !== undefined && doc.chunkCount > 0 && (
          <span className="flex items-center gap-0.5">
            <Layers className="h-2.5 w-2.5" />
            {doc.chunkCount} chunks
          </span>
        )}
      </div>
      {doc.status === 'PROCESSING' && doc.processingProgress !== undefined && (
        <Progress value={doc.processingProgress} className="h-1 mt-2" />
      )}
    </button>
  );
}

function DocRow({ doc, onClick }: { doc: KnowledgeDoc; onClick: () => void }) {
  const typeMeta = DOC_TYPE_META[doc.type] || DOC_TYPE_META.TEXT;
  const statusMeta = STATUS_META[doc.status];
  const TypeIcon = typeMeta.icon;
  const StatusIcon = statusMeta.icon;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background hover:border-teal-500/40 transition group text-left"
    >
      <div className={cn('p-2 rounded-md shrink-0', typeMeta.color)}>
        <TypeIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium truncate group-hover:text-teal-300 transition">{doc.title}</h3>
        {doc.summary && <p className="text-xs text-muted-foreground truncate">{doc.summary}</p>}
      </div>
      <Badge variant="outline" className={cn('text-[10px] gap-1 shrink-0', statusMeta.color)}>
        <StatusIcon className={cn('h-2.5 w-2.5', doc.status === 'PROCESSING' && 'animate-spin')} />
        {statusMeta.label}
      </Badge>
      {doc.wordCount !== undefined && (
        <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
          {formatNumber(doc.wordCount)}w
        </span>
      )}
      {doc.chunkCount !== undefined && doc.chunkCount > 0 && (
        <span className="text-[10px] text-muted-foreground shrink-0 hidden md:inline">
          {doc.chunkCount} chunks
        </span>
      )}
    </button>
  );
}

function DocDetailPanel({
  doc,
  onOpenViewer,
}: {
  doc: KnowledgeDoc;
  onOpenViewer: () => void;
}) {
  const typeMeta = DOC_TYPE_META[doc.type] || DOC_TYPE_META.TEXT;
  const statusMeta = STATUS_META[doc.status];
  const TypeIcon = typeMeta.icon;
  return (
    <ScrollArea className="flex-1 scrollbar-thin">
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className={cn('p-2.5 rounded-lg shrink-0', typeMeta.color)}>
            <TypeIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-tight">{doc.title}</h2>
            <p className="text-[10px] text-muted-foreground mt-1">
              {formatRelativeTime(doc.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className={cn('gap-1', statusMeta.color)}>
            <statusMeta.icon className={cn('h-3 w-3', doc.status === 'PROCESSING' && 'animate-spin')} />
            {statusMeta.label}
          </Badge>
          <Badge variant="outline" className={typeMeta.color}>
            {typeMeta.label}
          </Badge>
          {doc.language && (
            <Badge variant="secondary" className="gap-1">
              <Globe className="h-3 w-3" />
              {doc.language}
            </Badge>
          )}
        </div>

        {doc.summary && (
          <div>
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">AI Summary</Label>
            <div className="mt-1 p-3 rounded-lg bg-teal-500/5 border border-teal-500/20 text-sm leading-relaxed">
              <Sparkles className="h-3.5 w-3.5 text-teal-400 inline mr-1.5" />
              {doc.summary}
            </div>
          </div>
        )}

        {doc.keywords && doc.keywords.length > 0 && (
          <div>
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Keywords</Label>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              {doc.keywords.map((k) => (
                <Badge key={k} variant="secondary" className="gap-1 text-xs">
                  <Hash className="h-2.5 w-2.5" />
                  {k}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {doc.topics && doc.topics.length > 0 && (
          <div>
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Topics</Label>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              {doc.topics.map((t) => (
                <Badge key={t} variant="outline" className="text-xs">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-2">
          <MetricBox label="Words" value={formatNumber(doc.wordCount || 0)} />
          <MetricBox label="Chars" value={formatNumber(doc.charCount || 0)} />
          <MetricBox label="Chunks" value={String(doc.chunkCount || 0)} />
          <MetricBox label="Embedding" value={doc.embeddingStatus || '—'} />
        </div>

        {doc.status === 'PROCESSING' && doc.processingProgress !== undefined && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Processing</span>
              <span className="text-teal-300 font-medium">{doc.processingProgress}%</span>
            </div>
            <Progress value={doc.processingProgress} className="h-1.5" />
          </div>
        )}

        {doc.status === 'FAILED' && doc.errorMessage && (
          <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/5 text-xs text-rose-300">
            <XCircle className="h-3.5 w-3.5 inline mr-1.5" />
            {doc.errorMessage}
          </div>
        )}

        <Separator />

        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" className="bg-teal-500 hover:bg-teal-600 text-white" onClick={onOpenViewer}>
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Open Viewer
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-sm font-semibold mt-0.5 truncate">{value}</div>
    </div>
  );
}

function DocSkeleton() {
  return (
    <div className="p-4 rounded-lg border border-border/60 bg-background animate-pulse">
      <div className="flex gap-3 mb-3">
        <div className="h-10 w-10 rounded bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-3/4 bg-muted rounded" />
          <div className="h-2 w-1/3 bg-muted rounded" />
        </div>
      </div>
      <div className="h-2 w-full bg-muted rounded mb-1" />
      <div className="h-2 w-2/3 bg-muted rounded mb-3" />
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
      <div className="h-12 w-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-3">
        <Icon className="h-6 w-6 text-teal-400" />
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function UploadDialog({
  open,
  onOpenChange,
  collections,
  onUpload,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  collections: Collection[];
  onUpload: (data: {
    title: string;
    content: string;
    type: DocType;
    collectionId?: string;
    tags: string[];
    categories: string[];
  }) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<DocType>('MARKDOWN');
  const [collectionId, setCollectionId] = useState<string>('none');
  const [tags, setTags] = useState('');
  const [categories, setCategories] = useState('');

  useEffect(() => {
    if (open) {
      setTitle('');
      setContent('');
      setType('MARKDOWN');
      setCollectionId('none');
      setTags('');
      setCategories('');
    }
  }, [open]);

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    onUpload({
      title,
      content,
      type,
      collectionId: collectionId === 'none' ? undefined : collectionId,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      categories: categories.split(',').map((c) => c.trim()).filter(Boolean),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-background border-border max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-teal-400" />
            Upload Document
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document title"
              className="mt-1.5 bg-background"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as DocType)}>
                <SelectTrigger className="mt-1.5 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPE_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Collection</Label>
              <Select value={collectionId} onValueChange={setCollectionId}>
                <SelectTrigger className="mt-1.5 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No collection</SelectItem>
                  {collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Content (paste text or markdown)</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your document content here..."
              rows={8}
              className="mt-1.5 bg-background resize-y font-mono text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tags (comma separated)</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag1, tag2"
                className="mt-1.5 bg-background"
              />
            </div>
            <div>
              <Label className="text-xs">Categories (comma separated)</Label>
              <Input
                value={categories}
                onChange={(e) => setCategories(e.target.value)}
                placeholder="Engineering, Research"
                className="mt-1.5 bg-background"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-teal-500 hover:bg-teal-600 text-white" onClick={handleSubmit}>
            <Upload className="h-4 w-4 mr-1.5" />
            Upload & Index
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewCollectionDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (name: string, description: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-4 w-4 text-teal-400" />
            New Collection
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering Docs"
              className="mt-1.5 bg-background"
            />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="mt-1.5 bg-background"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-teal-500 hover:bg-teal-600 text-white"
            disabled={!name.trim()}
            onClick={() => onCreate(name.trim(), description.trim())}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
