import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ApiClient } from './api-client.js';

/**
 * Registers all MCP prompts on the server.
 *
 * Prompts are pre-built templates that AI assistants can use:
 * - explain-project   — Explain a Tokamak project comprehensively
 * - compare-projects  — Compare two projects side by side
 * - summarize-source  — Summarize a knowledge source
 */
export function registerPrompts(
  server: McpServer,
  client: ApiClient,
): void {
  // ── explain-project ────────────────────────────────────────

  server.prompt(
    'explain-project',
    'Generate a comprehensive explanation of a Tokamak Network project based on its data, team, and linked knowledge sources',
    { projectId: z.string().describe('Project UUID or slug') },
    async ({ projectId }) => {
      const project = await client.getProject(projectId);

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: [
                'You are an expert on the Tokamak Network ecosystem.',
                'Please provide a comprehensive explanation of the following project based on the data below.',
                '',
                '## Project Data',
                '',
                '```json',
                JSON.stringify(project, null, 2),
                '```',
                '',
                'Please cover:',
                '1. What this project is and what problem it solves',
                '2. Key features and capabilities',
                '3. How it fits into the Tokamak Network ecosystem',
                '4. Team members and their roles (if available)',
                '5. Connected knowledge sources and documentation',
                '',
                'Format your response with clear Markdown sections.',
              ].join('\n'),
            },
          },
        ],
      };
    },
  );

  // ── compare-projects ───────────────────────────────────────

  server.prompt(
    'compare-projects',
    'Compare two Tokamak Network projects side by side, highlighting similarities, differences, and how they complement each other',
    {
      projectId1: z.string().describe('First project UUID or slug'),
      projectId2: z.string().describe('Second project UUID or slug'),
    },
    async ({ projectId1, projectId2 }) => {
      const [project1, project2] = await Promise.all([
        client.getProject(projectId1),
        client.getProject(projectId2),
      ]);

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: [
                'You are an expert on the Tokamak Network ecosystem.',
                'Please compare the following two projects in detail.',
                '',
                '## Project 1',
                '',
                '```json',
                JSON.stringify(project1, null, 2),
                '```',
                '',
                '## Project 2',
                '',
                '```json',
                JSON.stringify(project2, null, 2),
                '```',
                '',
                'Please compare:',
                '1. Purpose and goals of each project',
                '2. Key similarities and differences',
                '3. How they complement each other within the ecosystem',
                '4. Team composition and structure comparison',
                '5. Knowledge sources and documentation coverage',
                '',
                'Provide a structured comparison with clear Markdown sections and a summary table.',
              ].join('\n'),
            },
          },
        ],
      };
    },
  );

  // ── summarize-source ───────────────────────────────────────

  server.prompt(
    'summarize-source',
    'Summarize a knowledge source from the Tokamak Network knowledge base, including its type, content, and relevance',
    { sourceId: z.string().describe('Source UUID') },
    async ({ sourceId }) => {
      const source = await client.getSource(sourceId);

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: [
                'You are an expert on the Tokamak Network ecosystem.',
                'Please summarize the following knowledge source.',
                '',
                '## Source Data',
                '',
                '```json',
                JSON.stringify(source, null, 2),
                '```',
                '',
                'Please provide:',
                '1. What this source contains and its purpose',
                '2. Type of content (code, documentation, discussions, etc.)',
                '3. Current sync status and freshness',
                '4. Key topics likely covered by this source',
                '5. How this source contributes to the overall Tokamak knowledge base',
                '',
                'Keep the summary concise but informative.',
              ].join('\n'),
            },
          },
        ],
      };
    },
  );
}
