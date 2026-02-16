import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { ApiClient } from './api-client.js';

/**
 * Registers all MCP resources on the server.
 *
 * Resources provide read-only data that AI assistants can browse:
 * - tokamak://projects       — List of all projects
 * - tokamak://projects/{id}  — Individual project details
 * - tokamak://sources        — List of knowledge sources
 * - tokamak://content/{id}   — Individual content entry
 */
export function registerResources(
  server: McpServer,
  client: ApiClient,
): void {
  // ── Static: All Projects ───────────────────────────────────

  server.resource(
    'projects-list',
    'tokamak://projects',
    {
      description: 'List of all Tokamak Network projects with summaries',
      mimeType: 'application/json',
    },
    async (uri) => {
      const projects = await client.listProjects();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(projects, null, 2),
          },
        ],
      };
    },
  );

  // ── Dynamic: Individual Project ────────────────────────────

  server.resource(
    'project',
    new ResourceTemplate('tokamak://projects/{id}', {
      list: async () => {
        const projects = await client.listProjects();
        return {
          resources: projects.map(
            (p: { id: string; name: string; description?: string }) => ({
              uri: `tokamak://projects/${p.id}`,
              name: p.name,
              description: p.description ?? `Tokamak project: ${p.name}`,
              mimeType: 'application/json',
            }),
          ),
        };
      },
    }),
    {
      description: 'Detailed information about a specific Tokamak Network project',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const id = String(variables.id);
      const project = await client.getProject(id);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(project, null, 2),
          },
        ],
      };
    },
  );

  // ── Static: All Sources ────────────────────────────────────

  server.resource(
    'sources-list',
    'tokamak://sources',
    {
      description: 'List of all indexed knowledge sources and their sync status',
      mimeType: 'application/json',
    },
    async (uri) => {
      const sources = await client.listSources();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(sources, null, 2),
          },
        ],
      };
    },
  );

  // ── Dynamic: Individual Content Entry ──────────────────────

  server.resource(
    'content',
    new ResourceTemplate('tokamak://content/{id}', {
      list: async () => {
        const result = await client.listContent();
        const entries = result.data ?? [];
        return {
          resources: entries.map(
            (e: { id: string; title: string; category?: string }) => ({
              uri: `tokamak://content/${e.id}`,
              name: e.title,
              description: e.category
                ? `[${e.category}] ${e.title}`
                : e.title,
              mimeType: 'application/json',
            }),
          ),
        };
      },
    }),
    {
      description: 'A curated content entry (project overview, FAQ, guide, etc.)',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const id = String(variables.id);
      const entry = await client.getContent(id);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(entry, null, 2),
          },
        ],
      };
    },
  );
}
