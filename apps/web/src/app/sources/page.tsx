'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAtom } from 'jotai';
import Link from 'next/link';
import {
  Database,
  Github,
  Globe,
  Upload,
  Plus,
  RefreshCw,
  BookOpen,
  Loader2,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Code2,
  MessageSquare,
  GitPullRequest,
  BarChart3,
  Search,
  X,
  SlidersHorizontal,
  ArrowUpDown,
} from 'lucide-react';
import { sourcesAtom, sourcesLoadingAtom } from '@/store';
import {
  fetchSources,
  fetchIngestionStatus,
  createSource,
  syncSource,
  syncSourceFull,
  type IngestionStatusResponse,
  type IngestionRepoStatus,
} from '@/lib/api';
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
import { Input } from '@/components/ui/input';

const sourceTypeIcons: Record<string, React.ElementType> = {
  github_repo: Github,
  github_org: Github,
  documentation: Globe,
  file_upload: Upload,
  notion: BookOpen,
  custom: Database,
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: 'Fetched', color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle2 },
  syncing: { label: 'Syncing', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: RefreshCw },
  error: { label: 'Failed', color: 'text-red-600 bg-red-50 border-red-200', icon: XCircle },
  disabled: { label: 'Disabled', color: 'text-gray-500 bg-gray-50 border-gray-200', icon: Clock },
};

const contentTypeIcons: Record<string, React.ElementType> = {
  readme: FileText,
  documentation: FileText,
  code: Code2,
  issue: MessageSquare,
  pull_request: GitPullRequest,
  wiki: BookOpen,
  metadata: BarChart3,
  other: Database,
};

/** Format a date string as a relative time (e.g. "3 days ago") */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

type StatusFilter = 'all' | 'fetched' | 'syncing' | 'failed' | 'empty' | 'pending';
type ContentFilter = 'all' | 'docs_only' | 'full';
type SortOption = 'activity' | 'recent' | 'name' | 'chunks' | 'docs' | 'stars';

const statusFilters: { value: StatusFilter; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All', icon: Database },
  { value: 'fetched', label: 'Fetched', icon: CheckCircle2 },
  { value: 'syncing', label: 'Syncing', icon: RefreshCw },
  { value: 'failed', label: 'Failed', icon: XCircle },
  { value: 'empty', label: 'Empty', icon: AlertTriangle },
  { value: 'pending', label: 'Pending', icon: Clock },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'activity', label: 'Latest commit' },
  { value: 'chunks', label: 'Most chunks' },
  { value: 'docs', label: 'Most documents' },
  { value: 'stars', label: 'Most stars' },
  { value: 'recent', label: 'Recently synced' },
  { value: 'name', label: 'Name (A–Z)' },
];

