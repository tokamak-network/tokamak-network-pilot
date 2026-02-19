'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Github,
  Globe,
  Upload,
  Database,
  BookOpen,
  FileText,
  GitPullRequest,
  AlertCircle,
  Code2,
  BookOpenCheck,
  RefreshCw,
  Sparkles,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  fetchSource,
  fetchSourceDocuments,
  generateSourceSummary,
  syncSource,
  syncSourceFull,
  type SourceResponse,
  type DocumentResponse,
  type SourceSummary,
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

const typeIcons: Record<string, React.ElementType> = {
  github_repo: Github,
  github_org: Github,
  documentation: Globe,
  file_upload: Upload,
  notion: BookOpen,
  custom: Database,
};

const contentTypeIcons: Record<string, React.ElementType> = {
  readme: BookOpenCheck,
  documentation: FileText,
  issue: AlertCircle,
  pull_request: GitPullRequest,
  code: Code2,
  wiki: BookOpen,
  comment: FileText,
  other: Database,
};

const contentTypeLabels: Record<string, string> = {
  readme: 'README',
  documentation: 'Documentation',
  issue: 'Issues',
  pull_request: 'Pull Requests',
  code: 'Code Files',
  wiki: 'Wiki Pages',
  comment: 'Comments',
  other: 'Other',
};

const statusColors: Record<string, string> = {
  active: 'bg-success',
  syncing: 'bg-warning',
  error: 'bg-destructive',
  disabled: 'bg-muted-foreground/50',
};

