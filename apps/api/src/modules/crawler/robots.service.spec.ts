import axios from 'axios';
import { RobotsService, isDisallowed } from './robots.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RobotsService', () => {
  let service: RobotsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RobotsService();
  });

  it('parses disallowed prefixes for matching user agent and caches result', async () => {
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: `
User-agent: *
Disallow: /private

User-agent: TokamakPilotCrawler
Disallow: /crawler-only
`,
    } as any);

    const origin = `https://example-${Date.now()}.com`;
    const ua = 'TokamakPilotCrawler/1.0';

    const first = await service.getDisallowedPrefixes(origin, ua);
    const second = await service.getDisallowedPrefixes(origin, ua);

    expect(first).toEqual(['/private', '/crawler-only']);
    expect(second).toEqual(first);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it('returns empty list when robots fetch fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network error'));

    const result = await service.getDisallowedPrefixes(
      `https://failure-${Date.now()}.com`,
      'TokamakPilotCrawler/1.0',
    );

    expect(result).toEqual([]);
  });

  it('isAllowed checks disallow prefixes and tolerates invalid urls', async () => {
    expect(await service.isAllowed('https://x.com/public/page', ['/private'])).toBe(true);
    expect(await service.isAllowed('https://x.com/private/page', ['/private'])).toBe(false);
    expect(await service.isAllowed('not a valid url', ['/private'])).toBe(true);
  });

  it('isDisallowed utility uses prefix semantics', () => {
    expect(isDisallowed('/private/abc', ['/private'])).toBe(true);
    expect(isDisallowed('/pub', ['/private'])).toBe(false);
    expect(isDisallowed('private/x', ['/private'])).toBe(true);
  });
});
