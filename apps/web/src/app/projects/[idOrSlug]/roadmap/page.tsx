'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Workflow,
  Sparkles,
  CheckCircle2,
  ClipboardList,
  PencilLine,
  Bot,
  RefreshCw,
  Copy,
} from 'lucide-react';
import {
  createProjectRoadmapItem,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

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

function formatStatusLabel(value: string) {
  return value.replace(/_/g, ' ');
}

export default function ProjectRoadmapPage() {
  const params = useParams();
  const idOrSlug = params.idOrSlug as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [project, setProject] = useState<ProjectDetailResponse | null>(null);
  const [feedbackRows, setFeedbackRows] = useState<ProjectFeedbackInboxEntry[]>([]);
  const [roadmapRows, setRoadmapRows] = useState<RoadmapItemResponse[]>([]);
  const [pipelineSummary, setPipelineSummary] = useState<{
    feedbackByStatus: Record<ProjectFeedbackStatus, number>;
    roadmapByStatus: Record<RoadmapStatus, number>;
  } | null>(null);

  const [myRole, setMyRole] = useState<'lead' | 'contributor' | 'viewer' | null>(null);
  const canEdit = myRole === 'lead' || myRole === 'contributor';

  const [queuingDraft, setQueuingDraft] = useState(false);
  const [creatingItem, setCreatingItem] = useState(false);
  const [creatingPromptFor, setCreatingPromptFor] = useState<string | null>(null);
  const [loadingPromptHistoryFor, setLoadingPromptHistoryFor] = useState<string | null>(null);

  const [promptHistory, setPromptHistory] = useState<
    Record<string, RoadmapTaskPromptResponse[]>
  >({});

  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemProblem, setNewItemProblem] = useState('');
  const [newItemOutcome, setNewItemOutcome] = useState('');
  const [newItemPriority, setNewItemPriority] = useState<RoadmapPriority>('medium');
  const [extraPromptContext, setExtraPromptContext] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const projectData = await fetchProject(idOrSlug);
      setProject(projectData);

      const [feedbackRes, roadmapRes, pipelineRes, roleRes] = await Promise.allSettled([
        fetchProjectFeedbackInbox(projectData.id, { limit: 100 }),
        fetchProjectRoadmap(projectData.id, { limit: 100 }),
        fetchProjectRoadmapPipelineSummary(projectData.id),
        fetchMyProjectRole(projectData.id),
      ]);

      if (feedbackRes.status === 'fulfilled') {
        setFeedbackRows(feedbackRes.value.data);
      } else {
        setFeedbackRows([]);
      }

      if (roadmapRes.status === 'fulfilled') {
        setRoadmapRows(roadmapRes.value.data);
      } else {
        setRoadmapRows([]);
      }

      if (pipelineRes.status === 'fulfilled') {
        setPipelineSummary(pipelineRes.value);
      } else {
        setPipelineSummary(null);
      }

      if (roleRes.status === 'fulfilled') {
        setMyRole(roleRes.value.role);
      } else {
        setMyRole(null);
      }
    } catch {
      setError('Failed to load roadmap workspace');
    } finally {
      setLoading(false);
    }
  }, [idOrSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const feedbackById = useMemo(() => {
    const map = new Map<string, ProjectFeedbackInboxEntry>();
    for (const row of feedbackRows) map.set(row.id, row);
    return map;
  }, [feedbackRows]);

  const handleFeedbackStatusChange = async (
    feedbackId: string,
    status: ProjectFeedbackStatus,
  ) => {
    if (!project || !canEdit) return;

    try {
      const updated = await updateProjectFeedbackInboxItem(project.id, feedbackId, { status });
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

  const handleRoadmapStatusChange = async (itemId: string, status: RoadmapStatus) => {
    if (!project || !canEdit) return;

    try {
      const updated = await updateProjectRoadmapItem(project.id, itemId, { status });
      setRoadmapRows((prev) => prev.map((row) => (row.id === itemId ? updated : row)));
      toast('Roadmap item updated', 'success');
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
      toast('AI roadmap draft queued. Refreshing in a few seconds...', 'info');
      setTimeout(() => {
        loadData().catch(() => {});
      }, 2500);
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
      const generated = await generateRoadmapTaskPrompt(project.id, itemId, {
        extraContext: extraPromptContext[itemId]?.trim() || undefined,
      });

      setRoadmapRows((prev) =>
        prev.map((row) =>
          row.id === itemId
            ? {
                ...row,
                latestTaskPrompt: generated.prompt,
                latestTaskChecklist: generated.tasks,
                status: row.status === 'proposed' || row.status === 'approved'
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
      setPromptHistory((prev) => ({
        ...prev,
        [itemId]: res.data,
      }));
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href={`/projects/${project.slug}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" />
            Back to Project
          </Link>
          <h1 className="font-serif text-2xl font-semibold tracking-tight mt-1">
            Feedback -&gt; Roadmap -&gt; AI Task Prompts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {project.name} ({project.slug})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => loadData()}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          {canEdit && (
            <Button onClick={handleQueueDraft} disabled={queuingDraft}>
              {queuingDraft ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Generate AI Draft
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Feedback (new)"
          value={pipelineSummary?.feedbackByStatus.new ?? 0}
        />
        <StatCard
          label="Roadmap (proposed)"
          value={pipelineSummary?.roadmapByStatus.proposed ?? 0}
        />
        <StatCard
          label="Roadmap (planned+)"
          value={
            (pipelineSummary?.roadmapByStatus.planned ?? 0) +
            (pipelineSummary?.roadmapByStatus.in_progress ?? 0) +
            (pipelineSummary?.roadmapByStatus.completed ?? 0)
          }
        />
        <StatCard
          label="Roadmap (completed)"
          value={pipelineSummary?.roadmapByStatus.completed ?? 0}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PencilLine className="size-4" />
            Create Roadmap Item
          </CardTitle>
          <CardDescription>
            Add manually or let AI generate proposed items from feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder="Roadmap item title"
            disabled={!canEdit || creatingItem}
          />
          <textarea
            value={newItemProblem}
            onChange={(e) => setNewItemProblem(e.target.value)}
            placeholder="Problem statement"
            className="w-full min-h-[90px] rounded-md border bg-background px-3 py-2 text-sm"
            disabled={!canEdit || creatingItem}
          />
          <textarea
            value={newItemOutcome}
            onChange={(e) => setNewItemOutcome(e.target.value)}
            placeholder="Desired outcome (optional)"
            className="w-full min-h-[72px] rounded-md border bg-background px-3 py-2 text-sm"
            disabled={!canEdit || creatingItem}
          />
          <div className="flex items-center justify-between gap-3">
            <select
              value={newItemPriority}
              onChange={(e) => setNewItemPriority(e.target.value as RoadmapPriority)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
              disabled={!canEdit || creatingItem}
            >
              {roadmapPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {formatStatusLabel(priority)}
                </option>
              ))}
            </select>
            <Button onClick={handleCreateRoadmapItem} disabled={!canEdit || creatingItem}>
              {creatingItem ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Add Item
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feedback Inbox</CardTitle>
            <CardDescription>
              Public feedback triage before roadmap planning.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[620px] overflow-auto">
            {feedbackRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feedback yet.</p>
            ) : (
              feedbackRows.map((feedback) => (
                <div key={feedback.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">
                        {feedback.category}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        pain {feedback.painLevel ?? '-'}
                      </Badge>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roadmap Board</CardTitle>
            <CardDescription>
              Proposed and approved roadmap items generated from feedback.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[620px] overflow-auto">
            {roadmapRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No roadmap items yet.</p>
            ) : (
              roadmapRows.map((item) => {
                const linkedFeedback = item.sourceFeedbackIds
                  .map((id) => feedbackById.get(id))
                  .filter(Boolean) as ProjectFeedbackInboxEntry[];

                return (
                  <div key={item.id} className="rounded-lg border p-3 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{item.title}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">
                            {item.priority}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            effort {item.effort}
                          </Badge>
                          {item.autoGenerated && (
                            <Badge variant="secondary" className="text-[10px]">
                              AI draft
                            </Badge>
                          )}
                        </div>
                      </div>

                      <select
                        value={item.status}
                        onChange={(e) =>
                          handleRoadmapStatusChange(item.id, e.target.value as RoadmapStatus)
                        }
                        className="h-7 rounded border bg-background px-1.5 text-xs"
                        disabled={!canEdit}
                      >
                        {roadmapStatuses.map((status) => (
                          <option key={status} value={status}>
                            {formatStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {item.problem}
                    </p>
                    {item.outcome && (
                      <p className="text-xs text-muted-foreground">
                        Outcome: {item.outcome}
                      </p>
                    )}

                    {linkedFeedback.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Linked feedback
                        </p>
                        {linkedFeedback.slice(0, 3).map((feedback) => (
                          <p key={feedback.id} className="text-xs text-muted-foreground line-clamp-2">
                            • {feedback.content}
                          </p>
                        ))}
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-2">
                      <textarea
                        value={extraPromptContext[item.id] || ''}
                        onChange={(e) =>
                          setExtraPromptContext((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        placeholder="Optional extra context for prompt generation"
                        className="w-full min-h-[60px] rounded-md border bg-background px-3 py-2 text-xs"
                        disabled={!canEdit || creatingPromptFor === item.id}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleGenerateTaskPrompt(item.id)}
                          disabled={!canEdit || creatingPromptFor === item.id}
                        >
                          {creatingPromptFor === item.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Bot className="size-3.5" />
                          )}
                          Generate Task Prompt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLoadPromptHistory(item.id)}
                          disabled={loadingPromptHistoryFor === item.id}
                        >
                          {loadingPromptHistoryFor === item.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <ClipboardList className="size-3.5" />
                          )}
                          Prompt History
                        </Button>
                      </div>
                    </div>

                    {(item.latestTaskPrompt || (promptHistory[item.id]?.length ?? 0) > 0) && (
                      <div className="space-y-2 rounded-md border bg-muted/20 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium">Latest task prompt</p>
                          {item.latestTaskPrompt && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7"
                              onClick={() => handleCopyPrompt(item.latestTaskPrompt ?? '')}
                            >
                              <Copy className="size-3.5" />
                              Copy
                            </Button>
                          )}
                        </div>
                        {item.latestTaskPrompt && (
                          <pre className="text-xs whitespace-pre-wrap text-muted-foreground max-h-44 overflow-auto">
                            {item.latestTaskPrompt}
                          </pre>
                        )}
                        {item.latestTaskChecklist && item.latestTaskChecklist.length > 0 && (
                          <div className="space-y-1">
                            {item.latestTaskChecklist.map((task, idx) => (
                              <div key={idx} className="text-xs text-muted-foreground">
                                <p className="font-medium text-foreground/90">{idx + 1}. {task.title}</p>
                                <p>{task.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {(promptHistory[item.id]?.length ?? 0) > 0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">
                          Show prompt history ({promptHistory[item.id].length})
                        </summary>
                        <div className="mt-2 space-y-2">
                          {promptHistory[item.id].map((prompt) => (
                            <div key={prompt.id} className="rounded border p-2 bg-background">
                              <p className="text-[11px] text-muted-foreground mb-1">
                                {new Date(prompt.createdAt).toLocaleString()} · {prompt.provider}/{prompt.model}
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
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
