import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../entities/project.entity';
import { Source } from '../../entities/source.entity';
import { ContentEntry } from '../../entities/content-entry.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LlmsTxtService {
  private readonly logger = new Logger(LlmsTxtService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(Source)
    private readonly sourceRepo: Repository<Source>,
    @InjectRepository(ContentEntry)
    private readonly contentRepo: Repository<ContentEntry>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generate the brief llms.txt file following https://llmstxt.org/
   * Contains: title, summary, section links, and brief descriptions.
   */
  async generateBrief(): Promise<string> {
    const baseUrl = this.getBaseUrl();
    const [projects, sources, contentEntries] = await Promise.all([
      this.projectRepo.find({
        where: { isPublic: true },
        order: { name: 'ASC' },
      }),
      this.sourceRepo.find({ order: { name: 'ASC' } }),
      this.contentRepo.find({
        order: { updatedAt: 'DESC' },
        take: 50,
      }),
    ]);

    const lines: string[] = [];

    // Title (H1)
    lines.push('# Tokamak Pilot');
    lines.push('');

    // Blockquote summary
    lines.push(
      '> RAG-powered knowledge hub for the Tokamak Network ecosystem. ' +
        'Ask questions about Tokamak and get reliable, sourced answers. ' +
        'Covers smart contracts, Layer 2 solutions, staking, and the full Tokamak tech stack.',
    );
    lines.push('');

    // Links section
    lines.push('## Links');
    lines.push('');
    lines.push(`- [API Documentation](${baseUrl}/docs): Interactive Swagger UI with all endpoints`);
    lines.push(`- [Public API](${baseUrl}/api/v1/public): Programmatic access (requires API key)`);
    lines.push(`- [llms-full.txt](${baseUrl}/llms-full.txt): Detailed version of this file with full content`);
    lines.push('');

    // Projects section
    if (projects.length > 0) {
      lines.push('## Projects');
      lines.push('');
      for (const p of projects) {
        const desc = p.description
          ? `: ${p.description}`
          : '';
        lines.push(
          `- [${p.name}](${baseUrl}/api/v1/projects/${p.slug}/public)${desc}`,
        );
      }
      lines.push('');
    }

    // Knowledge Sources section
    if (sources.length > 0) {
      lines.push('## Knowledge Sources');
      lines.push('');
      const activeSources = sources.filter((s) => s.status === 'active');
      for (const s of activeSources.slice(0, 30)) {
        const cfg = s.config as Record<string, unknown>;
        const url = cfg?.url || cfg?.htmlUrl || '';
        const desc = (cfg?.description as string) || '';
        if (url) {
          lines.push(`- [${s.name}](${url})${desc ? `: ${desc}` : ''}`);
        } else {
          lines.push(`- ${s.name} (${s.type})${desc ? `: ${desc}` : ''}`);
        }
      }
      lines.push('');
    }

    // Content section
    const categories = this.groupBy(contentEntries, 'category');
    if (contentEntries.length > 0) {
      lines.push('## Curated Content');
      lines.push('');
      for (const [category, entries] of Object.entries(categories)) {
        const label = category || 'General';
        lines.push(`### ${this.capitalize(label)}`);
        lines.push('');
        for (const entry of entries.slice(0, 10)) {
          lines.push(
            `- [${entry.title}](${baseUrl}/api/v1/content/${entry.id}): ${this.truncate(entry.body, 120)}`,
          );
        }
        lines.push('');
      }
    }

    // API section
    lines.push('## API');
    lines.push('');
    lines.push(
      '- [POST /public/ask]('+baseUrl+'/docs#/public/PublicApiController_ask): Ask a question about Tokamak Network',
    );
    lines.push(
      '- [GET /public/search]('+baseUrl+'/docs#/public/PublicApiController_search): Semantic search across all indexed knowledge',
    );
    lines.push(
      '- [GET /public/sources]('+baseUrl+'/docs#/public/PublicApiController_listSources): List all knowledge sources',
    );
    lines.push(
      '- [GET /public/content]('+baseUrl+'/docs#/public/PublicApiController_listContent): Browse curated content',
    );
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate the full llms-full.txt file.
   * Contains everything from the brief version plus full content bodies.
   */
  async generateFull(): Promise<string> {
    const baseUrl = this.getBaseUrl();
    const [projects, sources, contentEntries] = await Promise.all([
      this.projectRepo.find({
        where: { isPublic: true },
        order: { name: 'ASC' },
      }),
      this.sourceRepo.find({ order: { name: 'ASC' } }),
      this.contentRepo.find({
        relations: ['author'],
        order: { updatedAt: 'DESC' },
        take: 100,
      }),
    ]);

    const lines: string[] = [];

    // Title (H1)
    lines.push('# Tokamak Pilot — Full Knowledge Base');
    lines.push('');

    // Blockquote summary
    lines.push(
      '> RAG-powered knowledge hub for the Tokamak Network ecosystem. ' +
        'This file contains the full curated knowledge including project summaries, ' +
        'content entries, and knowledge source details. ' +
        'Designed for consumption by LLMs and AI agents.',
    );
    lines.push('');

    // Projects with full summaries
    if (projects.length > 0) {
      lines.push('## Projects');
      lines.push('');
      for (const p of projects) {
        lines.push(`### ${p.name}`);
        lines.push('');
        if (p.description) {
          lines.push(`> ${p.description}`);
          lines.push('');
        }
        if (p.summary) {
          lines.push(p.summary);
          lines.push('');
        }

        const links = (p.links as Array<{ label: string; url: string }>) || [];
        if (links.length > 0) {
          lines.push('**Links:**');
          for (const link of links) {
            lines.push(`- [${link.label}](${link.url})`);
          }
          lines.push('');
        }

        lines.push(`- Slug: ${p.slug}`);
        lines.push(`- Public: ${p.isPublic ? 'Yes' : 'No'}`);
        lines.push(`- API: ${baseUrl}/api/v1/projects/${p.slug}/public`);
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    }

    // Knowledge Sources with details
    if (sources.length > 0) {
      lines.push('## Knowledge Sources');
      lines.push('');
      const activeSources = sources.filter((s) => s.status === 'active');
      for (const s of activeSources) {
        const cfg = s.config as Record<string, unknown>;
        const url = cfg?.url || cfg?.htmlUrl || '';
        const desc = (cfg?.description as string) || '';
        const language = (cfg?.language as string) || '';
        const stars = (cfg?.stars as number) || 0;

        lines.push(`### ${s.name}`);
        lines.push('');
        if (desc) {
          lines.push(`> ${desc}`);
          lines.push('');
        }
        lines.push(`- Type: ${s.type}`);
        lines.push(`- Documents: ${s.documentCount}`);
        if (url) lines.push(`- URL: ${url}`);
        if (language) lines.push(`- Language: ${language}`);
        if (stars > 0) lines.push(`- Stars: ${stars}`);
        if (s.lastSyncedAt) lines.push(`- Last synced: ${s.lastSyncedAt}`);
        lines.push('');
      }
    }

    // Full content entries
    if (contentEntries.length > 0) {
      lines.push('## Curated Content');
      lines.push('');
      const categories = this.groupBy(contentEntries, 'category');

      for (const [category, entries] of Object.entries(categories)) {
        const label = category || 'General';
        lines.push(`### ${this.capitalize(label)}`);
        lines.push('');

        for (const entry of entries) {
          lines.push(`#### ${entry.title}`);
          lines.push('');
          if (entry.project) {
            lines.push(`*Project: ${entry.project}*`);
          }
          if (entry.tags && entry.tags.length > 0) {
            lines.push(`*Tags: ${entry.tags.join(', ')}*`);
          }
          if (entry.author) {
            lines.push(`*Author: ${entry.author.name || entry.author.email}*`);
          }
          lines.push('');
          lines.push(entry.body);
          lines.push('');
          lines.push('---');
          lines.push('');
        }
      }
    }

    // API Documentation
    lines.push('## API Reference');
    lines.push('');
    lines.push(
      'The Tokamak Pilot API provides programmatic access to the knowledge base. ' +
        'All public endpoints require an API key passed via the `X-API-Key` header.',
    );
    lines.push('');
    lines.push(`Base URL: ${baseUrl}/api/v1/public`);
    lines.push('');
    lines.push('### Endpoints');
    lines.push('');
    lines.push(
      '- **POST /public/ask** — Ask a question about Tokamak Network (scope: `ask`)',
    );
    lines.push(
      '- **GET /public/search** — Semantic search across indexed knowledge (scope: `search`)',
    );
    lines.push(
      '- **GET /public/sources** — List all knowledge sources (scope: `sources:read`)',
    );
    lines.push(
      '- **GET /public/sources/:id** — Get source details (scope: `sources:read`)',
    );
    lines.push(
      '- **GET /public/content** — List curated content (scope: `content:read`)',
    );
    lines.push(
      '- **GET /public/content/:id** — Get content entry (scope: `content:read`)',
    );
    lines.push(
      '- **GET /public/health** — Health check (no scope required)',
    );
    lines.push('');
    lines.push(`Full interactive documentation: ${baseUrl}/docs`);
    lines.push(`OpenAPI spec: ${baseUrl}/api/v1/openapi.json`);
    lines.push('');

    return lines.join('\n');
  }

  private getBaseUrl(): string {
    const port = this.config.get<number>('API_PORT', 4000);
    return this.config.get<string>(
      'PUBLIC_URL',
      `http://localhost:${port}`,
    );
  }

  private truncate(text: string, maxLen: number): string {
    const clean = text.replace(/\n/g, ' ').trim();
    if (clean.length <= maxLen) return clean;
    return clean.slice(0, maxLen).trimEnd() + '...';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private groupBy<T>(arr: T[], key: string): Record<string, T[]> {
    return arr.reduce(
      (acc, item) => {
        const k = (item as Record<string, unknown>)[key] as string || '';
        if (!acc[k]) acc[k] = [];
        acc[k].push(item);
        return acc;
      },
      {} as Record<string, T[]>,
    );
  }
}
