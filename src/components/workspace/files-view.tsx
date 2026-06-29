'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Code2,
  File as FileIcon,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
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
import { useAppStore } from '@/lib/store';
import { apiDelete, apiGet, apiUpload, formatBytes, formatRelativeTime } from '@/lib/api-client';
import { toast } from 'sonner';

interface FileItem {
  id: string;
  name: string;
  originalName?: string;
  mimeType: string;
  size: number;
  url?: string | null;
  status?: string;
  createdAt: string;
  updatedAt: string;
  folder?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
}

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return ImageIcon;
  if (mime.includes('json') || mime.includes('javascript') || mime.includes('typescript') || mime.includes('text'))
    return Code2;
  if (mime.includes('pdf')) return FileText;
  return FileIcon;
}

function fileIconColor(mime: string) {
  if (mime.startsWith('image/')) return 'text-pink-400 bg-pink-500/10';
  if (mime.includes('pdf')) return 'text-rose-400 bg-rose-500/10';
  if (mime.includes('json') || mime.includes('javascript') || mime.includes('typescript'))
    return 'text-amber-400 bg-amber-500/10';
  if (mime.startsWith('text/')) return 'text-cyan-400 bg-cyan-500/10';
  return 'text-muted-foreground bg-muted/60';
}

export default function FilesView() {
  const { activeOrganizationId } = useAppStore();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadFiles = async () => {
    if (!activeOrganizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await apiGet<FileItem[]>('/api/v1/files', { organizationId: activeOrganizationId, limit: 100 });
    if (res.success && Array.isArray(res.data)) {
      setFiles(res.data);
    } else {
      setFiles([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFiles();
  }, [activeOrganizationId]);

  const filtered = useMemo(() => {
    if (!search) return files;
    const q = search.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(q));
  }, [files, search]);

  const handleUpload = async (filesToUpload: FileList | File[]) => {
    if (!activeOrganizationId) {
      toast.error('No active organization');
      return;
    }
    setUploading(true);
    const list = Array.from(filesToUpload);
    for (const f of list) {
      const fd = new FormData();
      fd.append('file', f);
      fd.append('organizationId', activeOrganizationId);
      const res = await apiUpload<FileItem>('/api/v1/files', fd);
      if (res.success && res.data) {
        setFiles((prev) => [res.data!, ...prev]);
        toast.success(`Uploaded ${f.name}`);
      } else {
        toast.error(res.error || `Failed to upload ${f.name}`);
      }
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    const prev = files;
    setFiles((p) => p.filter((f) => f.id !== id));
    try {
      await apiDelete(`/api/v1/files/${id}`);
      toast.success('File deleted');
    } catch {
      setFiles(prev);
      toast.error('Failed to delete file');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="h-14 shrink-0 border-b border-border flex items-center gap-3 px-4">
        <h2 className="text-lg font-semibold">Files</h2>
        <Badge variant="secondary" className="h-5">{files.length}</Badge>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              className="pl-8 h-9 w-64"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
          >
            {view === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          </Button>
          <Button
            className="bg-brand-gradient text-white"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length > 0) handleUpload(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition mb-4',
              dragOver
                ? 'border-brand bg-brand/5'
                : 'border-border hover:border-brand/40 hover:bg-accent/20'
            )}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-brand" />
            <p className="text-sm font-medium">Drag & drop files here, or click to select</p>
            <p className="text-xs text-muted-foreground mt-1">
              Images, documents, code, JSON — up to 50MB each.
            </p>
            {uploading && (
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-brand">
                <div className="h-3 w-3 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
                Uploading…
              </div>
            )}
          </div>

          {/* Files list */}
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Loading files…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">
                {search ? 'No files match your search.' : 'No files uploaded yet.'}
              </p>
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((f) => {
                const Icon = fileIcon(f.mimeType);
                return (
                  <div
                    key={f.id}
                    className="group rounded-xl border border-border bg-card hover:border-brand/40 hover:shadow-md transition p-3 cursor-pointer"
                    onClick={() => setPreview(f)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', fileIconColor(f.mimeType))}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(f.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-sm font-medium truncate">{f.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-2">
                      <span>{formatBytes(f.size)}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(f.updatedAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Name</th>
                    <th className="text-left px-3 py-2 font-medium hidden sm:table-cell">Type</th>
                    <th className="text-left px-3 py-2 font-medium">Size</th>
                    <th className="text-left px-3 py-2 font-medium hidden md:table-cell">Modified</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((f) => {
                    const Icon = fileIcon(f.mimeType);
                    return (
                      <tr
                        key={f.id}
                        className="border-t border-border hover:bg-accent/30 cursor-pointer"
                        onClick={() => setPreview(f)}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className={cn('h-7 w-7 rounded-md flex items-center justify-center', fileIconColor(f.mimeType))}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span className="truncate max-w-[280px]">{f.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell text-xs">{f.mimeType}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs">{formatBytes(f.size)}</td>
                        <td className="px-3 py-2 text-muted-foreground text-xs hidden md:table-cell">{formatRelativeTime(f.updatedAt)}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(f.id);
                            }}
                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Preview modal */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = fileIcon(preview.mimeType);
                    return <Icon className="h-4 w-4 text-brand" />;
                  })()}
                  {preview.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {preview.mimeType.startsWith('image/') && preview.url ? (
                  <img src={preview.url} alt={preview.name} className="w-full rounded-lg" />
                ) : (
                  <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Preview not available for this file type.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Type:</span> {preview.mimeType}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Size:</span> {formatBytes(preview.size)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Uploaded:</span> {formatRelativeTime(preview.createdAt)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span> {preview.status || 'COMPLETED'}
                  </div>
                </div>
                {preview.url && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      window.open(preview.url!, '_blank');
                    }}
                  >
                    Open original
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
