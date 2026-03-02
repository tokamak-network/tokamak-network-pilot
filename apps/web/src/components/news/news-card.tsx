'use client';

import { ExternalLink, Trash2, Clock, Newspaper, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProjectNewsArticle } from '@/lib/api';

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

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

interface NewsCardProps {
  article: ProjectNewsArticle;
  canDelete?: boolean;
  canGenerate?: boolean;
  onDelete?: (id: string) => void;
  onGeneratePost?: (article: ProjectNewsArticle) => void;
}

export function NewsCard({
  article,
  canDelete,
  canGenerate,
  onDelete,
  onGeneratePost,
}: NewsCardProps) {
  return (
    <div className="group relative flex gap-4 rounded-lg border bg-card p-4 transition-all hover:border-primary/20 hover:shadow-sm">
      {article.imageUrl ? (
        <div className="hidden sm:block shrink-0 w-24 h-24 rounded-md overflow-hidden bg-muted">
          <img
            src={article.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      ) : (
        <div className="hidden sm:flex shrink-0 w-24 h-24 rounded-md bg-muted/50 items-center justify-center">
          <Newspaper className="size-8 text-muted-foreground/30" />
        </div>
      )}

      <div className="flex-1 min-w-0 space-y-1.5">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <h3 className="font-medium text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {article.title}
          </h3>
        </a>

        {article.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {article.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {article.source && (
            <span className="font-medium text-foreground/70 truncate max-w-[140px]">
              {article.source}
            </span>
          )}
          {!article.source && article.url && (
            <span className="font-medium text-foreground/70 truncate max-w-[140px]">
              {extractDomain(article.url)}
            </span>
          )}
          {article.publishedAt && (
            <span className="flex items-center gap-1 shrink-0">
              <Clock className="size-2.5" />
              {timeAgo(article.publishedAt)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end justify-between shrink-0 gap-1">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Open article"
        >
          <ExternalLink className="size-3.5" />
        </a>

        <div className="flex flex-col gap-1">
          {canGenerate && onGeneratePost && (
            <button
              onClick={() => onGeneratePost(article)}
              className={cn(
                'p-1 rounded-md text-muted-foreground/50 transition-all',
                'opacity-0 group-hover:opacity-100',
                'hover:text-primary hover:bg-primary/10',
              )}
              title="Generate social media post"
            >
              <Sparkles className="size-3.5" />
            </button>
          )}

          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(article.id)}
              className={cn(
                'p-1 rounded-md text-muted-foreground/50 transition-all',
                'opacity-0 group-hover:opacity-100',
                'hover:text-destructive hover:bg-destructive/10',
              )}
              title="Remove article"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
