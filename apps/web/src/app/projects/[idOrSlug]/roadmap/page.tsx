'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Workflow,
  Sparkles,
  Bot,
  RefreshCw,
  Copy,
  Plus,
  ClipboardList,
  MessageSquare,
  LayoutGrid,
  Trash2,
} from 'lucide-react';
import {
  createProjectRoadmapItem,
  deleteProjectRoadmapItem,
  fetchMyProjectRole,
  fetchProject,
  fetchProjectFeedbackInbox,
  fetchProjectRoadmap,
  fetchProjectRoadmapPipelineSummary,
  fetchRoadmapTaskPrompts,
  generateRoadmapTaskPrompt,
  queueProjectRoadmapDraft,
  type ProjectDetailResponse,
  type ProjectFeedbackInboxEntry,
  type ProjectFeedbackStatus,
  type RoadmapItemResponse,
  type RoadmapPriority,
  type RoadmapStatus,
  type RoadmapTaskPromptResponse,
  updateProjectFeedbackInboxItem,
  updateProjectRoadmapItem,
} from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const feedbackStatuses: ProjectFeedbackStatus[] = [
  'new',
  'reviewed',
  'planned',
  'rejected',
];

const roadmapStatuses: RoadmapStatus[] = [
  'proposed',
  'approved',
  'planned',
  'in_progress',
  'completed',
  'rejected',
];

const roadmapPriorities: RoadmapPriority[] = [
  'low',
  'medium',
  'high',
  'critical',
];

const KANBAN_COLUMNS: {
  status: RoadmapStatus;
  label: string;
  dot: string;
  includeStatuses: RoadmapStatus[];
}[] = [
  { status: 'proposed', label: 'Proposed', dot: 'bg-slate-400', includeStatuses: ['proposed', 'approved'] },
  { status: 'in_progress', label: 'In Progress', dot: 'bg-violet-400', includeStatuses: ['planned', 'in_progress'] },
  { status: 'completed', label: 'Completed', dot: 'bg-emerald-500', includeStatuses: ['completed'] },
  { status: 'rejected', label: 'Rejected', dot: 'bg-red-400', includeStatuses: ['rejected'] },
];

type ActiveTab = 'board' | 'feedback';

function formatStatusLabel(v: string) {
  return v.replace(/_/g, ' ');
}

function priorityColor(p: RoadmapPriority) {
  switch (p) {
    case 'critical':
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    case 'high':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
    case 'medium':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    case 'low':
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }
}

