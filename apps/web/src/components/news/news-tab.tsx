'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2, CheckSquare, X, Sparkles } from 'lucide-react';
import {
  fetchProjectNews,
  syncProjectNews,
  deleteProjectNewsArticle,
  type ProjectDetailResponse,
  type ProjectNewsArticle,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { NewsCard } from './news-card';
import { NewsEmptyState } from './news-empty-state';
import { NewsSearchBar } from './news-search-bar';
import { NewsPagination } from './news-pagination';
import { SocialPostGenerator } from './social-post-generator';
import { BulkSocialGenerator } from './bulk-social-generator';

interface NewsTabProps {
  project: ProjectDetailResponse;
  canEdit?: boolean;
  isLead?: boolean;
}

export function NewsTab({ project, canEdit, isLead }: NewsTabProps) {
  const [articles, setArticles] = useState<ProjectNewsArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const limit = 20;

  // Social post generator state
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generatorArticle, setGeneratorArticle] =
    useState<ProjectNewsArticle | null>(null);

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkGeneratorOpen, setBulkGeneratorOpen] = useState(false);

  const loadNews = useCallback(async () => {
    if (!project.isNewsEnabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetchProjectNews(project.id, {
        page,
        limit,
        search: search || undefined,
      });
      setArticles(res.data);
      setTotal(res.total);
      setHasMore(res.hasMore);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [project.id, project.isNewsEnabled, page, search]);

  useEffect(() => {
    loadNews();
  }, [loadNews]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      await syncProjectNews(project.id);
      await loadNews();
    } catch {
      // silently fail
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (articleId: string) => {
    try {
      await deleteProjectNewsArticle(project.id, articleId);
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
      setTotal((prev) => prev - 1);
    } catch {
      // silently fail
    }
  };

  const handleGeneratePost = (article: ProjectNewsArticle) => {
    setGeneratorArticle(article);
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

  const openBulkGenerator = () => {
    setBulkGeneratorOpen(true);
  };

  const selectedArticles = articles.filter((a) => selectedIds.has(a.id));

  if (!project.isNewsEnabled) {
    return <NewsEmptyState isNewsEnabled={false} isLead={isLead} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <NewsSearchBar
          value={search}
          onChange={setSearch}
          total={total}
        />
        <div className="flex items-center gap-2 shrink-0">
          {canEdit && articles.length > 0 && !selectMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectMode(true)}
            >
              <CheckSquare className="size-3.5 mr-1.5" />
              Select
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : articles.length === 0 ? (
        <NewsEmptyState
          isNewsEnabled={true}
          onSync={handleSync}
          syncing={syncing}
        />
      ) : (
        <>
          <div className="space-y-2">
            {articles.map((article) => (
              <NewsCard
                key={article.id}
                article={article}
                canDelete={canEdit}
                canGenerate={canEdit}
                selectable={selectMode}
                selected={selectedIds.has(article.id)}
                onSelect={handleSelect}
                onDelete={handleDelete}
                onGeneratePost={handleGeneratePost}
              />
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
            onClick={openBulkGenerator}
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

      {/* Social Post Generator Dialog (single) */}
      {generatorArticle && (
        <SocialPostGenerator
          open={generatorOpen}
          onOpenChange={setGeneratorOpen}
          article={generatorArticle}
          projectIdOrSlug={project.id}
        />
      )}

      {/* Bulk Social Generator Dialog */}
      {selectedArticles.length > 0 && (
        <BulkSocialGenerator
          open={bulkGeneratorOpen}
          onOpenChange={setBulkGeneratorOpen}
          articles={selectedArticles}
          projectIdOrSlug={project.id}
          onComplete={exitSelectMode}
        />
      )}
    </div>
  );
}
