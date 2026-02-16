import { Injectable } from '@nestjs/common';

export type ChangeType =
  | 'added'
  | 'changed'
  | 'fixed'
  | 'deprecated'
  | 'removed'
  | 'security';

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: Array<{
    type: ChangeType;
    description: string;
    breaking?: boolean;
  }>;
}

/**
 * Serves API changelog / release notes.
 * Currently backed by static data — can be migrated to database later.
 */
@Injectable()
export class ChangelogService {
  private readonly changelog: ChangelogEntry[] = [
    {
      version: '0.4.0',
      date: '2026-02-16',
      changes: [
        {
          type: 'added',
          description:
            'Interactive API playground — try API calls directly from the docs page',
        },
        {
          type: 'added',
          description:
            'Multi-language code examples — cURL, JavaScript, Python, Go, and Rust',
        },
        {
          type: 'added',
          description:
            'SDK code generator — auto-generated SDK snippets for each endpoint',
        },
        {
          type: 'added',
          description: 'API changelog and release notes in docs',
        },
        {
          type: 'added',
          description:
            'Webhook documentation with event schemas and testing tools',
        },
        {
          type: 'added',
          description:
            'Rate limit dashboard — view API key usage, remaining quota, and status',
        },
      ],
    },
    {
      version: '0.3.0',
      date: '2026-01-20',
      changes: [
        {
          type: 'added',
          description:
            'MCP server package (`@tokamak-pilot/mcp-server`) with 7 tools, 4 resources, and 3 prompts',
        },
        {
          type: 'added',
          description:
            'MCP tools: tokamak_ask, tokamak_search, tokamak_list_projects, tokamak_get_project, tokamak_list_sources, tokamak_get_content, tokamak_list_content',
        },
        {
          type: 'added',
          description:
            'MCP resources: tokamak://projects, tokamak://projects/{id}, tokamak://sources, tokamak://content/{id}',
        },
        {
          type: 'added',
          description:
            'MCP prompts: explain-project, compare-projects, summarize-source',
        },
        {
          type: 'added',
          description: 'Support for both stdio and SSE transports',
        },
      ],
    },
    {
      version: '0.2.0',
      date: '2025-12-15',
      changes: [
        {
          type: 'added',
          description:
            'llms.txt and llms-full.txt endpoints following the llms.txt specification',
        },
        {
          type: 'added',
          description:
            'Structured export as JSON or Markdown for content, projects, and RAG answers',
        },
        {
          type: 'added',
          description:
            'One-click copy as AI prompt with context and source formatting',
        },
        {
          type: 'added',
          description: 'OpenAPI specification download (JSON and YAML)',
        },
        {
          type: 'added',
          description:
            'Embeddable chat widget (/widget.js) with customizable theme and position',
        },
        {
          type: 'changed',
          description:
            'Export endpoints now accept format query parameter (json | markdown)',
        },
      ],
    },
    {
      version: '0.1.0',
      date: '2025-11-01',
      changes: [
        {
          type: 'added',
          description:
            'Initial public API release with API key authentication',
        },
        {
          type: 'added',
          description:
            'POST /public/ask — RAG-powered Q&A with source citations',
        },
        {
          type: 'added',
          description: 'GET /public/search — Semantic vector search',
        },
        {
          type: 'added',
          description: 'GET /public/sources — List knowledge sources',
        },
        {
          type: 'added',
          description: 'GET /public/sources/:id — Get source details',
        },
        {
          type: 'added',
          description: 'GET /public/content — List curated content entries',
        },
        {
          type: 'added',
          description: 'GET /public/content/:id — Get content entry details',
        },
        {
          type: 'added',
          description: 'GET /public/health — Health check endpoint',
        },
        {
          type: 'added',
          description:
            'API key scopes: ask, search, sources:read, content:read',
        },
        {
          type: 'added',
          description:
            'Rate limiting per API key (free: 10/min, standard: 60/min, premium: 200/min)',
        },
        {
          type: 'added',
          description: 'TypeScript SDK (@tokamak-pilot/sdk)',
        },
      ],
    },
  ];

  /** Return all changelog entries, optionally filtered by type */
  getAll(type?: ChangeType): ChangelogEntry[] {
    if (!type) return this.changelog;

    return this.changelog
      .map((entry) => ({
        ...entry,
        changes: entry.changes.filter((c) => c.type === type),
      }))
      .filter((entry) => entry.changes.length > 0);
  }

  /** Return changelog for a specific version */
  getByVersion(version: string): ChangelogEntry | undefined {
    return this.changelog.find((e) => e.version === version);
  }

  /** Return only the latest version entry */
  getLatest(): ChangelogEntry {
    return this.changelog[0];
  }
}
