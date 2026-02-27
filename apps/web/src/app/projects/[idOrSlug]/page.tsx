'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  Shield,
  Search,
  Send,
  TreePine,
  Megaphone,
  Mail,
  RefreshCw,
  Clock,
  Settings,
  Palette,
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
  fetchMyProjectRole,
  transferProjectOwnership,
  inviteProjectMember,
  fetchProjectInvitations,
  cancelProjectInvitation,
  resendProjectInvitation,
  type ProjectDetailResponse,
  type ProjectDashboardResponse,
  type SourceResponse,
  type ProjectInvitationResponse,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { userAtom } from '@/store/auth';
import { useConfirm } from '@/components/ui/confirm-dialog';
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
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { ChatMessage } from '@/components/chat-message';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ConversationMessage } from '@/store/ask';

const roleColors: Record<string, string> = {
  lead: 'bg-warning-bg text-warning border-warning-border',
  contributor: 'bg-info-bg text-info border-info-border',
  viewer: 'bg-muted text-muted-foreground border-border',
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
  const confirm = useConfirm();
  const { toast } = useToast();

  const [dashboard, setDashboard] = useState<ProjectDashboardResponse | null>(null);
  const [allSources, setAllSources] = useState<SourceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myRole, setMyRole] = useState<'lead' | 'contributor' | 'viewer' | null>(null);

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
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'team' | 'chat' | 'settings'>('overview');
  const [invitations, setInvitations] = useState<ProjectInvitationResponse[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'lead' | 'contributor' | 'viewer'>('contributor');
  const [sendingInvite, setSendingInvite] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dashData, sourcesData] = await Promise.allSettled([
        fetchProjectDashboard(idOrSlug),
        fetchSources(),
      ]);
      if (dashData.status === 'fulfilled') {
        setDashboard(dashData.value);
        if (user) {
          try {
            const { role } = await fetchMyProjectRole(dashData.value.project.id);
            setMyRole(role);
          } catch {
            setMyRole(null);
          }
          try {
            const invs = await fetchProjectInvitations(dashData.value.project.id);
            setInvitations(invs);
          } catch {
            setInvitations([]);
          }
        }
      } else {
        setError('Project not found');
      }
      if (sourcesData.status === 'fulfilled') setAllSources(sourcesData.value.sources);
    } catch {
      setError('Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [idOrSlug, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const project = dashboard?.project;
  const stats = dashboard?.stats;

  const isLead = myRole === 'lead';
  const canEdit = myRole === 'lead' || myRole === 'contributor';

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
      toast(err.message);
    }
  };

  const handleRemoveSource = async (sourceId: string) => {
    if (!project) return;
    try {
      await removeProjectSource(project.id, sourceId);
      await loadData();
    } catch (err: any) {
      toast(err.message);
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
      toast(err.message);
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
      toast(err.message);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!project) return;
    const confirmed = await confirm({
      title: 'Remove member',
      description: 'Are you sure you want to remove this member from the project?',
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!confirmed) return;
    try {
      await removeProjectMember(project.id, userId);
      await loadData();
    } catch (err: any) {
      toast(err.message);
    }
  };

  const handleGenerateSummary = async () => {
    if (!project) return;
    setGeneratingSummary(true);
    try {
      await generateProjectSummary(project.id);
      await loadData();
    } catch (err: any) {
      toast(err.message);
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
      toast(err.message);
    } finally {
      setSavingSummary(false);
    }
  };

  const handleTransferOwnership = async (targetUserId: string) => {
    if (!project) return;
    const confirmed = await confirm({
      title: 'Transfer ownership',
      description: 'Transfer ownership of this project? You will become a contributor.',
      confirmLabel: 'Transfer',
      variant: 'warning',
    });
    if (!confirmed) return;
    try {
      await transferProjectOwnership(project.id, targetUserId);
      await loadData();
    } catch (err: any) {
      toast(err.message);
    }
  };

  const handleTogglePublic = async () => {
    if (!project) return;
    try {
      const makingPrivate = project.isPublic;
      const updates: Record<string, boolean> = { isPublic: !project.isPublic };
      if (makingPrivate) {
        updates.showOnLandingPage = false;
        updates.isRoadmapPublic = false;
      }
      await updateProject(project.id, updates);
      await loadData();
    } catch (err: any) {
      toast(err.message);
    }
  };

  const handleToggleLandingPage = async () => {
    if (!project) return;
    try {
      await updateProject(project.id, { showOnLandingPage: !project.showOnLandingPage });
      await loadData();
    } catch (err: any) {
      toast(err.message);
    }
  };

  const handleToggleRoadmapVisibility = async () => {
    if (!project) return;
    try {
      await updateProject(project.id, { isRoadmapPublic: !project.isRoadmapPublic });
      await loadData();
    } catch (err: any) {
      toast(err.message);
    }
  };

  const handleChangeTheme = async (theme: string) => {
    if (!project) return;
    try {
      await updateProject(project.id, { publicTheme: theme });
      await loadData();
    } catch (err: any) {
      toast(err.message);
    }
  };

  const handleChangeBorderRadius = async (radius: string) => {
    if (!project) return;
    try {
      await updateProject(project.id, { publicBorderRadius: radius });
      await loadData();
    } catch (err: any) {
      toast(err.message);
    }
  };

  const handleSendInvitation = async () => {
    if (!project || !inviteEmail.trim()) return;
    setSendingInvite(true);
    try {
      await inviteProjectMember(project.id, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setInviteRole('contributor');
      setShowInviteForm(false);
      await loadData();
    } catch (err: any) {
      toast(err.message);
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!project) return;
    const confirmed = await confirm({
      title: 'Cancel invitation',
      description: 'Are you sure you want to cancel this invitation?',
      confirmLabel: 'Cancel invitation',
      variant: 'warning',
    });
    if (!confirmed) return;
    try {
      await cancelProjectInvitation(project.id, invitationId);
      await loadData();
    } catch (err: any) {
      toast(err.message);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (!project) return;
    try {
      await resendProjectInvitation(project.id, invitationId);
      await loadData();
    } catch (err: any) {
      toast(err.message);
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
    { id: 'settings' as const, label: 'Settings', icon: Settings },
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
            <h1 className="font-serif text-2xl font-semibold tracking-tight">{project.name}</h1>
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
              {project.showOnLandingPage && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <Megaphone className="size-2.5 mr-0.5" />
                  Landing Page
                </Badge>
              )}
              {project.isRoadmapPublic && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-sky-500/10 text-sky-700 border-sky-500/20">
                  <Globe className="size-2.5 mr-0.5" />
                  Roadmap Public
                </Badge>
              )}
            </div>
          </div>
        </div>
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/projects/${project.slug}/roadmap`}>
                  <Button variant="outline" size="sm">
                    <Sparkles className="size-4" />
                    Roadmap Pipeline
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px]">
                Manage feedback and roadmap items for this project.
              </TooltipContent>
            </Tooltip>
            {project.isPublic && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={`/projects/${project.slug}/public`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="size-4" />
                      Public Page
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[220px]">
                  View the public project page as visitors see it.
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
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
          canEdit={canEdit}
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
          canEdit={canEdit}
          onToggleAddSource={() => setShowAddSource(!showAddSource)}
          onAddSource={handleAddSource}
          onRemoveSource={handleRemoveSource}
        />
      )}

      {activeTab === 'team' && (
        <TeamTab
          project={project}
          user={user}
          isLead={isLead}
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
          onTransferOwnership={handleTransferOwnership}
          invitations={invitations}
          showInviteForm={showInviteForm}
          inviteEmail={inviteEmail}
          inviteRole={inviteRole}
          sendingInvite={sendingInvite}
          onToggleInviteForm={() => setShowInviteForm(!showInviteForm)}
          onInviteEmailChange={setInviteEmail}
          onInviteRoleChange={setInviteRole}
          onSendInvitation={handleSendInvitation}
          onCancelInvitation={handleCancelInvitation}
          onResendInvitation={handleResendInvitation}
        />
      )}

      {activeTab === 'chat' && (
        <ChatTab project={project} />
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          project={project}
          isLead={isLead}
          onTogglePublic={handleTogglePublic}
          onToggleLandingPage={handleToggleLandingPage}
          onToggleRoadmapVisibility={handleToggleRoadmapVisibility}
          onChangeTheme={handleChangeTheme}
          onChangeBorderRadius={handleChangeBorderRadius}
        />
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

// ─── Toggle (switch) ─────────────────────────────────────────

function Toggle({
  checked,
  onClick,
  disabled,
  'aria-label': ariaLabel,
}: {
  checked: boolean;
  onClick: () => void;
  disabled?: boolean;
  'aria-label'?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full border border-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform mt-0.5',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

// ─── Settings Tab ────────────────────────────────────────────

const THEME_OPTIONS = [
  { id: 'forest', label: 'Forest', color: 'oklch(0.3 0.06 150)', description: 'Deep greens & warm cream' },
  { id: 'ocean', label: 'Ocean', color: 'oklch(0.35 0.1 240)', description: 'Cool blues & soft whites' },
  { id: 'sunset', label: 'Sunset', color: 'oklch(0.5 0.15 30)', description: 'Warm oranges & soft golds' },
  { id: 'midnight', label: 'Midnight', color: 'oklch(0.65 0.12 260)', description: 'Dark navy & electric accents' },
  { id: 'lavender', label: 'Lavender', color: 'oklch(0.45 0.12 290)', description: 'Soft purples & gentle tones' },
  { id: 'slate', label: 'Slate', color: 'oklch(0.3 0.02 260)', description: 'Neutral grays, clean & minimal' },
] as const;

const RADIUS_OPTIONS = [
  { id: 'rounded', label: 'Rounded', description: 'Smooth, friendly corners' },
  { id: 'pill', label: 'Pill', description: 'Fully rounded, bubbly shapes' },
  { id: 'square', label: 'Square', description: 'Sharp, modern edges' },
] as const;

function SettingsTab({
  project,
  isLead,
  onTogglePublic,
  onToggleLandingPage,
  onToggleRoadmapVisibility,
  onChangeTheme,
  onChangeBorderRadius,
}: {
  project: ProjectDetailResponse;
  isLead: boolean;
  onTogglePublic: () => void;
  onToggleLandingPage: () => void;
  onToggleRoadmapVisibility: () => void;
  onChangeTheme: (theme: string) => void;
  onChangeBorderRadius: (radius: string) => void;
}) {
  if (!isLead) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Only project leads can change settings.
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentTheme = project.publicTheme || 'forest';
  const currentRadius = project.publicBorderRadius || 'rounded';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="size-4" />
            Visibility & sharing
          </CardTitle>
          <CardDescription>
            Control who can see this project and how it appears publicly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-medium">
                {project.isPublic ? (
                  <Globe className="size-4 text-muted-foreground" />
                ) : (
                  <Lock className="size-4 text-muted-foreground" />
                )}
                Public project
              </div>
              <p className="text-sm text-muted-foreground">
                {project.isPublic
                  ? 'This project is visible to anyone with the link. Turn off to make it private.'
                  : 'This project is private. Only team members can access it. Turn on to make it publicly visible.'}
              </p>
            </div>
            <Toggle
              checked={!!project.isPublic}
              onClick={onTogglePublic}
              aria-label="Toggle project public visibility"
            />
          </div>

          <div className={cn(
            'flex items-start justify-between gap-4 rounded-lg border p-4 transition-opacity',
            !project.isPublic && 'opacity-50',
          )}>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-medium">
                <Megaphone className="size-4 text-muted-foreground" />
                Show on Landing Page
              </div>
              <p className="text-sm text-muted-foreground">
                Feature this project on the Tokamak Forest landing page so it&#39;s discoverable by visitors.
              </p>
            </div>
            <Toggle
              checked={!!project.showOnLandingPage}
              onClick={onToggleLandingPage}
              disabled={!project.isPublic}
              aria-label="Toggle show on landing page"
            />
          </div>

          <div className={cn(
            'flex items-start justify-between gap-4 rounded-lg border p-4 transition-opacity',
            !project.isPublic && 'opacity-50',
          )}>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 font-medium">
                <Globe className="size-4 text-muted-foreground" />
                Show roadmap on public page
              </div>
              <p className="text-sm text-muted-foreground">
                Allow visitors to see the project roadmap (planned and in-progress work) on the public project page.
              </p>
            </div>
            <Toggle
              checked={!!project.isRoadmapPublic}
              onClick={onToggleRoadmapVisibility}
              disabled={!project.isPublic}
              aria-label="Toggle roadmap visible on public page"
            />
          </div>
        </CardContent>
      </Card>

      {/* Public Page Appearance */}
      <Card className={cn(!project.isPublic && 'opacity-50 pointer-events-none')}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="size-4" />
            Public page appearance
          </CardTitle>
          <CardDescription>
            Customize the color theme and shape style of your public project page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Color Theme Picker */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Color theme</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {THEME_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onChangeTheme(t.id)}
                  className={cn(
                    'relative flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:border-primary/50 hover:shadow-sm',
                    currentTheme === t.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border',
                  )}
                >
                  <div
                    className="size-8 shrink-0 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: t.color }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{t.description}</p>
                  </div>
                  {currentTheme === t.id && (
                    <div className="absolute top-2 right-2">
                      <div className="size-2 rounded-full bg-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Border Radius Picker */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Corner style</p>
            <div className="grid grid-cols-3 gap-3">
              {RADIUS_OPTIONS.map((r) => {
                const previewRadius = r.id === 'pill' ? '12px' : r.id === 'square' ? '3px' : '8px';
                return (
                  <button
                    key={r.id}
                    onClick={() => onChangeBorderRadius(r.id)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg border p-4 transition-all hover:border-primary/50 hover:shadow-sm',
                      currentRadius === r.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border',
                    )}
                  >
                    <div
                      className="size-12 border-2 border-foreground/20 bg-primary/10"
                      style={{ borderRadius: previewRadius }}
                    />
                    <div className="text-center">
                      <p className="text-sm font-medium">{r.label}</p>
                      <p className="text-[10px] text-muted-foreground">{r.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Copy as AI Prompt & Export (Project) ────────────────────

const PROJECT_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function ProjectCopyAsPromptButton({ project }: { project: ProjectDetailResponse }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    const lines = [
      '## Context from Tokamak Forest Knowledge Base',
      '',
      `### ${project.name}`,
      '',
    ];
    if (project.description) {
      lines.push(`> ${project.description}`);
      lines.push('');
    }
    if (project.summary) {
      lines.push(project.summary);
      lines.push('');
    }
    if (project.sources.length > 0) {
      lines.push('### Knowledge Sources');
      for (const s of project.sources) {
        lines.push(`- ${s.source.name} (${s.source.type}, ${s.source.documentCount} docs)`);
      }
      lines.push('');
    }
    lines.push('---');
    lines.push('*This information is from the Tokamak Forest Knowledge Base. Use it as context for your response. Cite sources when relevant.*');
    await navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-card px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
      title="Copy project info as AI-ready prompt"
    >
      {copied ? <span className="size-3 text-success">&#10003;</span> : <Sparkles className="size-3" />}
      {copied ? 'Copied' : 'Copy as prompt'}
    </button>
  );
}

function ProjectExportButtons({ slug }: { slug: string }) {
  const handleExport = (format: 'json' | 'markdown') => {
    window.open(`${PROJECT_API_BASE}/export/project/${slug}?format=${format}`, '_blank');
  };
  return (
    <div className="inline-flex rounded-md border border-border/40 overflow-hidden">
      <button
        onClick={() => handleExport('json')}
        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
        title="Export as JSON"
      >
        <FileText className="size-3" />
        JSON
      </button>
      <div className="w-px bg-border/40" />
      <button
        onClick={() => handleExport('markdown')}
        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
        title="Export as Markdown"
      >
        MD
      </button>
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────────

function OverviewTab({
  project,
  stats,
  canEdit,
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
  canEdit: boolean;
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
            {canEdit && (
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
            <div className="space-y-3">
              <div className="prose prose-sm max-w-none text-sm text-foreground whitespace-pre-wrap">
                {project.summary}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <ProjectCopyAsPromptButton project={project} />
                <ProjectExportButtons slug={project.slug} />
              </div>
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
  canEdit,
  onToggleAddSource,
  onAddSource,
  onRemoveSource,
}: {
  project: ProjectDetailResponse;
  availableSources: SourceResponse[];
  showAddSource: boolean;
  canEdit: boolean;
  onToggleAddSource: () => void;
  onAddSource: (sourceId: string) => void;
  onRemoveSource: (sourceId: string) => void;
}) {
  const [sourceSearch, setSourceSearch] = useState('');

  const filteredAvailable = sourceSearch.trim()
    ? availableSources.filter(
        (s) =>
          s.name.toLowerCase().includes(sourceSearch.toLowerCase()) ||
          s.type.toLowerCase().includes(sourceSearch.toLowerCase()),
      )
    : availableSources;

  return (
    <div className="space-y-4">
      {canEdit && (
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
          <CardContent className="space-y-3">
            {availableSources.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                All sources are already assigned to this project.
              </p>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <input
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    placeholder="Search sources..."
                    className="w-full h-9 pl-9 pr-9 text-sm rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    autoFocus
                  />
                  {sourceSearch && (
                    <button
                      onClick={() => setSourceSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
                {filteredAvailable.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No sources match &ldquo;{sourceSearch}&rdquo;
                  </p>
                ) : (
                  <div className="grid gap-2 max-h-60 overflow-y-auto">
                    {filteredAvailable.map((source) => (
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
              </>
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
              {canEdit && (
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
  isLead,
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
  onTransferOwnership,
  invitations,
  showInviteForm,
  inviteEmail,
  inviteRole,
  sendingInvite,
  onToggleInviteForm,
  onInviteEmailChange,
  onInviteRoleChange,
  onSendInvitation,
  onCancelInvitation,
  onResendInvitation,
}: {
  project: ProjectDetailResponse;
  user: any;
  isLead: boolean;
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
  onTransferOwnership: (userId: string) => void;
  invitations: ProjectInvitationResponse[];
  showInviteForm: boolean;
  inviteEmail: string;
  inviteRole: 'lead' | 'contributor' | 'viewer';
  sendingInvite: boolean;
  onToggleInviteForm: () => void;
  onInviteEmailChange: (v: string) => void;
  onInviteRoleChange: (v: 'lead' | 'contributor' | 'viewer') => void;
  onSendInvitation: () => void;
  onCancelInvitation: (id: string) => void;
  onResendInvitation: (id: string) => void;
}) {
  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending');

  return (
    <div className="space-y-6">
      {isLead && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onToggleInviteForm}>
            <Mail className="size-4" />
            Invite via Email
          </Button>
          <Button variant="outline" size="sm" onClick={onToggleAddMember}>
            <UserPlus className="size-4" />
            Add Existing Member
          </Button>
        </div>
      )}

      {/* Invite via Email Form */}
      {showInviteForm && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="size-4" />
              Invite via Email
            </CardTitle>
            <CardDescription>
              Send an invitation email. Works even if they don't have an account yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Email</label>
                <input
                  value={inviteEmail}
                  onChange={(e) => onInviteEmailChange(e.target.value)}
                  placeholder="alice@example.com"
                  type="email"
                  className="w-full h-9 px-3 text-sm rounded-md border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  onKeyDown={(e) => e.key === 'Enter' && onSendInvitation()}
                  autoFocus
                />
              </div>
              <div className="w-36">
                <label className="text-sm font-medium mb-1 block">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    onInviteRoleChange(e.target.value as 'lead' | 'contributor' | 'viewer')
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
              <Button variant="outline" size="sm" onClick={onToggleInviteForm}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={onSendInvitation}
                disabled={!inviteEmail.trim() || sendingInvite}
              >
                {sendingInvite ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Send Invitation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Existing Member Form (direct add — for users already signed in) */}
      {showAddMember && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserPlus className="size-4" />
              Add Existing Member
            </CardTitle>
            <CardDescription>
              Directly add someone who already has an account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Clock className="size-3.5" />
            Pending Invitations ({pendingInvitations.length})
          </h3>
          {pendingInvitations.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-primary/30 bg-primary/[0.02]"
            >
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                <Mail className="size-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{inv.email}</p>
                <p className="text-xs text-muted-foreground">
                  Invited by {inv.invitedBy.name || inv.invitedBy.email}
                  {' · '}
                  Expires {new Date(inv.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full border font-medium ${roleColors[inv.role] || ''}`}
              >
                {inv.role}
              </span>
              {isLead && (
                <>
                  <button
                    onClick={() => onResendInvitation(inv.id)}
                    className="p-1 rounded hover:bg-primary/10 hover:text-primary transition-colors"
                    title="Resend invitation email"
                  >
                    <RefreshCw className="size-4" />
                  </button>
                  <button
                    onClick={() => onCancelInvitation(inv.id)}
                    className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Cancel invitation"
                  >
                    <X className="size-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Current Members */}
      <div className="space-y-2">
        {project.members.length > 0 && (
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Users className="size-3.5" />
            Members ({project.members.length})
          </h3>
        )}
        {project.members.length > 0 ? (
          project.members.map((member) => (
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
              {isLead && member.userId !== user?.id ? (
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
              {isLead && member.userId !== user?.id && (
                <button
                  onClick={() => onTransferOwnership(member.userId)}
                  className="p-1 rounded hover:bg-warning/10 hover:text-warning transition-colors"
                  title="Transfer ownership to this member"
                >
                  <Shield className="size-4" />
                </button>
              )}
              {isLead && member.userId !== user?.id && (
                <button
                  onClick={() => onRemoveMember(member.userId)}
                  className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="Remove member"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          ))
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
    </div>
  );
}

// ─── Chat Tab (Project-Scoped) ───────────────────────────────

function ChatTab({ project }: { project: ProjectDetailResponse }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleAsk = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || isLoading) return;

    const currentQuery = question;
    const userMessage: ConversationMessage = {
      role: 'user',
      content: currentQuery,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setQuestion('');

    const placeholderAssistant: ConversationMessage = {
      role: 'assistant',
      content: '',
      sources: [],
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, placeholderAssistant]);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

    try {
      const res = await fetch(`${apiBase}/ask/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('tokamak_token') || ''}`,
        },
        body: JSON.stringify({ question: currentQuery, projectId: project.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err.message || `API error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (currentEvent === 'metadata') {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  sources: data.sources || [],
                };
                return updated;
              });
            } else if (currentEvent === 'chunk') {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + data.text,
                };
                return updated;
              });
            } else if (currentEvent === 'error') {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: `Sorry, something went wrong: ${data.message}`,
                };
                return updated;
              });
            }
            currentEvent = '';
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: `Sorry, something went wrong: ${err.message || 'Could not reach the API'}`,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    setQuestion('');
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-card/80 backdrop-blur-sm py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TreePine className="size-3.5" />
            </div>
            <div>
              <CardTitle className="text-sm">Ask About {project.name}</CardTitle>
              <CardDescription className="text-xs">
                Scoped to this project&apos;s knowledge sources
              </CardDescription>
            </div>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleClear}
            >
              <Plus className="size-3.5" />
              New Chat
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <TreePine className="size-7 text-primary" />
            </div>
            <h3 className="text-base font-medium mb-1">
              Ask about {project.name}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
              Questions are answered using only this project&apos;s assigned knowledge sources.
            </p>
            <form onSubmit={handleAsk} className="w-full max-w-lg">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={`e.g. "What does ${project.name} do?"`}
                    className="pl-10 h-11 text-sm"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={!question.trim()}
                  className="h-11 px-4"
                >
                  <Send className="size-4" />
                  Ask
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[450px]">
              <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                {messages.map((msg, i) => (
                  <ChatMessage key={msg.id || i} message={msg} />
                ))}

                {isLoading && messages.length > 0 && messages[messages.length - 1].content === '' && (
                  <div className="flex gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary">
                      <TreePine className="size-4 text-primary-foreground" />
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-muted/60 border border-border/50 px-4 py-3">
                      <div className="flex gap-1">
                        <span className="size-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                        <span className="size-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                        <span className="size-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                      </div>
                      <span className="text-sm text-muted-foreground ml-1">Thinking...</span>
                    </div>
                  </div>
                )}

                <div ref={scrollEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t bg-background/80 backdrop-blur-sm p-4">
              <form onSubmit={handleAsk} className="max-w-3xl mx-auto">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask a follow-up question..."
                      className="pl-10 h-11 rounded-xl"
                      disabled={isLoading}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!question.trim() || isLoading}
                    className="rounded-xl h-11 px-4"
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Send className="size-4" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-success-bg text-success border-success-border',
    syncing: 'bg-warning-bg text-warning border-warning-border',
    error: 'bg-destructive/10 text-destructive border-destructive/20',
    disabled: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${colors[status] || colors.disabled}`}
    >
      {status}
    </span>
  );
}
