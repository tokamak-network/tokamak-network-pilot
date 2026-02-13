'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAtom } from 'jotai';
import {
  FolderKanban,
  Users,
  Database,
  Loader2,
  Globe,
  Lock,
  Trash2,
  ChevronRight,
  Plus,
  X,
  Sparkles,
  ExternalLink,
  UserPlus,
  FileText,
  Layers,
  BarChart3,
  ArrowLeft,
  Pencil,
  Save,
  MessageSquare,
} from 'lucide-react';
import {
  fetchProject,
  fetchProjectDashboard,
  updateProject,
  addProjectSource,
  removeProjectSource,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
  generateProjectSummary,
  fetchSources,
  type ProjectDetailResponse,
  type ProjectDashboardResponse,
  type SourceResponse,
} from '@/lib/api';
import { userAtom } from '@/store/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const roleColors: Record<string, string> = {
  lead: 'bg-amber-100 text-amber-800 border-amber-200',
  contributor: 'bg-blue-100 text-blue-800 border-blue-200',
  viewer: 'bg-gray-100 text-gray-700 border-gray-200',
};

const contentTypeLabels: Record<string, string> = {
  readme: 'READMEs',
  documentation: 'Docs / Markdown',
  code: 'Code Files',
  issue: 'Issues',
  pull_request: 'Pull Requests',
  wiki: 'Wiki Pages',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const idOrSlug = params.idOrSlug as string;
  const [user] = useAtom(userAtom);

  const [dashboard, setDashboard] = useState<ProjectDashboardResponse | null>(null);
  const [allSources, setAllSources] = useState<SourceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [showAddSource, setShowAddSource] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'lead' | 'contributor' | 'viewer'>('contributor');
  const [addingMember, setAddingMember] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [savingSummary, setSavingSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'team' | 'chat'>('overview');

  const loadData = useCallback(async () => {
    try {
      const [dashData, sourcesData] = await Promise.allSettled([
        fetchProjectDashboard(idOrSlug),
        fetchSources(),
      ]);
      if (dashData.status === 'fulfilled') setDashboard(dashData.value);
      else setError('Project not found');
      if (sourcesData.status === 'fulfilled') setAllSources(sourcesData.value.sources);
    } catch {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [idOrSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const project = dashboard?.project;
  const stats = dashboard?.stats;

  // Sources not yet assigned
  const availableSources = allSources.filter(
    (s) => !project?.sources.some((ps) => ps.sourceId === s.id),
  );

  const handleAddSource = async (sourceId: string) => {
    if (!project) return;
    try {
      await addProjectSource(project.id, sourceId);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveSource = async (sourceId: string) => {
    if (!project) return;
    try {
      await removeProjectSource(project.id, sourceId);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddMember = async () => {
    if (!project || !memberEmail.trim()) return;
    setAddingMember(true);
    try {
      await addProjectMember(project.id, memberEmail.trim(), memberRole);
      setMemberEmail('');
      setMemberRole('contributor');
      setShowAddMember(false);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const handleUpdateMemberRole = async (
    userId: string,
    role: 'lead' | 'contributor' | 'viewer',
  ) => {
    if (!project) return;
    try {
      await updateProjectMember(project.id, userId, role);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!project) return;
    if (!confirm('Remove this member from the project?')) return;
    try {
      await removeProjectMember(project.id, userId);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGenerateSummary = async () => {
    if (!project) return;
    setGeneratingSummary(true);
    try {
      await generateProjectSummary(project.id);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!project) return;
    setSavingSummary(true);
    try {
      await updateProject(project.id, { summary: summaryDraft });
      setEditingSummary(false);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingSummary(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !project || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-3.5rem)] gap-3">
        <FolderKanban className="size-10 text-muted-foreground" />
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

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BarChart3 },
    { id: 'sources' as const, label: `Sources (${project.sources.length})`, icon: Database },
    { id: 'team' as const, label: `Team (${project.members.length})`, icon: Users },
    { id: 'chat' as const, label: 'Ask', icon: MessageSquare },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-4 text-muted-foreground" />
          </Link>
          {project.logoUrl ? (
            <img
              src={project.logoUrl}
              alt=""
              className="size-10 rounded-lg object-cover"
            />
          ) : (
            <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FolderKanban className="size-5 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-muted-foreground">/{project.slug}</span>
              {project.isPublic ? (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  <Globe className="size-2.5 mr-0.5" />
                  Public
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  <Lock className="size-2.5 mr-0.5" />
                  Private
                </Badge>
              )}
            </div>
          </div>
        </div>
        {project.isPublic && (
          <Link href={`/projects/${project.slug}/public`}>
            <Button variant="outline" size="sm">
              <ExternalLink className="size-4" />
              Public Page
            </Button>
          </Link>
        )}
      </div>

      {project.description && (
        <p className="text-sm text-muted-foreground">{project.description}</p>
      )}

      {/* Links */}
      {project.links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {project.links.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-2 py-1 rounded-md border"
            >
              <ExternalLink className="size-3" />
              {link.label}
            </a>
          ))}
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Sources" value={stats.sourceCount} icon={Database} />
        <KpiCard label="Team" value={stats.memberCount} icon={Users} />
        <KpiCard label="Content" value={stats.contentEntries} icon={FileText} />
        <KpiCard label="Documents" value={stats.totalDocuments} icon={FileText} />
        <KpiCard label="Chunks" value={stats.totalChunks} icon={Layers} />
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          project={project}
          stats={stats}
          user={user}
          editingSummary={editingSummary}
          summaryDraft={summaryDraft}
          savingSummary={savingSummary}
          generatingSummary={generatingSummary}
          onEditSummary={() => {
            setEditingSummary(true);
            setSummaryDraft(project.summary || '');
          }}
          onCancelEditSummary={() => setEditingSummary(false)}
          onSaveSummary={handleSaveSummary}
          onGenerateSummary={handleGenerateSummary}
          onSummaryDraftChange={setSummaryDraft}
        />
      )}

      {activeTab === 'sources' && (
        <SourcesTab
          project={project}
          availableSources={availableSources}
          showAddSource={showAddSource}
          user={user}
          onToggleAddSource={() => setShowAddSource(!showAddSource)}
          onAddSource={handleAddSource}
          onRemoveSource={handleRemoveSource}
        />
      )}

      {activeTab === 'team' && (
        <TeamTab
          project={project}
          user={user}
          showAddMember={showAddMember}
          memberEmail={memberEmail}
          memberRole={memberRole}
          addingMember={addingMember}
          onToggleAddMember={() => setShowAddMember(!showAddMember)}
          onMemberEmailChange={setMemberEmail}
          onMemberRoleChange={setMemberRole}
          onAddMember={handleAddMember}
          onUpdateMemberRole={handleUpdateMemberRole}
          onRemoveMember={handleRemoveMember}
        />
      )}

      {activeTab === 'chat' && (
        <ChatTab project={project} />
      )}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-muted-foreground">{label}</span>
          <Icon className="size-3.5 text-muted-foreground" />
        </div>
        <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  );
}

// ─── Overview Tab ────────────────────────────────────────────

function OverviewTab({
  project,
  stats,
  user,
  editingSummary,
  summaryDraft,
  savingSummary,
  generatingSummary,
  onEditSummary,
  onCancelEditSummary,
  onSaveSummary,
  onGenerateSummary,
  onSummaryDraftChange,
}: {
  project: ProjectDetailResponse;
  stats: ProjectDashboardResponse['stats'];
  user: any;
  editingSummary: boolean;
  summaryDraft: string;
  savingSummary: boolean;
  generatingSummary: boolean;
  onEditSummary: () => void;
  onCancelEditSummary: () => void;
  onSaveSummary: () => void;
  onGenerateSummary: () => void;
  onSummaryDraftChange: (v: string) => void;
}) {
  const chunkEntries = Object.entries(stats.chunkBreakdown).sort((a, b) => b[1] - a[1]);
  const totalChunks = chunkEntries.reduce((sum, [, v]) => sum + v, 0);

  return (
    <div className="space-y-6">
      {/* Summary Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="size-4" />
              Project Summary
            </CardTitle>
            {user && (
              <div className="flex gap-2">
                {!editingSummary && (
                  <>
                    {project.summary && (
                      <Button variant="ghost" size="sm" onClick={onEditSummary}>
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onGenerateSummary}
                      disabled={generatingSummary || project.sources.length === 0}
                    >
                      {generatingSummary ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-3.5" />
                      )}
                      {project.summary ? 'Regenerate' : 'Generate'} AI Summary
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
          {project.summaryUpdatedAt && (
            <CardDescription>
              Last updated: {new Date(project.summaryUpdatedAt).toLocaleDateString()}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {editingSummary ? (
            <div className="space-y-3">
              <textarea
                value={summaryDraft}
                onChange={(e) => onSummaryDraftChange(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 text-sm rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y font-mono"
                placeholder="Write or edit the project summary (Markdown supported)..."
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={onCancelEditSummary}>
                  Cancel
                </Button>
                <Button size="sm" onClick={onSaveSummary} disabled={savingSummary}>
                  {savingSummary ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          ) : project.summary ? (
            <div className="prose prose-sm max-w-none text-sm text-foreground whitespace-pre-wrap">
              {project.summary}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              {project.sources.length === 0
                ? 'Add sources to this project first, then generate an AI summary.'
                : 'No summary yet. Click "Generate AI Summary" to create one.'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Content Breakdown */}
      {chunkEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="size-4" />
              Content Breakdown
            </CardTitle>
            <CardDescription>Indexed chunks from project sources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chunkEntries.map(([type, count]) => {
                const pct = totalChunks > 0 ? (count / totalChunks) * 100 : 0;
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{contentTypeLabels[type] || type}</span>
                      <span className="font-medium tabular-nums">
                        {count.toLocaleString()}
                        <span className="text-muted-foreground text-xs ml-1">
                          ({pct.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sources Tab ─────────────────────────────────────────────

function SourcesTab({
  project,
  availableSources,
  showAddSource,
  user,
  onToggleAddSource,
  onAddSource,
  onRemoveSource,
}: {
  project: ProjectDetailResponse;
  availableSources: SourceResponse[];
  showAddSource: boolean;
  user: any;
  onToggleAddSource: () => void;
  onAddSource: (sourceId: string) => void;
  onRemoveSource: (sourceId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {user && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onToggleAddSource}>
            <Plus className="size-4" />
            Assign Source
          </Button>
        </div>
      )}

      {showAddSource && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-sm">Available Sources</CardTitle>
            <CardDescription>
              Click to assign a knowledge source to this project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableSources.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                All sources are already assigned to this project.
              </p>
            ) : (
              <div className="grid gap-2 max-h-60 overflow-y-auto">
                {availableSources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => onAddSource(source.id)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md border hover:bg-muted/50 transition-colors text-left"
                  >
                    <Database className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{source.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {source.type} &middot; {source.documentCount} docs
                      </p>
                    </div>
                    <Plus className="size-4 text-primary shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {project.sources.length > 0 ? (
        <div className="space-y-2">
          {project.sources.map((ps) => (
            <div
              key={ps.id}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border"
            >
              <Database className="size-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <Link
                  href={`/sources/${ps.sourceId}`}
                  className="text-sm font-medium hover:underline"
                >
                  {ps.source.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {ps.source.type} &middot; {ps.source.documentCount} docs
                  {ps.source.lastSyncedAt && (
                    <> &middot; Synced {new Date(ps.source.lastSyncedAt).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <StatusBadge status={ps.source.status} />
              {user && (
                <button
                  onClick={() => onRemoveSource(ps.sourceId)}
                  className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="Remove source"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Database className="size-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No sources assigned yet. Add knowledge sources to this project.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Team Tab ────────────────────────────────────────────────

function TeamTab({
  project,
  user,
  showAddMember,
  memberEmail,
  memberRole,
  addingMember,
  onToggleAddMember,
  onMemberEmailChange,
  onMemberRoleChange,
  onAddMember,
  onUpdateMemberRole,
  onRemoveMember,
}: {
  project: ProjectDetailResponse;
  user: any;
  showAddMember: boolean;
  memberEmail: string;
  memberRole: 'lead' | 'contributor' | 'viewer';
  addingMember: boolean;
  onToggleAddMember: () => void;
  onMemberEmailChange: (v: string) => void;
  onMemberRoleChange: (v: 'lead' | 'contributor' | 'viewer') => void;
  onAddMember: () => void;
  onUpdateMemberRole: (userId: string, role: 'lead' | 'contributor' | 'viewer') => void;
  onRemoveMember: (userId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {user && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onToggleAddMember}>
            <UserPlus className="size-4" />
            Add Member
          </Button>
        </div>
      )}

      {showAddMember && (
        <Card className="border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Email</label>
                <input
                  value={memberEmail}
                  onChange={(e) => onMemberEmailChange(e.target.value)}
                  placeholder="alice@tokamak.network"
                  className="w-full h-9 px-3 text-sm rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  onKeyDown={(e) => e.key === 'Enter' && onAddMember()}
                />
              </div>
              <div className="w-36">
                <label className="text-sm font-medium mb-1 block">Role</label>
                <select
                  value={memberRole}
                  onChange={(e) =>
                    onMemberRoleChange(e.target.value as 'lead' | 'contributor' | 'viewer')
                  }
                  className="w-full h-9 px-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="lead">Lead</option>
                  <option value="contributor">Contributor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={onToggleAddMember}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={onAddMember}
                disabled={!memberEmail.trim() || addingMember}
              >
                {addingMember ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserPlus className="size-4" />
                )}
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {project.members.length > 0 ? (
        <div className="space-y-2">
          {project.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border"
            >
              <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                {(member.user.name || member.user.email)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {member.user.name || member.user.email}
                </p>
                {member.user.name && (
                  <p className="text-xs text-muted-foreground">{member.user.email}</p>
                )}
              </div>
              {user ? (
                <select
                  value={member.role}
                  onChange={(e) =>
                    onUpdateMemberRole(
                      member.userId,
                      e.target.value as 'lead' | 'contributor' | 'viewer',
                    )
                  }
                  className={`text-xs px-2 py-1 rounded-full border font-medium ${roleColors[member.role] || ''}`}
                >
                  <option value="lead">Lead</option>
                  <option value="contributor">Contributor</option>
                  <option value="viewer">Viewer</option>
                </select>
              ) : (
                <span
                  className={`text-xs px-2 py-1 rounded-full border font-medium ${roleColors[member.role] || ''}`}
                >
                  {member.role}
                </span>
              )}
              {user && (
                <button
                  onClick={() => onRemoveMember(member.userId)}
                  className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="Remove member"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="size-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No team members yet. Invite people to collaborate.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Chat Tab (Project-Scoped) ───────────────────────────────

function ChatTab({ project }: { project: ProjectDetailResponse }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<Array<{ title: string; url: string; score: number }>>([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer('');
    setSources([]);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/ask`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('tokamak_token') || ''}`,
          },
          body: JSON.stringify({ question: question.trim(), projectId: project.id }),
        },
      );
      const data = await res.json();
      setAnswer(data.answer || 'No answer received.');
      setSources(data.sources || []);
    } catch (err: any) {
      setAnswer('Failed to get answer: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="size-4" />
            Ask About {project.name}
          </CardTitle>
          <CardDescription>
            Questions are scoped to this project&apos;s knowledge sources only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Ask anything about ${project.name}...`}
              className="flex-1 h-10 px-3 text-sm rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            />
            <Button onClick={handleAsk} disabled={!question.trim() || loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MessageSquare className="size-4" />
              )}
              Ask
            </Button>
          </div>

          {answer && (
            <div className="space-y-3">
              <div className="prose prose-sm max-w-none text-sm p-4 rounded-lg bg-muted/50 whitespace-pre-wrap">
                {answer}
              </div>
              {sources.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Sources:</p>
                  <div className="flex flex-wrap gap-2">
                    {sources.map((s, i) => (
                      <a
                        key={i}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline px-2 py-1 rounded-md bg-primary/5 border"
                      >
                        {s.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-800 border-green-200',
    syncing: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    disabled: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${colors[status] || colors.disabled}`}
    >
      {status}
    </span>
  );
}
