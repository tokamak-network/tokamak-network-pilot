import { LlmsTxtService } from './llms-txt.service';

type Repo = { find: jest.Mock };

function repo(): Repo {
  return { find: jest.fn() };
}

describe('LlmsTxtService', () => {
  let projectRepo: Repo;
  let sourceRepo: Repo;
  let contentRepo: Repo;
  let config: { get: jest.Mock };
  let service: LlmsTxtService;

  beforeEach(() => {
    projectRepo = repo();
    sourceRepo = repo();
    contentRepo = repo();
    config = {
      get: jest.fn((key: string, fallback: unknown) => {
        const map: Record<string, unknown> = {
          PUBLIC_URL: 'https://pilot.tokamak.network',
          API_PORT: 4100,
        };
        return key in map ? map[key] : fallback;
      }),
    };

    service = new LlmsTxtService(
      projectRepo as any,
      sourceRepo as any,
      contentRepo as any,
      config as any,
    );
  });

  it('generates brief llms.txt with projects, active sources, and content', async () => {
    projectRepo.find.mockResolvedValue([
      { name: 'Alpha', slug: 'alpha', description: 'Alpha project', isPublic: true },
    ]);
    sourceRepo.find.mockResolvedValue([
      { name: 'Docs', type: 'website', status: 'active', config: { url: 'https://docs.example.com' } },
      { name: 'Old', type: 'website', status: 'inactive', config: { url: 'https://old.example.com' } },
    ]);
    contentRepo.find.mockResolvedValue([
      { id: 'c1', title: 'How to stake', body: 'Staking body', category: 'guides' },
    ]);

    const text = await service.generateBrief();

    expect(text).toContain('# Tokamak Pilot');
    expect(text).toContain('## Links');
    expect(text).toContain('[Alpha](https://pilot.tokamak.network/api/v1/projects/alpha/public)');
    expect(text).toContain('[Docs](https://docs.example.com)');
    expect(text).not.toContain('old.example.com');
    expect(text).toContain('## Curated Content');
    expect(text).toContain('[How to stake](https://pilot.tokamak.network/api/v1/content/c1)');
  });

  it('generates full llms text with full sections and api reference', async () => {
    projectRepo.find.mockResolvedValue([
      {
        name: 'Beta',
        slug: 'beta',
        description: 'Beta desc',
        summary: 'Beta summary',
        links: [{ label: 'Site', url: 'https://beta.example.com' }],
        isPublic: true,
      },
    ]);
    sourceRepo.find.mockResolvedValue([
      {
        name: 'Repo',
        type: 'github',
        status: 'active',
        documentCount: 10,
        config: { htmlUrl: 'https://github.com/tokamak/repo', description: 'Main repo', stars: 50 },
      },
    ]);
    contentRepo.find.mockResolvedValue([
      {
        title: 'Entry 1',
        body: 'Entry body',
        category: 'knowledge',
        project: 'Beta',
        tags: ['tokamak'],
        author: { name: 'Alice', email: 'alice@example.com' },
      },
    ]);

    const text = await service.generateFull();

    expect(text).toContain('# Tokamak Pilot — Full Knowledge Base');
    expect(text).toContain('### Beta');
    expect(text).toContain('**Links:**');
    expect(text).toContain('### Repo');
    expect(text).toContain('#### Entry 1');
    expect(text).toContain('## API Reference');
    expect(text).toContain('Base URL: https://pilot.tokamak.network/api/v1/public');
  });

  it('uses PUBLIC_URL fallback to localhost:API_PORT', () => {
    const localConfig = {
      get: jest.fn((key: string, fallback: unknown) => {
        if (key === 'PUBLIC_URL') return fallback;
        if (key === 'API_PORT') return 5000;
        return fallback;
      }),
    };
    const s = new LlmsTxtService(projectRepo as any, sourceRepo as any, contentRepo as any, localConfig as any);
    const baseUrl = (s as any).getBaseUrl();
    expect(baseUrl).toBe('http://localhost:5000');
  });

  it('helper utilities truncate/capitalize/groupBy correctly', () => {
    expect((service as any).truncate('abc', 10)).toBe('abc');
    expect((service as any).truncate('hello world', 5)).toBe('hello...');
    expect((service as any).capitalize('guide')).toBe('Guide');

    const grouped = (service as any).groupBy(
      [{ category: 'a', x: 1 }, { category: 'a', x: 2 }, { category: '', x: 3 }],
      'category',
    );
    expect(Object.keys(grouped)).toEqual(['a', '']);
    expect(grouped.a).toHaveLength(2);
  });
});
