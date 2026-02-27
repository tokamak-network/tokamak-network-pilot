'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NewsPaginationProps {
  page: number;
  hasMore: boolean;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function NewsPagination({
  page,
  hasMore,
  total,
  limit,
  onPageChange,
}: NewsPaginationProps) {
  if (total <= limit) return null;

  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between pt-4 border-t">
      <span className="text-xs text-muted-foreground">
        Showing {start}-{end} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground px-2 tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasMore}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
