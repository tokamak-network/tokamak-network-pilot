import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentEntry } from '../../entities/content-entry.entity';
import { Project } from '../../entities/project.entity';
import { ProjectMember } from '../../entities/project-member.entity';
import { ProjectSource } from '../../entities/project-source.entity';

export type ExportFormat = 'json' | 'markdown';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(ContentEntry)
    private readonly contentRepo: Repository<ContentEntry>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly memberRepo: Repository<ProjectMember>,
    @InjectRepository(ProjectSource)
    private readonly projectSourceRepo: Repository<ProjectSource>,
  ) {}

  // ─── Content Entry Export ──────────────────────────────

  async exportContent(
    id: string,
    format: ExportFormat,
  ): Promise<{ data: string; contentType: string; filename: string }> {
    const entry = await this.contentRepo.findOne({
      where: { id },
      relations: ['author'],
    });
    if (!entry) {
      throw new NotFoundException(`Content entry ${id} not found`);
    }

    if (format === 'markdown') {
      return {
        data: this.contentToMarkdown(entry),
        contentType: 'text/markdown; charset=utf-8',
        filename: `${this.slugify(entry.title)}.md`,
      };
    }

    return {
      data: JSON.stringify(this.contentToJson(entry), null, 2),
      contentType: 'application/json; charset=utf-8',
      filename: `${this.slugify(entry.title)}.json`,
    };
  }

  // ─── Project Export ────────────────────────────────────

  async exportProject(
    idOrSlug: string,
    format: ExportFormat,
  ): Promise<{ data: string; contentType: string; filename: string }> {
    const project = await this.projectRepo.findOne({
      where: [{ id: idOrSlug }, { slug: idOrSlug }],
    });
    if (!project) {
      throw new NotFoundException(`Project "${idOrSlug}" not found`);
    }

    const [members, sources] = await Promise.all([
      this.memberRepo.find({
        where: { projectId: project.id },
        relations: ['user'],
        order: { role: 'ASC', joinedAt: 'ASC' },
      }),
      this.projectSourceRepo.find({
        where: { projectId: project.id },
        relations: ['source'],
        order: { assignedAt: 'DESC' },
      }),
    ]);

    if (format === 'markdown') {
      return {
        data: this.projectToMarkdown(project, members, sources),
        contentType: 'text/markdown; charset=utf-8',
        filename: `${project.slug}.md`,
      };
    }

    return {
      data: JSON.stringify(
        this.projectToJson(project, members, sources),
        null,
        2,
      ),
      contentType: 'application/json; charset=utf-8',
      filename: `${project.slug}.json`,
    };
  }

  // ─── Answer Export ─────────────────────────────────────

  exportAnswer(
    answer: {
      question: string;
      answer: string;
      sources: Array<{ title: string; url: string; score: number }>;
      confidence: number;
    },
    format: ExportFormat,
  ): { data: string; contentType: string; filename: string } {
    if (format === 'markdown') {
      return {
        data: this.answerToMarkdown(answer),
        contentType: 'text/markdown; charset=utf-8',
        filename: 'tokamak-answer.md',
      };
    }

    return {
      data: JSON.stringify(
        {
          ...answer,
          exportedAt: new Date().toISOString(),
          source: 'Tokamak Pilot Knowledge Base',
        },
        null,
        2,
      ),
      contentType: 'application/json; charset=utf-8',
      filename: 'tokamak-answer.json',
    };
  }

  // ─── AI Prompt Formatting ──────────────────────────────

  formatAsAiPrompt(content: {
    type: 'answer' | 'content' | 'project';
    title?: string;
    body: string;
    sources?: Array<{ title: string; url: string }>;
    metadata?: Record<string, unknown>;
  }): string {
    const lines: string[] = [];

    lines.push(
      '## Context from Tokamak Pilot Knowledge Base',
    );
    lines.push('');

    if (content.title) {
      lines.push(`### ${content.title}`);
      lines.push('');
    }

    lines.push(content.body);
    lines.push('');

    if (content.sources && content.sources.length > 0) {
      lines.push('### Sources');
      lines.push('');
      for (const src of content.sources) {
        if (src.url) {
          lines.push(`- [${src.title}](${src.url})`);
        } else {
          lines.push(`- ${src.title}`);
        }
      }
      lines.push('');
    }

    if (content.metadata) {
      const meta = Object.entries(content.metadata)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      if (meta) {
        lines.push(`*Metadata: ${meta}*`);
        lines.push('');
      }
    }

    lines.push('---');
    lines.push(
      '*This information is from the Tokamak Pilot Knowledge Base. ' +
        'Use it as context for your response. Cite sources when relevant.*',
    );

    return lines.join('\n');
  }

  // ─── Formatters ────────────────────────────────────────

  private contentToMarkdown(entry: ContentEntry): string {
    const lines: string[] = [];
    lines.push(`# ${entry.title}`);
    lines.push('');

    const meta: string[] = [];
    if (entry.project) meta.push(`Project: ${entry.project}`);
    if (entry.category) meta.push(`Category: ${entry.category}`);
    if (entry.tags?.length) meta.push(`Tags: ${entry.tags.join(', ')}`);
    if (entry.author) {
      meta.push(`Author: ${entry.author.name || entry.author.email}`);
    }
    meta.push(`Updated: ${entry.updatedAt}`);
    if (entry.isOutdated) meta.push('**[OUTDATED]**');

    if (meta.length > 0) {
      lines.push('---');
      for (const m of meta) {
        lines.push(m);
      }
      lines.push('---');
      lines.push('');
    }

    lines.push(entry.body);
    lines.push('');

    return lines.join('\n');
  }

  private contentToJson(entry: ContentEntry): Record<string, unknown> {
    return {
      id: entry.id,
      title: entry.title,
      body: entry.body,
      project: entry.project,
      category: entry.category,
      tags: entry.tags,
      isOutdated: entry.isOutdated,
      author: entry.author
        ? {
            name: entry.author.name,
            email: entry.author.email,
          }
        : null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      exportedAt: new Date().toISOString(),
      source: 'Tokamak Pilot Knowledge Base',
    };
  }

  private projectToMarkdown(
    project: Project,
    members: ProjectMember[],
    projectSources: ProjectSource[],
  ): string {
    const lines: string[] = [];
    lines.push(`# ${project.name}`);
    lines.push('');

    if (project.description) {
      lines.push(`> ${project.description}`);
      lines.push('');
    }

    const links = (project.links as Array<{ label: string; url: string }>) || [];
    if (links.length > 0) {
      lines.push('## Links');
      lines.push('');
      for (const link of links) {
        lines.push(`- [${link.label}](${link.url})`);
      }
      lines.push('');
    }

    if (project.summary) {
      lines.push('## Summary');
      lines.push('');
      lines.push(project.summary);
      lines.push('');
    }

    if (members.length > 0) {
      lines.push('## Team');
      lines.push('');
      for (const m of members) {
        const name = m.user?.name || m.user?.email || 'Unknown';
        lines.push(`- **${name}** — ${m.role}`);
      }
      lines.push('');
    }

    if (projectSources.length > 0) {
      lines.push('## Knowledge Sources');
      lines.push('');
      for (const ps of projectSources) {
        lines.push(
          `- ${ps.source.name} (${ps.source.type}) — ${ps.source.documentCount} documents`,
        );
      }
      lines.push('');
    }

    lines.push('---');
    lines.push(`*Exported from Tokamak Pilot on ${new Date().toISOString()}*`);
    lines.push('');

    return lines.join('\n');
  }

  private projectToJson(
    project: Project,
    members: ProjectMember[],
    projectSources: ProjectSource[],
  ): Record<string, unknown> {
    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      logoUrl: project.logoUrl,
      links: project.links,
      summary: project.summary,
      isPublic: project.isPublic,
      members: members.map((m) => ({
        role: m.role,
        user: {
          name: m.user?.name,
          email: m.user?.email,
        },
      })),
      sources: projectSources.map((ps) => ({
        name: ps.source.name,
        type: ps.source.type,
        documentCount: ps.source.documentCount,
      })),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      exportedAt: new Date().toISOString(),
      source: 'Tokamak Pilot Knowledge Base',
    };
  }

  private answerToMarkdown(answer: {
    question: string;
    answer: string;
    sources: Array<{ title: string; url: string; score: number }>;
    confidence: number;
  }): string {
    const lines: string[] = [];
    lines.push(`# ${answer.question}`);
    lines.push('');
    lines.push(answer.answer);
    lines.push('');

    if (answer.sources.length > 0) {
      lines.push('## Sources');
      lines.push('');
      for (const src of answer.sources) {
        if (src.url) {
          lines.push(
            `- [${src.title}](${src.url}) (relevance: ${(src.score * 100).toFixed(0)}%)`,
          );
        } else {
          lines.push(`- ${src.title} (relevance: ${(src.score * 100).toFixed(0)}%)`);
        }
      }
      lines.push('');
    }

    lines.push('---');
    lines.push(`*Confidence: ${(answer.confidence * 100).toFixed(0)}%*`);
    lines.push(`*Generated by Tokamak Pilot on ${new Date().toISOString()}*`);
    lines.push('');

    return lines.join('\n');
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }
}