export default function ProjectRoadmapPage() {
  const params = useParams();
  const idOrSlug = params.idOrSlug as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [project, setProject] = useState<ProjectDetailResponse | null>(null);
  const [feedbackRows, setFeedbackRows] = useState<
    ProjectFeedbackInboxEntry[]
  >([]);
  const [roadmapRows, setRoadmapRows] = useState<RoadmapItemResponse[]>([]);
  const [pipelineSummary, setPipelineSummary] = useState<{
    feedbackByStatus: Record<ProjectFeedbackStatus, number>;
    roadmapByStatus: Record<RoadmapStatus, number>;
  } | null>(null);

  const [myRole, setMyRole] = useState<
    'lead' | 'contributor' | 'viewer' | null
  >(null);
  const canEdit = myRole === 'lead' || myRole === 'contributor';

  const [queuingDraft, setQueuingDraft] = useState(false);
  const [creatingItem, setCreatingItem] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [creatingPromptFor, setCreatingPromptFor] = useState<string | null>(
    null,
  );
  const [loadingPromptHistoryFor, setLoadingPromptHistoryFor] = useState<
    string | null
  >(null);

  const [promptHistory, setPromptHistory] = useState<
    Record<string, RoadmapTaskPromptResponse[]>
  >({});

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemProblem, setNewItemProblem] = useState('');
  const [newItemOutcome, setNewItemOutcome] = useState('');
  const [newItemPriority, setNewItemPriority] =
    useState<RoadmapPriority>('medium');

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [extraPromptContext, setExtraPromptContext] = useState<
    Record<string, string>
  >({});

  const [activeTab, setActiveTab] = useState<ActiveTab>('board');

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<RoadmapStatus | null>(null);

  /* ── Data loading ── */

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const projectData = await fetchProject(idOrSlug);
      setProject(projectData);

      const [feedbackRes, roadmapRes, pipelineRes, roleRes] =
        await Promise.allSettled([
          fetchProjectFeedbackInbox(projectData.id, { limit: 100 }),
          fetchProjectRoadmap(projectData.id, { limit: 100 }),
          fetchProjectRoadmapPipelineSummary(projectData.id),
          fetchMyProjectRole(projectData.id),
        ]);

      if (feedbackRes.status === 'fulfilled')
        setFeedbackRows(feedbackRes.value.data);
      else setFeedbackRows([]);

      if (roadmapRes.status === 'fulfilled')
        setRoadmapRows(roadmapRes.value.data);
      else setRoadmapRows([]);

      if (pipelineRes.status === 'fulfilled')
        setPipelineSummary(pipelineRes.value);
      else setPipelineSummary(null);

      if (roleRes.status === 'fulfilled') setMyRole(roleRes.value.role);
      else setMyRole(null);
    } catch {
      setError('Failed to load roadmap workspace');
    } finally {
      setLoading(false);
    }
  }, [idOrSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Derived state ── */

  const feedbackById = useMemo(() => {
    const map = new Map<string, ProjectFeedbackInboxEntry>();
    for (const row of feedbackRows) map.set(row.id, row);
    return map;
  }, [feedbackRows]);

  const groupedRoadmap = useMemo(() => {
    const groups: Record<RoadmapStatus, RoadmapItemResponse[]> = {
      proposed: [],
      approved: [],
      planned: [],
      in_progress: [],
      completed: [],
      rejected: [],
    };
    for (const item of roadmapRows) {
      groups[item.status]?.push(item);
    }
    return groups;
  }, [roadmapRows]);

  const selectedItem = useMemo(
    () =>
      selectedItemId
        ? roadmapRows.find((r) => r.id === selectedItemId) ?? null
        : null,
    [selectedItemId, roadmapRows],
  );

  const linkedFeedbackIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of roadmapRows) {
      for (const fbId of item.sourceFeedbackIds) ids.add(fbId);
    }
    return ids;
  }, [roadmapRows]);

  /* ── Handlers ── */

  const handleFeedbackStatusChange = async (
    feedbackId: string,
    status: ProjectFeedbackStatus,
  ) => {
    if (!project || !canEdit) return;
    try {
      const updated = await updateProjectFeedbackInboxItem(
        project.id,
        feedbackId,
        { status },
      );
      setFeedbackRows((prev) =>
        prev.map((row) => (row.id === feedbackId ? updated : row)),
      );
      toast('Feedback updated', 'success');
      const pipeline = await fetchProjectRoadmapPipelineSummary(project.id);
      setPipelineSummary(pipeline);
    } catch (err: any) {
      toast(err.message || 'Failed to update feedback status');
    }
  };

  const handleRoadmapStatusChange = async (
    itemId: string,
    status: RoadmapStatus,
  ) => {
    if (!project || !canEdit) return;
    try {
      const updated = await updateProjectRoadmapItem(project.id, itemId, {
        status,
      });
      setRoadmapRows((prev) =>
        prev.map((row) => (row.id === itemId ? updated : row)),
      );
      toast('Status updated', 'success');
      const pipeline = await fetchProjectRoadmapPipelineSummary(project.id);
      setPipelineSummary(pipeline);
    } catch (err: any) {
      toast(err.message || 'Failed to update roadmap item');
    }
  };

  const handleQueueDraft = async () => {
    if (!project || !canEdit) return;
    setQueuingDraft(true);
    try {
      await queueProjectRoadmapDraft(project.id, 6);
      toast(
        'AI roadmap draft queued. Refreshing in a few seconds...',
        'info',
      );
      setTimeout(() => loadData().catch(() => {}), 2500);
    } catch (err: any) {
      toast(err.message || 'Failed to queue AI draft');
    } finally {
      setQueuingDraft(false);
    }
  };

  const handleCreateRoadmapItem = async () => {
    if (!project || !canEdit) return;
    if (!newItemTitle.trim() || !newItemProblem.trim()) {
      toast('Title and problem are required');
      return;
    }
    setCreatingItem(true);
    try {
      const created = await createProjectRoadmapItem(project.id, {
        title: newItemTitle.trim(),
        problem: newItemProblem.trim(),
        outcome: newItemOutcome.trim() || undefined,
        priority: newItemPriority,
      });
      setRoadmapRows((prev) => [created, ...prev]);
      setNewItemTitle('');
      setNewItemProblem('');
      setNewItemOutcome('');
      setNewItemPriority('medium');
      setCreateDialogOpen(false);
      toast('Roadmap item created', 'success');
      const pipeline = await fetchProjectRoadmapPipelineSummary(project.id);
      setPipelineSummary(pipeline);
    } catch (err: any) {
      toast(err.message || 'Failed to create roadmap item');
    } finally {
      setCreatingItem(false);
    }
  };

  const handleGenerateTaskPrompt = async (itemId: string) => {
    if (!project || !canEdit) return;
    setCreatingPromptFor(itemId);
    try {
      const generated = await generateRoadmapTaskPrompt(
        project.id,
        itemId,
        { extraContext: extraPromptContext[itemId]?.trim() || undefined },
      );
      setRoadmapRows((prev) =>
        prev.map((row) =>
          row.id === itemId
            ? {
                ...row,
                latestTaskPrompt: generated.prompt,
                latestTaskChecklist: generated.tasks,
                status:
                  row.status === 'proposed' || row.status === 'approved'
                    ? 'planned'
                    : row.status,
              }
            : row,
        ),
      );
      setPromptHistory((prev) => ({
        ...prev,
        [itemId]: [generated, ...(prev[itemId] || [])],
      }));
      toast('Task prompt generated', 'success');
      const pipeline = await fetchProjectRoadmapPipelineSummary(project.id);
      setPipelineSummary(pipeline);
    } catch (err: any) {
      toast(err.message || 'Failed to generate task prompt');
    } finally {
      setCreatingPromptFor(null);
    }
  };

  const handleLoadPromptHistory = async (itemId: string) => {
    if (!project) return;
    setLoadingPromptHistoryFor(itemId);
    try {
      const res = await fetchRoadmapTaskPrompts(project.id, itemId, 10);
      setPromptHistory((prev) => ({ ...prev, [itemId]: res.data }));
    } catch (err: any) {
      toast(err.message || 'Failed to load prompt history');
    } finally {
      setLoadingPromptHistoryFor(null);
    }
  };

  const handleCopyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast('Prompt copied', 'success');
    } catch {
      toast('Failed to copy prompt');
    }
  };

  const handleDeleteRoadmapItem = async (itemId: string) => {
    if (!project || !canEdit) return;
    setDeletingItemId(itemId);
    try {
      await deleteProjectRoadmapItem(project.slug ?? project.id, itemId);
      setRoadmapRows((prev) => prev.filter((row) => row.id !== itemId));
      setSelectedItemId(null);
      toast('Roadmap item deleted', 'success');
      const pipeline = await fetchProjectRoadmapPipelineSummary(project.id);
      setPipelineSummary(pipeline);
    } catch (err: any) {
      toast(err.message || 'Failed to delete roadmap item');
    } finally {
      setDeletingItemId(null);
    }
  };

  /* ── Render ── */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] gap-3">
        <Workflow className="size-10 text-muted-foreground" />
        <p className="text-muted-foreground">{error || 'Project not found'}</p>
        <Link href="/projects">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            Back to Projects
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* ── Sticky header ── */}
      <div className="shrink-0 border-b bg-background">
        <div className="px-6 pt-5 pb-4 space-y-4 max-w-[1440px] mx-auto w-full">
          {/* Title row */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link
                href={`/projects/${project.slug}`}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-3.5" />
                Back to Project
              </Link>
              <h1 className="font-serif text-2xl font-semibold tracking-tight mt-1">
                Roadmap Pipeline
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {project.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => loadData()}>
                <RefreshCw className="size-3.5" />
                Refresh
              </Button>
              {canEdit && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="size-3.5" />
                    New Item
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleQueueDraft}
                    disabled={queuingDraft}
                  >
                    {queuingDraft ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    Generate AI Draft
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="New Feedback"
              value={pipelineSummary?.feedbackByStatus.new ?? 0}
            />
            <StatCard
              label="Proposed"
              value={pipelineSummary?.roadmapByStatus.proposed ?? 0}
            />
            <StatCard
              label="In Progress"
              value={
                (pipelineSummary?.roadmapByStatus.planned ?? 0) +
                (pipelineSummary?.roadmapByStatus.in_progress ?? 0)
              }
            />
            <StatCard
              label="Completed"
              value={pipelineSummary?.roadmapByStatus.completed ?? 0}
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('board')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'board'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <LayoutGrid className="size-3.5" />
              Board
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'feedback'
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <MessageSquare className="size-3.5" />
              Feedback Inbox
              {(pipelineSummary?.feedbackByStatus.new ?? 0) > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-red-500/15 text-red-600 dark:text-red-400 text-[10px] font-semibold min-w-[18px] h-[18px] px-1">
                  {pipelineSummary?.feedbackByStatus.new}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
        {/* Board tab — Kanban */}
        {activeTab === 'board' && (
          <div className="h-full w-full overflow-x-auto">
            <div className="flex gap-4 h-full p-4">
              {KANBAN_COLUMNS.map((col) => {
                const items = col.includeStatuses.flatMap(
                  (s) => groupedRoadmap[s],
                );
                const isOver = dragOverColumn === col.status;
                return (
                  <div
                    key={col.status}
                    className="flex flex-col flex-1 min-w-[220px]"
                  >
                    {/* Column header */}
                    <div className="flex items-center gap-2 px-2 pb-2.5">
                      <span
                        className={`size-2 rounded-full shrink-0 ${col.dot}`}
                      />
                      <span className="text-sm font-medium">
                        {col.label}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {items.length}
                      </span>
                    </div>

                    {/* Column body — drop zone */}
                    <div
                      className={`flex-1 overflow-y-auto space-y-2 rounded-xl p-2 min-h-[120px] transition-colors ${
                        isOver
                          ? 'bg-primary/10 ring-2 ring-primary/30'
                          : 'bg-muted/30'
                      }`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverColumn !== col.status)
                          setDragOverColumn(col.status);
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node))
                          setDragOverColumn(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverColumn(null);
                        const itemId =
                          draggedItemId ||
                          e.dataTransfer.getData('text/plain');
                        if (!itemId) return;
                        const item = roadmapRows.find(
                          (r) => r.id === itemId,
                        );
                        if (
                          item &&
                          !col.includeStatuses.includes(item.status)
                        ) {
                          handleRoadmapStatusChange(itemId, col.status);
                        }
                        setDraggedItemId(null);
                      }}
                    >
                      {items.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8 select-none">
                          No items
                        </p>
                      ) : (
                        items.map((item) => (
                          <div
                            key={item.id}
                            draggable={canEdit}
                            onDragStart={(e) => {
                              setDraggedItemId(item.id);
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData(
                                'text/plain',
                                item.id,
                              );
                            }}
                            onDragEnd={() => {
                              setDraggedItemId(null);
                              setDragOverColumn(null);
                            }}
                            onClick={() => setSelectedItemId(item.id)}
                            className={`w-full text-left rounded-lg border bg-background p-3 space-y-2 shadow-sm hover:shadow-md hover:border-foreground/20 transition-all cursor-pointer ${
                              canEdit ? 'cursor-grab active:cursor-grabbing' : ''
                            } ${draggedItemId === item.id ? 'opacity-40' : ''}`}
                          >
                            <p className="text-sm font-medium leading-snug">
                              {item.title}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${priorityColor(item.priority)}`}
                              >
                                {item.priority}
                              </span>
                              {item.effort && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4"
                                >
                                  {item.effort}
                                </Badge>
                              )}
                              {item.autoGenerated && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] h-4"
                                >
                                  AI
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {item.problem}
                            </p>
                            {item.sourceFeedbackIds.length > 0 && (
                              <p className="text-[10px] text-muted-foreground">
                                {item.sourceFeedbackIds.length} linked feedback
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Feedback tab */}
        {activeTab === 'feedback' && (
          <ScrollArea className="h-full">
            <div className="p-6 max-w-3xl mx-auto space-y-3">
              {feedbackRows.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-12">
                  No feedback yet.
                </p>
              ) : (
                feedbackRows.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="rounded-lg border bg-background p-4 space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">
                          {feedback.category}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          pain {feedback.painLevel ?? '-'}
                        </Badge>
                        {linkedFeedbackIds.has(feedback.id) && (
                          <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100">
                            Linked to roadmap
                          </Badge>
                        )}
                      </div>
                      <select
                        value={feedback.status}
                        onChange={(e) =>
                          handleFeedbackStatusChange(
                            feedback.id,
                            e.target.value as ProjectFeedbackStatus,
                          )
                        }
                        className="h-7 rounded border bg-background px-1.5 text-xs"
                        disabled={!canEdit}
                      >
                        {feedbackStatuses.map((status) => (
                          <option key={status} value={status}>
                            {formatStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </div>
                    {feedback.title && (
                      <p className="text-sm font-medium">{feedback.title}</p>
                    )}
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {feedback.content}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(feedback.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* ── Create Item Dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Roadmap Item</DialogTitle>
            <DialogDescription>
              Add a new item to the roadmap pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder="Title"
              disabled={creatingItem}
            />
            <textarea
              value={newItemProblem}
              onChange={(e) => setNewItemProblem(e.target.value)}
              placeholder="Problem statement"
              className="w-full min-h-[90px] rounded-md border bg-background px-3 py-2 text-sm"
              disabled={creatingItem}
            />
            <textarea
              value={newItemOutcome}
              onChange={(e) => setNewItemOutcome(e.target.value)}
              placeholder="Desired outcome (optional)"
              className="w-full min-h-[72px] rounded-md border bg-background px-3 py-2 text-sm"
              disabled={creatingItem}
            />
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Priority
              </label>
              <select
                value={newItemPriority}
                onChange={(e) =>
                  setNewItemPriority(e.target.value as RoadmapPriority)
                }
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                disabled={creatingItem}
              >
                {roadmapPriorities.map((p) => (
                  <option key={p} value={p}>
                    {formatStatusLabel(p)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creatingItem}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateRoadmapItem} disabled={creatingItem}>
              {creatingItem && <Loader2 className="size-3.5 animate-spin" />}
              Create Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Item Detail Dialog ── */}
      <Dialog
        open={!!selectedItem}
        onOpenChange={(open) => {
          if (!open) setSelectedItemId(null);
        }}
      >
        {selectedItem && (
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="space-y-1.5 pr-6">
                <div className="flex items-start justify-between gap-2">
                  <DialogTitle className="text-lg leading-snug">
                    {selectedItem.title}
                  </DialogTitle>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => {
                        if (window.confirm('Delete this roadmap item? This cannot be undone.')) {
                          handleDeleteRoadmapItem(selectedItem.id);
                        }
                      }}
                      disabled={deletingItemId === selectedItem.id}
                    >
                      {deletingItemId === selectedItem.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityColor(selectedItem.priority)}`}
                  >
                    {selectedItem.priority}
                  </span>
                  {selectedItem.effort && (
                    <Badge variant="outline" className="text-[10px]">
                      effort {selectedItem.effort}
                    </Badge>
                  )}
                  {selectedItem.autoGenerated && (
                    <Badge variant="secondary" className="text-[10px]">
                      AI draft
                    </Badge>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Status
                </label>
                <select
                  value={selectedItem.status}
                  onChange={(e) =>
                    handleRoadmapStatusChange(
                      selectedItem.id,
                      e.target.value as RoadmapStatus,
                    )
                  }
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  disabled={!canEdit}
                >
                  {roadmapStatuses.map((s) => (
                    <option key={s} value={s}>
                      {formatStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Problem */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Problem
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {selectedItem.problem}
                </p>
              </div>

              {/* Outcome */}
              {selectedItem.outcome && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Desired Outcome
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedItem.outcome}
                  </p>
                </div>
              )}

              {/* Linked feedback */}
              {selectedItem.sourceFeedbackIds.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    Linked Feedback
                  </p>
                  <div className="space-y-1.5">
                    {selectedItem.sourceFeedbackIds
                      .map((id) => feedbackById.get(id))
                      .filter(Boolean)
                      .slice(0, 5)
                      .map((fb) => (
                        <div
                          key={fb!.id}
                          className="rounded border p-2 text-xs text-muted-foreground"
                        >
                          {fb!.content}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Task prompt generation */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  AI Task Prompt
                </p>
                <textarea
                  value={extraPromptContext[selectedItem.id] || ''}
                  onChange={(e) =>
                    setExtraPromptContext((prev) => ({
                      ...prev,
                      [selectedItem.id]: e.target.value,
                    }))
                  }
                  placeholder="Optional extra context for prompt generation..."
                  className="w-full min-h-[60px] rounded-md border bg-background px-3 py-2 text-xs"
                  disabled={
                    !canEdit || creatingPromptFor === selectedItem.id
                  }
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      handleGenerateTaskPrompt(selectedItem.id)
                    }
                    disabled={
                      !canEdit || creatingPromptFor === selectedItem.id
                    }
                  >
                    {creatingPromptFor === selectedItem.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Bot className="size-3.5" />
                    )}
                    Generate Prompt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleLoadPromptHistory(selectedItem.id)
                    }
                    disabled={
                      loadingPromptHistoryFor === selectedItem.id
                    }
                  >
                    {loadingPromptHistoryFor === selectedItem.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <ClipboardList className="size-3.5" />
                    )}
                    History
                  </Button>
                </div>
              </div>

              {/* Latest task prompt */}
              {(selectedItem.latestTaskPrompt ||
                (promptHistory[selectedItem.id]?.length ?? 0) > 0) && (
                <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">
                      Latest Task Prompt
                    </p>
                    {selectedItem.latestTaskPrompt && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        onClick={() =>
                          handleCopyPrompt(
                            selectedItem.latestTaskPrompt ?? '',
                          )
                        }
                      >
                        <Copy className="size-3.5" />
                        Copy
                      </Button>
                    )}
                  </div>
                  {selectedItem.latestTaskPrompt && (
                    <pre className="text-xs whitespace-pre-wrap text-muted-foreground max-h-44 overflow-auto">
                      {selectedItem.latestTaskPrompt}
                    </pre>
                  )}
                  {selectedItem.latestTaskChecklist &&
                    selectedItem.latestTaskChecklist.length > 0 && (
                      <div className="space-y-1">
                        {selectedItem.latestTaskChecklist.map(
                          (task, idx) => (
                            <div
                              key={idx}
                              className="text-xs text-muted-foreground"
                            >
                              <p className="font-medium text-foreground/90">
                                {idx + 1}. {task.title}
                              </p>
                              <p>{task.description}</p>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                </div>
              )}

              {/* Prompt history */}
              {(promptHistory[selectedItem.id]?.length ?? 0) > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground font-medium">
                    Prompt History (
                    {promptHistory[selectedItem.id].length})
                  </summary>
                  <div className="mt-2 space-y-2">
                    {promptHistory[selectedItem.id].map((prompt) => (
                      <div
                        key={prompt.id}
                        className="rounded border p-2 bg-background"
                      >
                        <p className="text-[11px] text-muted-foreground mb-1">
                          {new Date(
                            prompt.createdAt,
                          ).toLocaleString()}{' '}
                          · {prompt.provider}/{prompt.model}
                        </p>
                        <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground max-h-36 overflow-auto">
                          {prompt.prompt}
                        </pre>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}
