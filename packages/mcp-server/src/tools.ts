import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ApiClient } from './api-client.js';

/**
 * Registers all MCP tools on the server.
 *
 * Tools allow AI assistants to actively query the Tokamak Pilot API:
 * - tokamak_ask          — Ask a question (RAG pipeline)
 * - tokamak_search       — Semantic search
 * - tokamak_list_projects — List all projects
 * - tokamak_get_project  — Get project details
 * - tokamak_list_sources — List knowledge sources
 * - tokamak_get_content  — Get a content entry
 * - tokamak_list_content — Browse content entries
 */
export function registerTools(server: McpServer, client: ApiClient): void {
  // ── tokamak_ask ────────────────────────────────────────────

  server.tool(
    'tokamak_ask',
    'Ask a question about Tokamak Network and get an AI-generated answer with source citations',
    {
      question: z
        .string()
        .describe('The natural-language question to ask about Tokamak Network'),
      filters: z
        .array(z.string())
        .optional()
        .describe('Optional source name filters to narrow the search scope'),
    },
    async ({ question, filters }) => {
      try {
        const result = await client.ask(question, filters);
        return {
          content: [
            {
              type: 'text' as const,
              text: formatAskResponse(result),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ── tokamak_search ─────────────────────────────────────────

  server.tool(
    'tokamak_search',
    'Semantic search across all indexed Tokamak Network knowledge. Returns relevant chunks without generating an LLM answer.',
    {
      query: z.string().describe('The search query'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum number of results to return (default: 10, max: 50)'),
    },
    async ({ query, limit }) => {
      try {
        const result = await client.search(query, limit);
        return {
          content: [
            {
              type: 'text' as const,
              text: formatSearchResponse(result),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ── tokamak_list_projects ──────────────────────────────────

  server.tool(
    'tokamak_list_projects',
    'List all Tokamak Network projects with their names, descriptions, and summaries',
    async () => {
      try {
        const projects = await client.listProjects();
        return {
          content: [
            {
              type: 'text' as const,
              text: formatProjectList(projects),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ── tokamak_get_project ────────────────────────────────────

  server.tool(
    'tokamak_get_project',
    'Get detailed information about a specific Tokamak Network project including team members and linked sources',
    {
      idOrSlug: z
        .string()
        .describe('Project UUID or slug (e.g. "tokamak-bridge" or a UUID)'),
    },
    async ({ idOrSlug }) => {
      try {
        const project = await client.getProject(idOrSlug);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(project, null, 2),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ── tokamak_list_sources ───────────────────────────────────

  server.tool(
    'tokamak_list_sources',
    'List all indexed knowledge sources (GitHub repos, docs, file uploads) and their sync status',
    async () => {
      try {
        const result = await client.listSources();
        return {
          content: [
            {
              type: 'text' as const,
              text: formatSourceList(result),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ── tokamak_get_content ────────────────────────────────────

  server.tool(
    'tokamak_get_content',
    'Get a specific curated content entry by ID (project overviews, FAQs, guides, etc.)',
    {
      id: z.string().describe('Content entry UUID'),
    },
    async ({ id }) => {
      try {
        const entry = await client.getContent(id);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(entry, null, 2),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  // ── tokamak_list_content ───────────────────────────────────

  server.tool(
    'tokamak_list_content',
    'Browse curated content entries, optionally filtered by project or category',
    {
      project: z
        .string()
        .optional()
        .describe('Filter by project name or slug'),
      category: z
        .string()
        .optional()
        .describe('Filter by content category (e.g. "overview", "faq", "guide")'),
    },
    async ({ project, category }) => {
      try {
        const result = await client.listContent({ project, category });
        return {
          content: [
            {
              type: 'text' as const,
              text: formatContentList(result),
            },
          ],
        };
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

// ── Formatting Helpers ─────────────────────────────────────────

function formatAskResponse(result: {
  answer: string;
  question: string;
  sources: Array<{ title: string; url: string; score: number; snippet?: string }>;
  confidence: number;
}): string {
  let text = `## Answer\n\n${result.answer}\n\n`;
  text += `**Confidence:** ${(result.confidence * 100).toFixed(0)}%\n\n`;

  if (result.sources.length > 0) {
    text += `## Sources\n\n`;
    for (const source of result.sources) {
      text += `- **${source.title}** (score: ${source.score.toFixed(2)})`;
      if (source.url) text += ` — [link](${source.url})`;
      if (source.snippet) text += `\n  > ${source.snippet}`;
      text += '\n';
    }
  }

  return text;
}

function formatSearchResponse(result: {
  query: string;
  results: Array<{ content: string; source: string; score: number }>;
  total: number;
}): string {
  let text = `## Search Results for "${result.query}"\n\n`;
  text += `Found ${result.total} result(s).\n\n`;

  for (const [i, r] of result.results.entries()) {
    text += `### ${i + 1}. ${r.source} (score: ${r.score.toFixed(2)})\n\n`;
    text += `${r.content}\n\n---\n\n`;
  }

  return text;
}

function formatProjectList(
  projects: Array<{ id: string; name: string; slug: string; description?: string; summary?: string; memberCount: number; sourceCount: number }>,
): string {
  if (projects.length === 0) return 'No projects found.';

  let text = `## Tokamak Network Projects (${projects.length})\n\n`;
  for (const p of projects) {
    text += `### ${p.name} (\`${p.slug}\`)\n`;
    if (p.description) text += `${p.description}\n`;
    text += `- Members: ${p.memberCount} | Sources: ${p.sourceCount}\n`;
    text += `- ID: \`${p.id}\`\n\n`;
  }

  return text;
}

function formatSourceList(result: {
  sources: Array<{ id: string; name: string; type: string; status: string; lastSyncedAt?: string }>;
  total: number;
}): string {
  const { sources, total } = result;
  if (sources.length === 0) return 'No knowledge sources found.';

  let text = `## Knowledge Sources (${total})\n\n`;
  for (const s of sources) {
    const statusIcon =
      s.status === 'active' ? '✅' :
      s.status === 'syncing' ? '🔄' :
      s.status === 'error' ? '❌' : '⏸️';
    text += `- ${statusIcon} **${s.name}** — ${s.type} (${s.status})`;
    if (s.lastSyncedAt) text += ` | Last synced: ${s.lastSyncedAt}`;
    text += `\n  ID: \`${s.id}\`\n`;
  }

  return text;
}

function formatContentList(result: {
  data: Array<{ id: string; title: string; project?: string; category?: string; tags: string[] }>;
  total: number;
  hasMore: boolean;
}): string {
  const { data, total, hasMore } = result;
  if (data.length === 0) return 'No content entries found.';

  let text = `## Curated Content (${data.length} of ${total})\n\n`;
  for (const entry of data) {
    text += `- **${entry.title}**`;
    if (entry.category) text += ` [${entry.category}]`;
    if (entry.project) text += ` — Project: ${entry.project}`;
    if (entry.tags.length > 0) text += ` | Tags: ${entry.tags.join(', ')}`;
    text += `\n  ID: \`${entry.id}\`\n`;
  }

  if (hasMore) text += `\n_More entries available. Use filters to narrow results._\n`;

  return text;
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true,
  };
}
