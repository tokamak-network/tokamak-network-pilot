import { ThrottlerGuard } from '@nestjs/throttler';
import { TIER_RATE_LIMITS } from '../../../entities/api-key.entity';
import { ApiKeyThrottlerGuard } from './api-key-throttler.guard';

describe('ApiKeyThrottlerGuard', () => {
  let guard: ApiKeyThrottlerGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new (ApiKeyThrottlerGuard as any)();
  });

  it('uses API key id as tracker when available', async () => {
    await expect(
      (guard as any).getTracker({ apiKey: { id: 'key-1' }, ip: '1.2.3.4', socket: {} }),
    ).resolves.toBe('api-key:key-1');
  });

  it('falls back to IP / remoteAddress / unknown tracker', async () => {
    await expect(
      (guard as any).getTracker({ ip: '1.2.3.4', socket: {} }),
    ).resolves.toBe('1.2.3.4');

    await expect(
      (guard as any).getTracker({ socket: { remoteAddress: '5.6.7.8' } }),
    ).resolves.toBe('5.6.7.8');

    await expect((guard as any).getTracker({ socket: {} })).resolves.toBe('unknown');
  });

  it('overrides limit/ttl from API key rate limit', async () => {
    const superSpy = jest
      .spyOn(ThrottlerGuard.prototype as any, 'handleRequest')
      .mockResolvedValue(true);

    const context = {
      switchToHttp: () => ({ getRequest: () => ({ apiKey: { id: 'k1', rateLimit: 42 } }) }),
    };

    await expect((guard as any).handleRequest({ context, limit: 1, ttl: 1000 })).resolves.toBe(true);

    expect(superSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 42,
        ttl: 60_000,
      }),
    );
  });

  it('uses premium default when api key has no explicit rateLimit', async () => {
    const superSpy = jest
      .spyOn(ThrottlerGuard.prototype as any, 'handleRequest')
      .mockResolvedValue(true);

    const context = {
      switchToHttp: () => ({ getRequest: () => ({ apiKey: { id: 'k1' } }) }),
    };

    await (guard as any).handleRequest({ context, limit: 1, ttl: 1000 });

    expect(superSpy).toHaveBeenCalledWith(
      expect.objectContaining({ limit: TIER_RATE_LIMITS.premium, ttl: 60_000 }),
    );
  });
});
