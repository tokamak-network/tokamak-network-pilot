'use client';

import { Newspaper, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NewsEmptyStateProps {
  isNewsEnabled: boolean;
  onSync?: () => void;
  syncing?: boolean;
  isLead?: boolean;
}

export function NewsEmptyState({
  isNewsEnabled,
  onSync,
  syncing,
  isLead,
}: NewsEmptyStateProps) {
  if (!isNewsEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Newspaper className="size-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-base font-medium mb-1">News not enabled</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {isLead
            ? 'Enable news aggregation in the Settings tab to start collecting articles related to this project.'
            : 'News aggregation is not enabled for this project. Ask a project lead to enable it.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <Newspaper className="size-8 text-muted-foreground/40" />
      </div>
      <h3 className="text-base font-medium mb-1">No news articles yet</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        News will be automatically fetched every hour. You can also trigger a manual sync.
      </p>
      {onSync && (
        <Button
          variant="outline"
          size="sm"
          onClick={onSync}
          disabled={syncing}
        >
          <RefreshCw className={`size-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync now'}
        </Button>
      )}
    </div>
  );
}
