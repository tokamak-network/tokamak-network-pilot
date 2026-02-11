'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Database,
  FileText,
  Code2,
  MessageSquare,
  GitPullRequest,
  BookOpen,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Loader2,
  BarChart3,
  Github,
  Zap,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Layers,
  Hash,
} from 'lucide-react';
import {
  fetchIngestionStatus,
  fetchSources,
  fetchContent,
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

const contentTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  readme: { label: 'READMEs', icon: FileText, color: 'bg-blue-500' },
  documentation: { label: 'Docs / Markdown', icon: FileText, color: 'bg-indigo-500' },
  code: { label: 'Code Files', icon: Code2, color: 'bg-emerald-500' },
  issue: { label: 'Issues', icon: MessageSquare, color: 'bg-amber-500' },
  pull_request: { label: 'Pull Requests', icon: GitPullRequest, color: 'bg-purple-500' },
  wiki: { label: 'Wiki Pages', icon: BookOpen, color: 'bg-pink-500' },
  other: { label: 'Other', icon: Database, color: 'bg-gray-500' },
};

export default function DashboardPage() {
  const [status, setStatus] = useState<IngestionStatusResponse | null>(null);
  const [contentCount, setContentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [statusData, contentData] = await Promise.allSettled([
        fetchIngestionStatus(),
        fetchContent({ limit: 1 }),
      ]);
      if (statusData.status === 'fulfilled') setStatus(statusData.value);
      if (contentData.status === 'fulfilled') setContentCount(contentData.value.total);
    } catch {
      // API might not be running
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh if syncing
  useEffect(() => {
    if (status?.summary.syncing && status.summary.syncing > 0) {
      const interval = setInterval(loadData, 5000);
      return () => clearInterval(interval);
    }
  }, [status, loadData]);

  const summary = status?.summary;
  const repos = status?.repos || [];

  // Aggregate content type totals across all repos
  const aggregatedChunks: Record<string, number> = {};
  for (const repo of repos) {
    for (const [type, count] of Object.entries(repo.chunkBreakdown || {})) {
      aggregatedChunks[type] = (aggregatedChunks[type] || 0) + count;
    }
  }
  const chunkEntries = Object.entries(aggregatedChunks).sort((a, b) => b[1] - a[1]);
  const totalChunks = chunkEntries.reduce((sum, [, v]) => sum + v, 0);

  // Top repos by chunk count
  const topRepos = [...repos]
    .filter((r) => r.totalChunks > 0)
    .sort((a, b) => b.totalChunks - a.totalChunks)
    .slice(0, 10);

  // Recently synced
  const recentlySynced = [...repos]
    .filter((r) => r.lastSyncedAt)
    .sort((a, b) => new Date(b.lastSyncedAt!).getTime() - new Date(a.lastSyncedAt!).getTime())
    .slice(0, 5);

  // Failed repos
  const failedRepos = repos.filter((r) => r.status === 'error');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Analytics and overview of the Tokamak knowledge base.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); loadData(); }}>
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ─── Top-level KPIs ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Repositories"
          value={summary?.totalRepos ?? 0}
          icon={Github}
          href="/sources"
          detail={summary ? `${summary.fetched} indexed` : undefined}
        />
        <KpiCard
          label="Documents Fetched"
          value={summary?.totalDocuments ?? 0}
          icon={FileText}
          detail="From GitHub"
        />
        <KpiCard
          label="Vector Chunks"
          value={summary?.totalChunks ?? 0}
          icon={Layers}
          detail="In Qdrant"
        />
        <KpiCard
          label="Team Content"
          value={contentCount}
          icon={BookOpen}
          href="/content"
          detail="Curated entries"
        />
      </div>

      {/* ─── Ingestion Status Row ──────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatusPill label="Fetched" value={summary?.fetched ?? 0} icon={CheckCircle2} color="text-green-600 bg-green-50" />
        <StatusPill label="Syncing" value={summary?.syncing ?? 0} icon={RefreshCw} color="text-yellow-600 bg-yellow-50" pulse={!!summary?.syncing} />
        <StatusPill label="Failed" value={summary?.failed ?? 0} icon={XCircle} color="text-red-600 bg-red-50" />
        <StatusPill label="Empty" value={summary?.empty ?? 0} icon={AlertTriangle} color="text-orange-500 bg-orange-50" />
        <StatusPill label="Pending" value={summary?.pending ?? 0} icon={Clock} color="text-blue-500 bg-blue-50" />
      </div>

      {summary?.syncing ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Auto-refreshing — {summary.syncing} repo(s) currently syncing...
        </div>
      ) : null}

      <Separator />

      {/* ─── Content Breakdown + Top Repos ─────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Content Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="size-4" />
              Content Breakdown
            </CardTitle>
            <CardDescription>
              Indexed chunks by content type
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chunkEntries.length > 0 ? (
              <div className="space-y-3">
                {chunkEntries.map(([type, count]) => {
                  const config = contentTypeConfig[type] || contentTypeConfig.other;
                  const pct = totalChunks > 0 ? (count / totalChunks) * 100 : 0;
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <config.icon className="size-3.5 text-muted-foreground" />
                          {config.label}
                        </span>
                        <span className="font-medium tabular-nums">
                          {count.toLocaleString()}
                          <span className="text-muted-foreground text-xs ml-1">
                            ({pct.toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${config.color} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No data indexed yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Repos by Size */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="size-4" />
              Top Repositories
            </CardTitle>
            <CardDescription>
              Largest repos by indexed chunk count
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topRepos.length > 0 ? (
              <div className="space-y-2">
                {topRepos.map((repo, i) => (
                  <Link
                    key={repo.id}
                    href={`/sources/${repo.id}`}
                    className="flex items-center gap-3 py-1.5 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
                  >
                    <span className="text-xs text-muted-foreground w-5 text-right tabular-nums">
                      {i + 1}.
                    </span>
                    <Github className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate flex-1">{repo.name}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {repo.totalChunks.toLocaleString()} chunks
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No repositories indexed yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Recent Activity + Errors ──────────────────────── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recently Synced */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="size-4" />
              Recently Synced
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentlySynced.length > 0 ? (
              <div className="space-y-2">
                {recentlySynced.map((repo) => (
                  <Link
                    key={repo.id}
                    href={`/sources/${repo.id}`}
                    className="flex items-center justify-between py-1.5 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
                  >
                    <span className="text-sm truncate">{repo.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {formatRelativeTime(repo.lastSyncedAt!)}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No syncs yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Errors */}
        <Card className={failedRepos.length > 0 ? 'border-red-200' : ''}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className={`size-4 ${failedRepos.length > 0 ? 'text-red-500' : ''}`} />
              Failed Ingestions
              {failedRepos.length > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {failedRepos.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {failedRepos.length > 0 ? (
              <div className="space-y-3">
                {failedRepos.map((repo) => (
                  <div key={repo.id} className="space-y-1">
                    <Link
                      href={`/sources/${repo.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {repo.name}
                    </Link>
                    <p className="text-xs text-red-500 line-clamp-2">
                      {repo.errorMessage || 'Unknown error'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-4 text-center">
                <CheckCircle2 className="size-8 text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">
                  All repositories synced successfully
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── All Repos Table ───────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Hash className="size-4" />
                All Repositories ({repos.length})
              </CardTitle>
              <CardDescription>Complete list with ingestion details</CardDescription>
            </div>
            <Link href="/sources">
              <Button variant="outline" size="sm">
                Manage Sources
                <ChevronRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {repos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Repository</th>
                    <th className="text-center py-2 px-2 font-medium">Status</th>
                    <th className="text-right py-2 px-2 font-medium">Docs</th>
                    <th className="text-right py-2 px-2 font-medium">Chunks</th>
                    <th className="text-right py-2 pl-2 font-medium">Last Synced</th>
                  </tr>
                </thead>
                <tbody>
                  {repos.map((repo) => {
                    const statusCfg = statusColors[repo.status] || statusColors.disabled;
                    return (
                      <tr key={repo.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 pr-4">
                          <Link
                            href={`/sources/${repo.id}`}
                            className="hover:underline flex items-center gap-2"
                          >
                            <Github className="size-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate max-w-[250px]">{repo.name}</span>
                          </Link>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${statusCfg}`}>
                            {repo.status}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">
                          {repo.rawDocumentCount || '—'}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">
                          {repo.totalChunks || '—'}
                        </td>
                        <td className="py-2 pl-2 text-right text-xs text-muted-foreground">
                          {repo.lastSyncedAt
                            ? formatRelativeTime(repo.lastSyncedAt)
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No repositories added yet.{' '}
              <Link href="/sources" className="text-primary hover:underline">
                Add sources
              </Link>{' '}
              or set <code className="text-xs bg-muted px-1 py-0.5 rounded">GITHUB_ORGS</code> in .env.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

const statusColors: Record<string, string> = {
  active: 'text-green-700 bg-green-50 border border-green-200',
  syncing: 'text-yellow-700 bg-yellow-50 border border-yellow-200',
  error: 'text-red-700 bg-red-50 border border-red-200',
  disabled: 'text-gray-500 bg-gray-50 border border-gray-200',
};

function KpiCard({
  label,
  value,
  icon: Icon,
  href,
  detail,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  href?: string;
  detail?: string;
}) {
  const inner = (
    <Card className={href ? 'hover:border-primary/30 transition-colors cursor-pointer' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <p className="text-3xl font-bold tabular-nums">{value.toLocaleString()}</p>
        {detail && (
          <p className="text-[11px] text-muted-foreground mt-1">{detail}</p>
        )}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

function StatusPill({
  label,
  value,
  icon: Icon,
  color,
  pulse,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${color}`}>
      <Icon className={`size-4 ${pulse ? 'animate-spin' : ''}`} />
      <div>
        <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
        <p className="text-[11px] leading-tight">{label}</p>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
