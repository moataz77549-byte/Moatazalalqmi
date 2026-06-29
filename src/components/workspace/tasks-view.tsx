'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Clock, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useAppStore } from '@/lib/store';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { toast } from 'sonner';

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: 'todo' | 'in-progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
  tags?: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string } | null;
}

type Status = 'todo' | 'in-progress' | 'done';

const COLUMNS: { id: Status; label: string; color: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'todo', label: 'Todo', color: 'border-t-slate-400', Icon: Circle },
  { id: 'in-progress', label: 'In Progress', color: 'border-t-amber-400', Icon: Clock },
  { id: 'done', label: 'Done', color: 'border-t-emerald-400', Icon: CheckCircle2 },
];

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
  medium: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  high: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  urgent: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
};

export default function TasksView() {
  const { activeOrganizationId } = useAppStore();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Status | null>(null);

  const loadTasks = async () => {
    if (!activeOrganizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await apiGet<TaskItem[]>('/api/v1/tasks', { organizationId: activeOrganizationId, limit: 100 });
    if (res.success && Array.isArray(res.data)) {
      setTasks(res.data);
    } else {
      setTasks([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTasks();
  }, [activeOrganizationId]);

  const tasksByStatus = (status: Status) => tasks.filter((t) => t.status === status);

  const handleDrop = async (status: Status) => {
    if (!draggingId) return;
    const task = tasks.find((t) => t.id === draggingId);
    if (!task || task.status === status) {
      setDraggingId(null);
      setDragOverCol(null);
      return;
    }
    const next = { ...task, status };
    setTasks((prev) => prev.map((t) => (t.id === draggingId ? next : t)));
    setDraggingId(null);
    setDragOverCol(null);
    try {
      await apiPatch(`/api/v1/tasks/${draggingId}`, { status, completedAt: status === 'done' ? new Date().toISOString() : null });
      toast.success(`Moved to ${status}`);
    } catch {
      toast.error('Failed to update task status');
    }
  };

  const handleDelete = async (id: string) => {
    const prev = tasks;
    setTasks((p) => p.filter((t) => t.id !== id));
    try {
      await apiDelete(`/api/v1/tasks/${id}`);
      toast.success('Task deleted');
    } catch {
      setTasks(prev);
      toast.error('Failed to delete task');
    }
  };

  const handleCreate = async (data: { title: string; description: string; status: Status; priority: TaskItem['priority'] }) => {
    if (!activeOrganizationId) return;
    const res = await apiPost<TaskItem>('/api/v1/tasks', { ...data, organizationId: activeOrganizationId });
    if (res.success && res.data) {
      setTasks((prev) => [res.data!, ...prev]);
      toast.success('Task created');
      setCreateOpen(false);
    } else {
      toast.error(res.error || 'Failed to create task');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="h-14 shrink-0 border-b border-border flex items-center gap-3 px-4">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <Badge variant="secondary" className="h-5">{tasks.length}</Badge>
        <Button className="ml-auto bg-brand-gradient text-white" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading tasks…</div>
      ) : tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No tasks yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Add a task to organize your work.</p>
            <Button className="bg-brand-gradient text-white" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Task
            </Button>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1 scrollbar-thin">
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-full">
            {COLUMNS.map((col) => (
              <div
                key={col.id}
                className={cn(
                  'rounded-xl border border-border border-t-2 bg-card/50 flex flex-col min-h-[400px] transition-colors',
                  col.color,
                  dragOverCol === col.id && 'ring-2 ring-brand/40 bg-brand/5'
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverCol(col.id);
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={() => handleDrop(col.id)}
              >
                <div className="px-3 py-2 flex items-center gap-2 border-b border-border/60">
                  <col.Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">{col.label}</span>
                  <Badge variant="secondary" className="ml-auto h-5 text-[10px]">
                    {tasksByStatus(col.id).length}
                  </Badge>
                </div>
                <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin min-h-[200px]">
                  {tasksByStatus(col.id).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDragStart={() => setDraggingId(task.id)}
                      onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                      onDelete={() => handleDelete(task.id)}
                    />
                  ))}
                  {tasksByStatus(col.id).length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-8">
                      Drop tasks here
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <TaskCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
    </div>
  );
}

function TaskCard({
  task,
  onDragStart,
  onDragEnd,
  onDelete,
}: {
  task: TaskItem;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="group rounded-lg border border-border bg-background p-3 cursor-grab active:cursor-grabbing hover:border-brand/40 hover:shadow-sm transition"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-snug">{task.title}</div>
          {task.description && (
            <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{task.description}</div>
          )}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <Badge variant="outline" className={cn('h-4 px-1.5 text-[10px] border', PRIORITY_COLORS[task.priority])}>
              {task.priority}
            </Badge>
            {task.project && (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                {task.project.name}
              </Badge>
            )}
            {task.dueDate && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function TaskCreateDialog({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { title: string; description: string; status: Status; priority: TaskItem['priority'] }) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Status>('todo');
  const [priority, setPriority] = useState<TaskItem['priority']>('medium');

  React.useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setStatus('todo');
      setPriority('medium');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-desc">Description (optional)</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Todo</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskItem['priority'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-brand-gradient text-white"
            disabled={!title.trim()}
            onClick={() => onCreate({ title: title.trim(), description: description.trim(), status, priority })}
          >
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
