import { NotFoundException } from '@nestjs/common';
import { ExportService } from './export.service';

type Repo = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

function repo(): Repo {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => v),
  };
}

describe('ExportService', () => {
  let contentRepo: Repo;
  let projectRepo: Repo;
  let memberRepo: Repo;
  let projectSourceRepo: Repo;
  let service: ExportService;

  beforeEach(() => {
    contentRepo = repo();
    projectRepo = repo();
    memberRepo = repo();
    projectSourceRepo = repo();

    service = new ExportService(
      contentRepo as any,
      projectRepo as any,
      memberRepo as any,
      projectSourceRepo as any,
    );
  });

  it('throws when exporting missing content', async () => {
    contentRepo.findOne.mockResolvedValue(null);
    await expect(service.exportContent('c1', 'json')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('exports content as markdown', async () => {
    contentRepo.findOne.mockResolvedValue({
      id: 'c1',
      title: 'My Entry',
      body: 'Body here',
      project: 'Tokamak',
      category: 'guide',
      tags: ['a', 'b'],
      isOutdated: true,
      author: { name: 'Alice', email: 'alice@example.com' },
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.exportContent('c1', 'markdown');

    expect(result.contentType).toContain('text/markdown');
    expect(result.filename).toBe('my-entry.md');
    expect(result.data).toContain('# My Entry');
    expect(result.data).toContain('Project: Tokamak');
    expect(result.data).toContain('**[OUTDATED]**');
  });

  it('exports content as json with source metadata', async () => {
    contentRepo.findOne.mockResolvedValue({
      id: 'c1',
      title: 'JSON Entry',
      body: 'Body',
      project: null,
      category: null,
      tags: [],
      isOutdated: false,
      author: null,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.exportContent('c1', 'json');
    const parsed = JSON.parse(result.data);

    expect(result.filename).toBe('json-entry.json');
    expect(parsed.id).toBe('c1');
    expect(parsed.source).toBe('Tokamak Pilot Knowledge Base');
    expect(new Date(parsed.exportedAt).toISOString()).toBe(parsed.exportedAt);
  });

  it('throws when exporting missing project', async () => {
    projectRepo.findOne.mockResolvedValue(null);
    await expect(service.exportProject('missing', 'json')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('exports project as markdown with team and sources', async () => {
    projectRepo.findOne.mockResolvedValue({
      id: 'p1',
      name: 'Pilot',
      slug: 'pilot',
      description: 'Project description',
      summary: 'Long summary',
      links: [{ label: 'Docs', url: 'https://docs.example.com' }],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    memberRepo.find.mockResolvedValue([
      { role: 'lead', user: { name: 'Alice', email: 'alice@example.com' } },
    ]);
    projectSourceRepo.find.mockResolvedValue([
      { source: { name: 'Repo', type: 'github', documentCount: 12 } },
    ]);

    const result = await service.exportProject('pilot', 'markdown');

    expect(result.filename).toBe('pilot.md');
    expect(result.data).toContain('# Pilot');
    expect(result.data).toContain('## Team');
    expect(result.data).toContain('## Knowledge Sources');
    expect(result.data).toContain('Repo (github)');
  });

  it('exports project as json', async () => {
    projectRepo.findOne.mockResolvedValue({
      id: 'p1',
      name: 'Pilot',
      slug: 'pilot',
      description: null,
      logoUrl: null,
      links: [],
      summary: null,
      isPublic: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    memberRepo.find.mockResolvedValue([]);
    projectSourceRepo.find.mockResolvedValue([]);

    const result = await service.exportProject('pilot', 'json');
    const parsed = JSON.parse(result.data);

    expect(parsed.slug).toBe('pilot');
    expect(parsed.source).toBe('Tokamak Pilot Knowledge Base');
  });

  it('exports answer to markdown and json', () => {
    const answer = {
      question: 'What is Tokamak?',
      answer: 'A rollup framework.',
      sources: [{ title: 'Docs', url: 'https://docs.example.com', score: 0.82 }],
      confidence: 0.91,
    };

    const markdown = service.exportAnswer(answer, 'markdown');
    expect(markdown.filename).toBe('tokamak-answer.md');
    expect(markdown.data).toContain('# What is Tokamak?');
    expect(markdown.data).toContain('relevance: 82%');
    expect(markdown.data).toContain('Confidence: 91%');

    const json = service.exportAnswer(answer, 'json');
    const parsed = JSON.parse(json.data);
    expect(json.filename).toBe('tokamak-answer.json');
    expect(parsed.source).toBe('Tokamak Pilot Knowledge Base');
  });

  it('formats AI prompt with sources and metadata', () => {
    const prompt = service.formatAsAiPrompt({
      type: 'content',
      title: 'Prompt Title',
      body: 'Prompt body',
      sources: [
        { title: 'With URL', url: 'https://example.com' },
        { title: 'No URL', url: '' },
      ],
      metadata: { project: 'Tokamak', skip: undefined, score: 10 },
    });

    expect(prompt).toContain('## Context from Tokamak Pilot Knowledge Base');
    expect(prompt).toContain('### Prompt Title');
    expect(prompt).toContain('- [With URL](https://example.com)');
    expect(prompt).toContain('- No URL');
    expect(prompt).toContain('*Metadata: project: Tokamak, score: 10*');
  });
});
