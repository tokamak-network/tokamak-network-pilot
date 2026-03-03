'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAtom } from 'jotai';
import { Newspaper, RefreshCw, Loader2, FolderKanban, Sparkles, Rss, CheckSquare, X } from 'lucide-react';
import Link from 'next/link';
import {
  activeProjectAtom,
  projectsAtom,
} from '@/store';
import {
  fetchProjects,
  fetchProjectNews,
  syncProjectNews,
  deleteProjectNewsArticle,
  type ProjectNewsArticle,
  type ProjectResponse,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NewsCard } from '@/components/news/news-card';
import { NewsEmptyState } from '@/components/news/news-empty-state';
import { NewsSearchBar } from '@/components/news/news-search-bar';
import { NewsPagination } from '@/components/news/news-pagination';
import { SocialPostGenerator } from '@/components/news/social-post-generator';
import { BulkSocialGenerator } from '@/components/news/bulk-social-generator';

export default function NewsPage() {
  const [activeProject] = useAtom(activeProjectAtom);
  const [projects, setProjects] = useAtom(projectsAtom);

  const [articles, setArticles] = useState<(ProjectNewsArticle & { projectName?: string })[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const limit = 20;

  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generatorArticle, setGeneratorArticle] = useState<ProjectNewsArticle | null>(null);
  const [generatorProjectId, setGeneratorProjectId] = useState<string>('');

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkGeneratorOpen, setBulkGeneratorOpen] = useState(false);

  useEffect(() => {
    if (projects.length === 0) {
      fetchProjects()
        .then((data) => setProjects(data.projects))
        .catch(() => {});
    }
  }, [projects.length, setProjects]);

  const newsEnabledProjects = useMemo(
    () => projects.filter((p) => p.isNewsEnabled),
    [projects],
  );

  const loadNews = useCallback(async () => {
    setLoading(true);
    try {
      if (activeProject) {
        if (!activeProject.isNewsEnabled) {
          setArticles([]);
          setTotal(0);
          setHasMore(false);
          setLoading(false);
          return;
        }
        const res = await fetchProjectNews(activeProject.id, {
          page,
          limit,
          search: search || undefined,
        });
        setArticles(res.data.map((a) => ({ ...a, projectName: activeProject.name })));
        setTotal(res.total);
        setHasMore(res.hasMore);
      } else {
        const allArticles: (ProjectNewsArticle & { projectName?: string })[] = [];
        let totalCount = 0;

        const results = await Promise.allSettled(
          newsEnabledProjects.map(async (p) => {
            const res = await fetchProjectNews(p.id, {
              page: 1,
              limit: 100,
              search: search || undefined,
            });
            return { articles: res.data, total: res.total, projectName: p.name };
          }),
        );

        for (const r of results) {
          if (r.status === 'fulfilled') {
            allArticles.push(
              ...r.value.articles.map((a) => ({ ...a, projectName: r.value.projectName })),
            );
            totalCount += r.value.total;
          }
        }

        allArticles.sort((a, b) => {
          const aDate = a.publishedAt || a.fetchedAt;
          const bDate = b.publishedAt || b.fetchedAt;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });

        const start = (page - 1) * limit;
        setArticles(allArticles.slice(start, start + limit));
        setTotal(totalCount);
        setHasMore(start + limit < allArticles.length);
      }
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [activeProject, newsEnabledProjects, page, search]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  useEffect(() => {
    setPage(1);
  }, [search, activeProject?.id]);

  const handleSync = async () => {
    if (!activeProject) return;
    try {
      setSyncing(true);
      await syncProjectNews(activeProject.id);
      await loadNews();
    } catch {
      // silently fail
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (articleId: string) => {
    const article = articles.find((a) => a.id === articleId);
    if (!article) return;
    try {
      await deleteProjectNewsArticle(article.projectId, articleId);
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
      setTotal((prev) => prev - 1);
    } catch {
      // silently fail
    }
  };

  const handleGeneratePost = (article: ProjectNewsArticle) => {
    setGeneratorArticle(article);
    setGeneratorProjectId(article.projectId);
    setGeneratorOpen(true);
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === articles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(articles.map((a) => a.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const selectedArticles = articles.filter((a) => selectedIds.has(a.id));
  const bulkProjectId = activeProject?.id || selectedArticles[0]?.projectId || '';

  const showEmptyNewsState = !activeProject && newsEnabledProjects.length === 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Newspaper className="size-6" />
            News
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeProject
              ? `Latest news and articles about ${activeProject.name}`
              : 'Aggregated news from all your projects'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeProject && (
            <Badge variant="secondary" className="gap-1.5">
              <FolderKanban className="size-3" />
              {activeProject.name}
            </Badge>
          )}
          {articles.length > 0 && !selectMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectMode(true)}
            >
              <CheckSquare className="size-3.5 mr-1.5" />
              Select
            </Button>
          )}
          <Link href="/social-posts">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Sparkles className="size-3.5" />
              Social Posts
            </Button>
          </Link>
          {activeProject && activeProject.isNewsEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="shrink-0"
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
          )}
        </div>
      </div>

      {showEmptyNewsState ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <Rss className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">No news feeds configured</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
            Enable news aggregation on your projects to see articles here.
            Select a project from the sidebar, then enable news in the project settings.
          </p>
          <Link href="/projects">
            <Button variant="outline">
              <FolderKanban className="size-4" />
              Go to Projects
            </Button>
          </Link>
        </div>
      ) : activeProject && !activeProject.isNewsEnabled ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <Newspaper className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">News not enabled</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
            News aggregation is not enabled for {activeProject.name}.
            Enable it in the project settings to start collecting articles.
          </p>
          <Link href={`/projects/${activeProject.slug}#settings`}>
            <Button variant="outline">
              <Sparkles className="size-4" />
              Enable in Settings
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Search + controls */}
          <div className="flex items-center justify-between gap-4">
            <NewsSearchBar
              value={search}
              onChange={setSearch}
              total={total}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : articles.length === 0 ? (
            <NewsEmptyState
              isNewsEnabled={true}
              onSync={activeProject ? handleSync : undefined}
              syncing={syncing}
            />
          ) : (
            <>
              <div className="space-y-2">
                {articles.map((article) => (
                  <div key={article.id} className="relative">
                    {!activeProject && article.projectName && (
                      <div className="absolute -top-1 right-2 z-10">
                        <Badge variant="outline" className="text-[10px] bg-background">
                          {article.projectName}
                        </Badge>
                      </div>
                    )}
                    <NewsCard
                      article={article}
                      canDelete={true}
                      canGenerate={true}
                      selectable={selectMode}
                      selected={selectedIds.has(article.id)}
                      onSelect={handleSelect}
                      onDelete={handleDelete}
                      onGeneratePost={handleGeneratePost}
                    />
                  </div>
                ))}
              </div>

              <NewsPagination
                page={page}
                hasMore={hasMore}
                total={total}
                limit={limit}
                onPageChange={setPage}
              />
            </>
          )}
        </>
      )}

      {/* Sticky selection bar */}
      {selectMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg">
          <button
            onClick={handleSelectAll}
            className="text-xs text-primary hover:underline font-medium"
          >
            {selectedIds.size === articles.length ? 'Deselect all' : 'Select all'}
          </button>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm font-medium tabular-nums">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={() => setBulkGeneratorOpen(true)}
            className="gap-1.5"
          >
            <Sparkles className="size-3.5" />
            Generate Posts
          </Button>
          <button
            onClick={exitSelectMode}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {generatorArticle && (
        <SocialPostGenerator
          open={generatorOpen}
          onOpenChange={setGeneratorOpen}
          article={generatorArticle}
          projectIdOrSlug={generatorProjectId}
        />
      )}

      {selectedArticles.length > 0 && bulkProjectId && (
        <BulkSocialGenerator
          open={bulkGeneratorOpen}
          onOpenChange={setBulkGeneratorOpen}
          articles={selectedArticles}
          projectIdOrSlug={bulkProjectId}
          onComplete={exitSelectMode}
        />
      )}
    </div>
  );
}
