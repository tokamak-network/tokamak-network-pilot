'use client';

import { Search, X } from 'lucide-react';

interface NewsSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  total: number;
}

export function NewsSearchBar({ value, onChange, total }: NewsSearchBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search news articles..."
          className="w-full h-9 pl-9 pr-9 text-sm rounded-md border bg-muted/50 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
        {total} article{total !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