export default function SourcesPage() {
  const [, setSources] = useAtom(sourcesAtom);
  const [loading, setLoading] = useAtom(sourcesLoadingAtom);
  const [status, setStatus] = useState<IngestionStatusResponse | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('activity');
  const [showFilters, setShowFilters] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await fetchIngestionStatus();
      setStatus(data);
      // Also update the global sources atom
      const sourcesData = await fetchSources();
      setSources(sourcesData.sources);
    } catch {
      // API might not be running
    } finally {
      setLoading(false);
    }
  }, [setSources, setLoading]);

  useEffect(() => {
    setLoading(true);
    loadStatus();
  }, [loadStatus, setLoading]);

  // Auto-refresh when repos are syncing
  useEffect(() => {
    if (!status) return;
    const hasSyncing = status.summary.syncing > 0;
    setAutoRefresh(hasSyncing);

    if (hasSyncing) {
      const interval = setInterval(loadStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [status, loadStatus]);

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoUrl.trim()) return;

    setAdding(true);
    try {
      const match = newRepoUrl.match(/(?:github\.com\/)?([^\/\s]+)\/([^\/\s]+)/);
      if (!match) {
        alert('Please enter a valid GitHub repo URL or owner/repo format');
        setAdding(false);
        return;
      }

      const [, owner, repo] = match;
      await createSource({
        name: `${owner}/${repo}`,
        type: 'github_repo',
        config: { owner, repo },
      });

      setNewRepoUrl('');
      setShowAddForm(false);
      loadStatus();
    } catch (err: any) {
      alert(`Failed to add source: ${err.message}`);
    } finally {
      setAdding(false);
    }
  };

  const handleSync = async (id: string, mode: 'light' | 'full' = 'light') => {
    try {
      if (mode === 'full') {
        await syncSourceFull(id);
      } else {
        await syncSource(id);
      }
      loadStatus();
    } catch {
      // ignore
    }
  };

  const summary = status?.summary;
  const repos = status?.repos || [];

  // ── Filtered & sorted repos ──
  const filteredRepos = useMemo(() => {
    let result = [...repos];

    // 1. Text search (name match)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(q));
    }

    // 2. Status filter
    if (statusFilter !== 'all') {
      result = result.filter((r) => {
        switch (statusFilter) {
          case 'fetched':
            return r.status === 'active' && r.totalChunks > 0;
          case 'syncing':
            return r.status === 'syncing';
          case 'failed':
            return r.status === 'error';
          case 'empty':
            return r.status === 'active' && r.totalChunks === 0;
          case 'pending':
            return r.status === 'active' && !r.lastSyncedAt;
          default:
            return true;
        }
      });
    }

    // 3. Content type filter (docs only vs full)
    if (contentFilter !== 'all') {
      result = result.filter((r) => {
        const hasDeep = Object.keys(r.fetchBreakdown).some((type) =>
          ['code', 'issues', 'prs', 'wiki'].includes(type),
        );
        return contentFilter === 'full' ? hasDeep : !hasDeep;
      });
    }

    // 4. Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'activity': {
          // Latest GitHub commit first, then most documents
          const aPushed = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
          const bPushed = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
          if (aPushed !== bPushed) return bPushed - aPushed;
          return b.totalChunks - a.totalChunks;
        }
        case 'name':
          return a.name.localeCompare(b.name);
        case 'chunks':
          return b.totalChunks - a.totalChunks;
        case 'docs':
          return b.rawDocumentCount - a.rawDocumentCount;
        case 'stars':
          return (b.stars ?? 0) - (a.stars ?? 0);
        case 'recent':
        default: {
          const aDate = a.lastSyncedAt || a.createdAt;
          const bDate = b.lastSyncedAt || b.createdAt;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        }
      }
    });

    return result;
  }, [repos, searchQuery, statusFilter, contentFilter, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    contentFilter !== 'all' ||
    sortBy !== 'activity';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setContentFilter('all');
    setSortBy('activity');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Knowledge Sources
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ingestion status for all repositories and data sources.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadStatus} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="size-4" />
            Add Source
          </Button>
        </div>
      </div>

      {/* Add Repo Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Add a GitHub Repository</CardTitle>
            <CardDescription>
              Enter a repo URL or owner/repo format. The system will
              automatically fetch README, docs, issues, PRs, code, wiki — everything.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddRepo} className="flex gap-2">
              <Input
                value={newRepoUrl}
                onChange={(e) => setNewRepoUrl(e.target.value)}
                placeholder="e.g. tokamak-network/tokamak-network-pilot"
                className="flex-1"
                disabled={adding}
              />
              <Button type="submit" disabled={adding || !newRepoUrl.trim()}>
                {adding ? <Loader2 className="size-4 animate-spin" /> : <Github className="size-4" />}
                {adding ? 'Adding...' : 'Add Repo'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Total Repos" value={summary.totalRepos} icon={Database} />
          <SummaryCard
            label="Fetched"
            value={summary.fetched}
            icon={CheckCircle2}
            color="text-green-600"
          />
          <SummaryCard
            label="Syncing"
            value={summary.syncing}
            icon={RefreshCw}
            color="text-yellow-600"
            pulse={summary.syncing > 0}
          />
          <SummaryCard
            label="Failed"
            value={summary.failed}
            icon={XCircle}
            color="text-red-600"
          />
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Empty Repos" value={summary.empty} icon={AlertTriangle} color="text-orange-500" />
          <SummaryCard label="Pending" value={summary.pending} icon={Clock} color="text-blue-500" />
          <SummaryCard label="Total Documents" value={summary.totalDocuments} icon={FileText} />
          <SummaryCard label="Total Chunks" value={summary.totalChunks} icon={BarChart3} />
        </div>
      )}

      {autoRefresh && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Auto-refreshing while repos are syncing...
        </div>
      )}

      <Separator />

      {/* ── Search bar + filter controls ── */}
      {repos.length > 0 && (
        <div className="space-y-3">
          {/* Search row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search repositories..."
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              <SlidersHorizontal className="size-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 size-2 rounded-full bg-primary inline-block" />
              )}
            </Button>
          </div>

          {/* Filter row (expandable) */}
          {showFilters && (
            <Card>
              <CardContent className="py-3 px-4 space-y-3">
                {/* Status filter pills */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {statusFilters.map((sf) => {
                      const active = statusFilter === sf.value;
                      const SfIcon = sf.icon;
                      // Show count badge
                      let count: number | undefined;
                      if (summary && sf.value !== 'all') {
                        count = (summary as unknown as Record<string, number>)[sf.value] ?? 0;
                      }
                      return (
                        <button
                          key={sf.value}
                          onClick={() => setStatusFilter(active ? 'all' : sf.value)}
                          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-border hover:border-muted-foreground/40'
                          }`}
                        >
                          <SfIcon className="size-3" />
                          {sf.label}
                          {count !== undefined && (
                            <span className={`text-[10px] ${active ? 'opacity-80' : 'opacity-60'}`}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Content type filter */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Fetch Mode</p>
                  <div className="flex gap-1.5">
                    {(
                      [
                        { value: 'all', label: 'All' },
                        { value: 'docs_only', label: 'Docs only' },
                        { value: 'full', label: 'Full (code, issues, PRs)' },
                      ] as const
                    ).map((cf) => {
                      const active = contentFilter === cf.value;
                      return (
                        <button
                          key={cf.value}
                          onClick={() => setContentFilter(active ? 'all' : cf.value)}
                          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-border hover:border-muted-foreground/40'
                          }`}
                        >
                          {cf.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Sort by</p>
                  <div className="flex gap-1.5">
                    {sortOptions.map((so) => {
                      const active = sortBy === so.value;
                      return (
                        <button
                          key={so.value}
                          onClick={() => setSortBy(so.value)}
                          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-border hover:border-muted-foreground/40'
                          }`}
                        >
                          {so.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Clear all */}
                {hasActiveFilters && (
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                      <X className="size-3" />
                      Clear all filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Result count */}
          {hasActiveFilters && (
            <p className="text-xs text-muted-foreground">
              Showing {filteredRepos.length} of {repos.length} repositories
              {searchQuery && (
                <>
                  {' '}matching &ldquo;<span className="font-medium text-foreground">{searchQuery}</span>&rdquo;
                </>
              )}
            </p>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && !status ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : repos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-4">
              <Database className="size-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-base mb-2">No sources configured</CardTitle>
            <CardDescription className="text-center max-w-sm mb-6">
              Add GitHub repos to start building the knowledge base. Set{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">GITHUB_ORGS</code>{' '}
              in your .env to auto-seed on startup.
            </CardDescription>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="size-4" />
              Add First Source
            </Button>
          </CardContent>
        </Card>
      ) : filteredRepos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="size-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">No repositories match your filters</p>
            <p className="text-xs text-muted-foreground mb-4">
              Try adjusting your search or filter criteria.
            </p>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="size-3" />
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Repo Status List */
        <div className="space-y-2">
          {filteredRepos.map((repo) => (
            <RepoStatusRow
              key={repo.id}
              repo={repo}
              onSync={(mode) => handleSync(repo.id, mode)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Summary Card Component ────────────────────────────────

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
  pulse,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color?: string;
  pulse?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`${color || 'text-muted-foreground'} ${pulse ? 'animate-pulse' : ''}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Repo Status Row Component ─────────────────────────────

function RepoStatusRow({
  repo,
  onSync,
}: {
  repo: IngestionRepoStatus;
  onSync: (mode: 'light' | 'full') => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = sourceTypeIcons[repo.type] || Database;
  const statusCfg = statusConfig[repo.status] || statusConfig.disabled;
  const StatusIcon = statusCfg.icon;

  const hasContent = repo.totalChunks > 0;
  const breakdownEntries = Object.entries(repo.fetchBreakdown).filter(([, v]) => v > 0);
  const chunkEntries = Object.entries(repo.chunkBreakdown).filter(([, v]) => v > 0);
  // Determine current fetch mode from the breakdown (if it has code/issues/prs, it was a full fetch)
  const hasDeepContent = breakdownEntries.some(
    ([type]) => ['code', 'issues', 'prs', 'wiki'].includes(type),
  );
  const fetchModeLabel = hasDeepContent ? 'Full' : 'Docs only';

  return (
    <Card
      className={`transition-colors ${repo.status === 'error' ? 'border-red-200' : ''}`}
    >
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <Icon className="size-4 text-muted-foreground" />
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/sources/${repo.id}`}
                className="text-sm font-medium hover:underline truncate"
              >
                {repo.name}
              </Link>
              <div
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${statusCfg.color}`}
              >
                <StatusIcon className={`size-3 ${repo.status === 'syncing' ? 'animate-spin' : ''}`} />
                {statusCfg.label}
              </div>
              {hasContent && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {fetchModeLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasContent ? (
                <>
                  {repo.rawDocumentCount} docs → {repo.totalChunks} chunks
                  {repo.pushedAt && (
                    <> · Last commit {timeAgo(repo.pushedAt)}</>
                  )}
                  {repo.stars ? <> · {repo.stars}★</> : null}
                  {repo.language && <> · {repo.language}</>}
                </>
              ) : repo.status === 'syncing' ? (
                <>
                  Ingesting...
                  {repo.pushedAt && <> · Last commit {timeAgo(repo.pushedAt)}</>}
                </>
              ) : repo.status === 'error' ? (
                <span className="text-red-500">{repo.errorMessage}</span>
              ) : (
                <>
                  Not yet synced
                  {repo.pushedAt && <> · Last commit {timeAgo(repo.pushedAt)}</>}
                </>
              )}
            </p>
            {repo.description && (
              <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate max-w-md">
                {repo.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {breakdownEntries.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setExpanded(!expanded)}
              >
                Details
                <ChevronRight
                  className={`size-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
                />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              title="Sync (docs only)"
              onClick={() => onSync('light')}
              disabled={repo.status === 'syncing'}
            >
              <RefreshCw className={`size-3.5 ${repo.status === 'syncing' ? 'animate-spin' : ''}`} />
            </Button>
            <Link href={`/sources/${repo.id}`}>
              <Button variant="ghost" size="icon" className="size-7">
                <ChevronRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>

      {/* Expanded breakdown */}
      {expanded && (
        <CardContent className="pt-0 pb-3 px-4">
          <div className="pl-11 space-y-4">
            {/* Fetch & chunk breakdowns */}
            {(breakdownEntries.length > 0 || chunkEntries.length > 0) && (
              <div className="grid grid-cols-2 gap-4">
                {breakdownEntries.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Fetched from GitHub
                    </p>
                    <div className="space-y-1">
                      {breakdownEntries.map(([type, count]) => {
                        const TypeIcon = contentTypeIcons[type] || Database;
                        return (
                          <div key={type} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <TypeIcon className="size-3" />
                              {type}
                            </span>
                            <span className="font-medium">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {chunkEntries.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Indexed Chunks
                    </p>
                    <div className="space-y-1">
                      {chunkEntries.map(([type, count]) => {
                        const TypeIcon = contentTypeIcons[type] || Database;
                        return (
                          <div key={type} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <TypeIcon className="size-3" />
                              {type}
                            </span>
                            <span className="font-medium">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Deep sync button */}
            {!hasDeepContent && repo.status !== 'syncing' && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onSync('full')}
              >
                <Code2 className="size-3" />
                Deep Sync — fetch code, issues, PRs, wiki
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
