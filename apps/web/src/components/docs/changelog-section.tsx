'use client';

import { useState } from 'react';
import { History, Plus, Wrench, AlertTriangle, Trash2, ChevronDown, ChevronRight, Tag } from 'lucide-react';

export type ChangeType = 'added' | 'changed' | 'fixed' | 'deprecated' | 'removed' | 'security';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: Array<{
    type: ChangeType;
    description: string;
    breaking?: boolean;
  }>;
}

const TYPE_CONFIG: Record<ChangeType, { label: string; icon: typeof Plus; color: string }> = {
  added: { label: 'Added', icon: Plus, color: 'text-success bg-success/10 border-success/20' },
  changed: { label: 'Changed', icon: Wrench, color: 'text-info bg-info/10 border-info/20' },
  fixed: { label: 'Fixed', icon: Wrench, color: 'text-warning bg-warning/10 border-warning/20' },
  deprecated: { label: 'Deprecated', icon: AlertTriangle, color: 'text-chart-5 bg-chart-5/10 border-chart-5/20' },
  removed: { label: 'Removed', icon: Trash2, color: 'text-destructive bg-destructive/10 border-destructive/20' },
  security: { label: 'Security', icon: AlertTriangle, color: 'text-chart-3 bg-chart-3/10 border-chart-3/20' },
};

const CHANGELOG_DATA: ChangelogEntry[] = [
  {
    version: '0.4.0',
    date: '2026-02-16',
    changes: [
      { type: 'added', description: 'Interactive API playground — try API calls directly from the docs page' },
      { type: 'added', description: 'Multi-language code examples — cURL, JavaScript, Python, Go, and Rust' },
      { type: 'added', description: 'SDK code generator — auto-generated SDK snippets for each endpoint' },
      { type: 'added', description: 'API changelog and release notes in docs' },
      { type: 'added', description: 'Webhook documentation with event schemas and testing tools' },
      { type: 'added', description: 'Rate limit dashboard — view API key usage, remaining quota, and status' },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-01-20',
    changes: [
      { type: 'added', description: 'MCP server package (`@tokamak-pilot/mcp-server`) with 7 tools, 4 resources, and 3 prompts' },
      { type: 'added', description: 'MCP tools: `tokamak_ask`, `tokamak_search`, `tokamak_list_projects`, `tokamak_get_project`, `tokamak_list_sources`, `tokamak_get_content`, `tokamak_list_content`' },
      { type: 'added', description: 'MCP resources: `tokamak://projects`, `tokamak://projects/{id}`, `tokamak://sources`, `tokamak://content/{id}`' },
      { type: 'added', description: 'MCP prompts: `explain-project`, `compare-projects`, `summarize-source`' },
      { type: 'added', description: 'Support for both `stdio` and `SSE` transports' },
    ],
  },
  {
    version: '0.2.0',
    date: '2025-12-15',
    changes: [
      { type: 'added', description: '`llms.txt` and `llms-full.txt` endpoints following the llms.txt specification' },
      { type: 'added', description: 'Structured export as JSON or Markdown for content, projects, and RAG answers' },
      { type: 'added', description: 'One-click copy as AI prompt with context and source formatting' },
      { type: 'added', description: 'OpenAPI specification download (JSON and YAML)' },
      { type: 'added', description: 'Embeddable chat widget (`/widget.js`) with customizable theme and position' },
      { type: 'changed', description: 'Export endpoints now accept `format` query parameter (`json` | `markdown`)' },
    ],
  },
  {
    version: '0.1.0',
    date: '2025-11-01',
    changes: [
      { type: 'added', description: 'Initial public API release with API key authentication' },
      { type: 'added', description: '`POST /public/ask` — RAG-powered Q&A with source citations' },
      { type: 'added', description: '`GET /public/search` — Semantic vector search' },
      { type: 'added', description: '`GET /public/sources` — List knowledge sources' },
      { type: 'added', description: '`GET /public/sources/:id` — Get source details' },
      { type: 'added', description: '`GET /public/content` — List curated content entries' },
      { type: 'added', description: '`GET /public/content/:id` — Get content entry details' },
      { type: 'added', description: '`GET /public/health` — Health check endpoint' },
      { type: 'added', description: 'API key scopes: `ask`, `search`, `sources:read`, `content:read`' },
      { type: 'added', description: 'Rate limiting per API key (free: 10/min, standard: 60/min, premium: 200/min)' },
      { type: 'added', description: 'TypeScript SDK (`@tokamak-pilot/sdk`)' },
    ],
  },
];

function ChangeTypeBadge({ type }: { type: ChangeType }) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${config.color}`}
    >
      <Icon className="size-3" />
      {config.label}
    </span>
  );
}

export function ChangelogSection() {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(
    new Set([CHANGELOG_DATA[0]?.version]),
  );
  const [filter, setFilter] = useState<ChangeType | 'all'>('all');

  const toggleVersion = (version: string) => {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(version)) {
        next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });
  };

  const allTypes: ChangeType[] = ['added', 'changed', 'fixed', 'deprecated', 'removed', 'security'];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          All
        </button>
        {allTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
              filter === type
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {TYPE_CONFIG[type].label}
          </button>
        ))}
      </div>

      {/* Changelog Entries */}
      <div className="space-y-3">
        {CHANGELOG_DATA.map((entry) => {
          const filteredChanges =
            filter === 'all'
              ? entry.changes
              : entry.changes.filter((c) => c.type === filter);

          if (filteredChanges.length === 0) return null;

          const isExpanded = expandedVersions.has(entry.version);

          return (
            <div
              key={entry.version}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <button
                onClick={() => toggleVersion(entry.version)}
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <Tag className="size-4 text-primary shrink-0" />
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-sm font-bold font-mono">v{entry.version}</span>
                  <span className="text-xs text-muted-foreground">{entry.date}</span>
                  <span className="text-[11px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {filteredChanges.length} change{filteredChanges.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t border-border px-4 pb-4 pt-3">
                  <ul className="space-y-2">
                    {filteredChanges.map((change, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ChangeTypeBadge type={change.type} />
                        <span className="text-sm text-muted-foreground leading-relaxed pt-0.5">
                          {change.description}
                          {change.breaking && (
                            <span className="ml-1.5 inline-flex items-center rounded-md border border-destructive/20 bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive uppercase">
                              Breaking
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
