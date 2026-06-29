'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, Pin, Plus, Search, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import { apiDelete, apiGet, apiPatch, apiPost, formatRelativeTime } from '@/lib/api-client';
import { toast } from 'sonner';
import Markdown from './markdown';

interface NoteItem {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  tags?: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string } | null;
}

export default function NotesView() {
  const { activeOrganizationId } = useAppStore();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<{ open: boolean; note: NoteItem | null }>({
    open: false,
    note: null,
  });

  const loadNotes = async () => {
    if (!activeOrganizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await apiGet<NoteItem[]>('/api/v1/notes', { organizationId: activeOrganizationId, limit: 100 });
    if (res.success && Array.isArray(res.data)) {
      setNotes(res.data);
    } else {
      setNotes([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotes();
  }, [activeOrganizationId]);

  const filtered = useMemo(() => {
    if (!search) return notes;
    const q = search.toLowerCase();
    return notes.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
  }, [notes, search]);

  const pinned = filtered.filter((n) => n.isPinned);
  const others = filtered.filter((n) => !n.isPinned);

  const handleSave = async (data: { title: string; content: string; isPinned: boolean }) => {
    if (!activeOrganizationId) return;
    if (editor.note) {
      const res = await apiPatch<NoteItem>(`/api/v1/notes/${editor.note.id}`, data);
      if (res.success && res.data) {
        setNotes((prev) => prev.map((n) => (n.id === editor.note!.id ? res.data! : n)));
        toast.success('Note updated');
      } else {
        toast.error(res.error || 'Failed to update note');
      }
    } else {
      const res = await apiPost<NoteItem>('/api/v1/notes', {
        ...data,
        organizationId: activeOrganizationId,
      });
      if (res.success && res.data) {
        setNotes((prev) => [res.data!, ...prev]);
        toast.success('Note created');
      } else {
        toast.error(res.error || 'Failed to create note');
      }
    }
    setEditor({ open: false, note: null });
  };

  const handleTogglePin = async (note: NoteItem) => {
    const next = { ...note, isPinned: !note.isPinned };
    setNotes((prev) => prev.map((n) => (n.id === note.id ? next : n)));
    await apiPatch(`/api/v1/notes/${note.id}`, { isPinned: next.isPinned });
  };

  const handleDelete = async (id: string) => {
    const prev = notes;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    try {
      await apiDelete(`/api/v1/notes/${id}`);
      toast.success('Note deleted');
    } catch {
      setNotes(prev);
      toast.error('Failed to delete note');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="h-14 shrink-0 border-b border-border flex items-center gap-3 px-4">
        <h2 className="text-lg font-semibold">Notes</h2>
        <Badge variant="secondary" className="h-5">{notes.length}</Badge>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="pl-8 h-9 w-64"
            />
          </div>
          <Button className="bg-brand-gradient text-white" onClick={() => setEditor({ open: true, note: null })}>
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 scrollbar-thin">
        <div className="p-4 space-y-6 max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Loading notes…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Edit3 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No notes yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">Create your first note to get started.</p>
              <Button className="bg-brand-gradient text-white" onClick={() => setEditor({ open: true, note: null })}>
                <Plus className="h-4 w-4 mr-1" />
                New Note
              </Button>
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <Section label="Pinned" count={pinned.length}>
                  <NoteGrid notes={pinned} onEdit={(n) => setEditor({ open: true, note: n })} onTogglePin={handleTogglePin} onDelete={handleDelete} />
                </Section>
              )}
              {others.length > 0 && (
                <Section label="All Notes" count={others.length}>
                  <NoteGrid notes={others} onEdit={(n) => setEditor({ open: true, note: n })} onTogglePin={handleTogglePin} onDelete={handleDelete} />
                </Section>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      <NoteEditor
        open={editor.open}
        note={editor.note}
        onClose={() => setEditor({ open: false, note: null })}
        onSave={handleSave}
      />
    </div>
  );
}

function Section({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h3>
        <Badge variant="secondary" className="h-4 px-1 text-[10px]">{count}</Badge>
      </div>
      {children}
    </div>
  );
}

function NoteGrid({
  notes,
  onEdit,
  onTogglePin,
  onDelete,
}: {
  notes: NoteItem[];
  onEdit: (n: NoteItem) => void;
  onTogglePin: (n: NoteItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {notes.map((n) => (
        <div
          key={n.id}
          className="group rounded-xl border border-border bg-card hover:border-brand/40 hover:shadow-md transition p-4 cursor-pointer flex flex-col"
          onClick={() => onEdit(n)}
        >
          <div className="flex items-start justify-between mb-1">
            <h4 className="text-sm font-semibold truncate flex-1">{n.title || 'Untitled'}</h4>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePin(n); }}
                className={cn('h-6 w-6 flex items-center justify-center rounded hover:bg-accent', n.isPinned && 'text-amber-400')}
              >
                <Pin className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground line-clamp-4 flex-1">
            <Markdown content={n.content || 'No content'} className="text-xs" />
          </div>
          <div className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/60">
            {formatRelativeTime(n.updatedAt)}
            {n.project && <span> · {n.project.name}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

function NoteEditor({
  open,
  note,
  onClose,
  onSave,
}: {
  open: boolean;
  note: NoteItem | null;
  onClose: () => void;
  onSave: (data: { title: string; content: string; isPinned: boolean }) => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(note?.title || '');
      setContent(note?.content || '');
      setIsPinned(note?.isPinned || false);
      setPreview(false);
    }
  }, [open, note]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{note ? 'Edit note' : 'New note'}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Button
            variant={preview ? 'ghost' : 'secondary'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setPreview(false)}
          >
            Write
          </Button>
          <Button
            variant={preview ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setPreview(true)}
          >
            Preview
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-7 text-xs ml-auto', isPinned && 'text-amber-400')}
            onClick={() => setIsPinned(!isPinned)}
          >
            <Pin className="h-3.5 w-3.5 mr-1" />
            {isPinned ? 'Pinned' : 'Pin'}
          </Button>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title"
            className="text-lg font-semibold h-10 border-0 px-0 focus-visible:ring-0"
          />
          {preview ? (
            <ScrollArea className="flex-1 scrollbar-thin">
              <div className="rounded-md border border-border bg-muted/20 p-4 min-h-[300px]">
                <Markdown content={content || '*Nothing to preview yet.*'} />
              </div>
            </ScrollArea>
          ) : (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write in Markdown... # headings, **bold**, - lists, ```code```"
              className="flex-1 resize-none border-0 focus-visible:ring-0 font-mono text-sm min-h-[300px]"
            />
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-brand-gradient text-white"
            onClick={() => onSave({ title: title.trim() || 'Untitled', content, isPinned })}
          >
            Save note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
