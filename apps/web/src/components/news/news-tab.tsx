'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
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
                onDelete={handleDelete}
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
    </div>
  );
}