export default function SourceDetailPage() {
  const params = useParams();
  const sourceId = params.id as string;

  const [source, setSource] = useState<SourceResponse | null>(null);
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [docsTotal, setDocsTotal] = useState(0);
  const [summary, setSummary] = useState<SourceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deepSyncing, setDeepSyncing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | undefined>();
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadSource = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchSource(sourceId);
      setSource(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sourceId]);

  const loadDocuments = useCallback(
    async (contentType?: string) => {
      try {
        const data = await fetchSourceDocuments(sourceId, contentType);
        setDocuments(data.documents);
        setDocsTotal(data.total);
      } catch {
        // silently fail for docs
      }
    },
    [sourceId],
  );

  useEffect(() => {
    loadSource();
    loadDocuments();
  }, [loadSource, loadDocuments]);

  const handleFilterChange = (contentType: string | undefined) => {
    setActiveFilter(contentType);
    loadDocuments(contentType);
  };

  const handleGenerateSummary = async () => {
    setSummaryLoading(true);
    try {
      const data = await generateSourceSummary(sourceId);
      setSummary(data);
    } catch (err: any) {
      setError(`Failed to generate summary: ${err.message}`);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncSource(sourceId);
      setTimeout(() => {
        loadSource();
        loadDocuments(activeFilter);
        setSyncing(false);
      }, 2000);
    } catch (err: any) {
      setError(`Sync failed: ${err.message}`);
      setSyncing(false);
    }
  };

  const handleDeepSync = async () => {
    setDeepSyncing(true);
    try {
      await syncSourceFull(sourceId);
      setTimeout(() => {
        loadSource();
        loadDocuments(activeFilter);
        setDeepSyncing(false);
      }, 2000);
    } catch (err: any) {
      setError(`Deep sync failed: ${err.message}`);
      setDeepSyncing(false);
    }
  };

  const toggleDocExpand = (docId: string) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !source) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="size-8 text-destructive mb-4" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link href="/sources">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="size-4" />
                Back to Sources
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!source) return null;

  const Icon = typeIcons[source.type] || Database;
  const stats = source.stats || {};
  const totalChunks = Object.values(stats).reduce((a, b) => a + b, 0);
  const hasDeepContent = Object.keys(stats).some((type) =>
    ['code', 'issue', 'pull_request', 'wiki'].includes(type),
  );
  const isSyncing = source.status === 'syncing';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Link href="/sources">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Icon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-semibold tracking-tight flex items-center gap-2">
                {source.name}
                <div className={`size-2.5 rounded-full ${statusColors[source.status]}`} />
                {totalChunks > 0 && (
                  <Badge variant={hasDeepContent ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                    {hasDeepContent ? 'Full' : 'Docs only'}
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                {source.type.replace('_', ' ')}
                {source.lastSyncedAt &&
                  ` · Last synced ${new Date(source.lastSyncedAt).toLocaleString()}`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!hasDeepContent && !isSyncing && (
            <Button variant="outline" onClick={handleDeepSync} disabled={deepSyncing}>
              <Code2 className={`size-4 ${deepSyncing ? 'animate-pulse' : ''}`} />
              {deepSyncing ? 'Deep Syncing...' : 'Deep Sync'}
            </Button>
          )}
          <Button variant="outline" onClick={handleSync} disabled={syncing || isSyncing}>
            <RefreshCw className={`size-4 ${syncing || isSyncing ? 'animate-spin' : ''}`} />
            {syncing || isSyncing ? 'Syncing...' : 'Re-sync'}
          </Button>
          <Button onClick={handleGenerateSummary} disabled={summaryLoading}>
            <Sparkles className={`size-4 ${summaryLoading ? 'animate-pulse' : ''}`} />
            {summaryLoading ? 'Analyzing...' : 'AI Summary'}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-3">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {!hasDeepContent && totalChunks > 0 && !isSyncing && (
        <Card className="border-info-border bg-info-bg/50">
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="size-4 text-info" />
              <p className="text-sm text-foreground/80">
                This repo has only docs synced. Deep Sync fetches code, issues, PRs, and wiki for richer search results.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-info-border text-info hover:bg-info-bg"
              onClick={handleDeepSync}
              disabled={deepSyncing}
            >
              <Code2 className="size-3" />
              {deepSyncing ? 'Syncing...' : 'Deep Sync Now'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card
          className={`cursor-pointer transition-colors ${!activeFilter ? 'border-primary' : 'hover:border-muted-foreground/30'}`}
          onClick={() => handleFilterChange(undefined)}
        >
          <CardContent className="py-3 px-4 text-center">
            <p className="text-2xl font-bold">{totalChunks}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        {Object.entries(stats).map(([type, count]) => {
          const TypeIcon = contentTypeIcons[type] || Database;
          return (
            <Card
              key={type}
              className={`cursor-pointer transition-colors ${activeFilter === type ? 'border-primary' : 'hover:border-muted-foreground/30'}`}
              onClick={() => handleFilterChange(type)}
            >
              <CardContent className="py-3 px-4 text-center">
                <TypeIcon className="size-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {contentTypeLabels[type] || type}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="size-4" />
                AI Understanding
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {summary.provider} / {summary.model}
              </Badge>
            </div>
            <CardDescription>
              Generated {new Date(summary.generatedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(summary.summary) }}
            />
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Documents List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Ingested Documents
            {activeFilter && (
              <Badge variant="outline" className="ml-2 font-normal">
                {contentTypeLabels[activeFilter] || activeFilter}
              </Badge>
            )}
          </h2>
          <span className="text-sm text-muted-foreground">
            {docsTotal} document{docsTotal !== 1 ? 's' : ''}
          </span>
        </div>

        {documents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Database className="size-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {source.status === 'syncing'
                  ? 'Documents are being ingested...'
                  : 'No documents found. Try syncing the source.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => {
              const DocIcon = contentTypeIcons[doc.contentType] || FileText;
              const isExpanded = expandedDocs.has(doc.id);
              return (
                <Card key={doc.id}>
                  <CardContent className="py-3 px-4">
                    <div
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => toggleDocExpand(doc.id)}
                    >
                      <DocIcon className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {doc.title}
                          </p>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {contentTypeLabels[doc.contentType] || doc.contentType}
                          </Badge>
                          {doc.chunkIndex > 0 && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              chunk {doc.chunkIndex}
                            </span>
                          )}
                        </div>
                        {isExpanded && (
                          <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap leading-relaxed">
                            {doc.contentPreview}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="icon" className="size-7">
                              <ExternalLink className="size-3.5" />
                            </Button>
                          </a>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Simple markdown-to-HTML for the AI summary.
 * Handles headers, bold, lists, and code blocks.
 */
function markdownToHtml(md: string): string {
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '');
}
