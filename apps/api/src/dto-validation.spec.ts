import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateApiKeyDto } from './modules/api-keys/dto/create-api-key.dto';
import { UpdateApiKeyDto } from './modules/api-keys/dto/update-api-key.dto';
import { RequestOtpDto, VerifyOtpDto } from './modules/auth/dto/auth.dto';
import { SubmitFeedbackDto } from './modules/feedback/dto/submit-feedback.dto';
import { CreateSourceDto, UpdateSourceDto } from './modules/sources/dto/create-source.dto';
import { CrawlWebsiteDto } from './modules/sources/dto/crawl-website.dto';
import { CreateContentDto, UpdateContentDto } from './modules/content/dto/content.dto';
import { CreateSnippetDto } from './modules/snippets/dto/create-snippet.dto';

async function errorCount(cls: any, payload: Record<string, unknown>) {
  const dto = plainToInstance(cls, payload) as object;
  const errors = await validate(dto);
  return errors.length;
}

describe('DTO validation scenarios', () => {
  it('validates CreateApiKeyDto success and failure scenarios', async () => {
    expect(
      await errorCount(CreateApiKeyDto, {
        name: 'My Key',
        scopes: ['ask', 'search'],
        expiresAt: '2027-01-01T00:00:00.000Z',
        metadata: { app: 'portal' },
      }),
    ).toBe(0);

    expect(await errorCount(CreateApiKeyDto, { name: '' })).toBeGreaterThan(0);
    expect(await errorCount(CreateApiKeyDto, { name: 'x', scopes: ['invalid'] })).toBeGreaterThan(0);
    expect(await errorCount(CreateApiKeyDto, { name: 'x', expiresAt: 'not-date' })).toBeGreaterThan(0);
    expect(await errorCount(CreateApiKeyDto, { name: 'x', metadata: 'bad' })).toBeGreaterThan(0);
  });

  it('validates UpdateApiKeyDto optional fields and invalid values', async () => {
    expect(
      await errorCount(UpdateApiKeyDto, {
        name: 'Updated',
        scopes: ['ask'],
        isActive: false,
        metadata: { v: 1 },
      }),
    ).toBe(0);

    expect(await errorCount(UpdateApiKeyDto, { scopes: ['bad-scope'] })).toBeGreaterThan(0);
    expect(await errorCount(UpdateApiKeyDto, { isActive: 'yes' })).toBeGreaterThan(0);
    expect(await errorCount(UpdateApiKeyDto, { metadata: 42 })).toBeGreaterThan(0);
  });

  it('validates auth DTOs', async () => {
    expect(await errorCount(RequestOtpDto, { email: 'alice@tokamak.network' })).toBe(0);
    expect(await errorCount(RequestOtpDto, { email: 'nope' })).toBeGreaterThan(0);

    expect(await errorCount(VerifyOtpDto, { email: 'alice@tokamak.network', code: '123456' })).toBe(0);
    expect(await errorCount(VerifyOtpDto, { email: 'alice@tokamak.network', code: '12345' })).toBeGreaterThan(0);
    expect(await errorCount(VerifyOtpDto, { email: 'invalid', code: '123456' })).toBeGreaterThan(0);
  });

  it('validates feedback DTO rules', async () => {
    expect(
      await errorCount(SubmitFeedbackDto, {
        messageId: '00000000-0000-4000-8000-000000000000',
        rating: 'up',
        comment: 'Looks good',
      }),
    ).toBe(0);

    expect(await errorCount(SubmitFeedbackDto, { messageId: 'bad', rating: 'up' })).toBeGreaterThan(0);
    expect(await errorCount(SubmitFeedbackDto, { messageId: '00000000-0000-4000-8000-000000000000', rating: 'meh' })).toBeGreaterThan(0);
  });

  it('validates source creation and update DTOs', async () => {
    expect(
      await errorCount(CreateSourceDto, {
        name: 'Docs',
        type: 'website',
        config: { url: 'https://docs.tokamak.network' },
      }),
    ).toBe(0);

    expect(await errorCount(CreateSourceDto, { name: '', type: 'website', config: {} })).toBeGreaterThan(0);
    expect(await errorCount(CreateSourceDto, { name: 'Docs', type: 'bad', config: {} })).toBeGreaterThan(0);
    expect(await errorCount(CreateSourceDto, { name: 'Docs', type: 'website', config: 'bad' })).toBeGreaterThan(0);

    expect(await errorCount(UpdateSourceDto, { name: 'Updated', config: { a: 1 } })).toBe(0);
    expect(await errorCount(UpdateSourceDto, { name: 123 })).toBeGreaterThan(0);
  });

  it('validates crawl website bounds and URL checks', async () => {
    expect(
      await errorCount(CrawlWebsiteDto, {
        url: 'https://docs.tokamak.network',
        maxPages: 10,
        maxDepth: 2,
        timeout: 15000,
        delayBetweenRequests: 500,
        respectRobotsTxt: true,
        excludePathPatterns: ['/login'],
        force: false,
      }),
    ).toBe(0);

    expect(await errorCount(CrawlWebsiteDto, { url: 'bad-url' })).toBeGreaterThan(0);
    expect(await errorCount(CrawlWebsiteDto, { url: 'https://x.com', maxPages: 0 })).toBeGreaterThan(0);
    expect(await errorCount(CrawlWebsiteDto, { url: 'https://x.com', maxDepth: 6 })).toBeGreaterThan(0);
    expect(await errorCount(CrawlWebsiteDto, { url: 'https://x.com', delayBetweenRequests: 100 })).toBeGreaterThan(0);
  });

  it('validates content DTOs', async () => {
    expect(await errorCount(CreateContentDto, { title: 'T', body: 'B', tags: ['a'] })).toBe(0);
    expect(await errorCount(CreateContentDto, { title: '', body: 'B' })).toBeGreaterThan(0);
    expect(await errorCount(CreateContentDto, { title: 'T', body: '' })).toBeGreaterThan(0);
    expect(await errorCount(CreateContentDto, { title: 'T', body: 'B', tags: [1] })).toBeGreaterThan(0);

    expect(await errorCount(UpdateContentDto, { isOutdated: true })).toBe(0);
    expect(await errorCount(UpdateContentDto, { isOutdated: 'true' })).toBeGreaterThan(0);
  });

  it('validates snippet DTO constraints', async () => {
    expect(
      await errorCount(CreateSnippetDto, {
        title: 'Deploy',
        code: 'const x = 1',
        language: 'typescript',
        description: 'desc',
        category: 'guide',
        tags: ['tokamak'],
        projectSlug: 'titan',
      }),
    ).toBe(0);

    expect(await errorCount(CreateSnippetDto, { title: '', code: 'x', language: 'ts' })).toBeGreaterThan(0);
    expect(await errorCount(CreateSnippetDto, { title: 'x', code: '', language: 'ts' })).toBeGreaterThan(0);
    expect(await errorCount(CreateSnippetDto, { title: 'x', code: 'x', language: '' })).toBeGreaterThan(0);
    expect(await errorCount(CreateSnippetDto, { title: 'x', code: 'x', language: 'ts', tags: [1] })).toBeGreaterThan(0);
  });
});
