import { ThrottlerGuard } from '@nestjs/throttler';
import { PublicFeedbackThrottlerGuard } from './public-feedback-throttler.guard';

describe('PublicFeedbackThrottlerGuard', () => {
  let guard: PublicFeedbackThrottlerGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new (PublicFeedbackThrottlerGuard as any)();
  });

  it('builds tracker key with slug and IP', async () => {
    const tracker = await (guard as any).getTracker({
      params: { slug: 'Tokamak-Project' },
      ip: '1.2.3.4',
      socket: {},
    });

    expect(tracker).toBe('public-feedback:tokamak-project:1.2.3.4');
  });

  it('falls back to unknown slug/IP when missing', async () => {
    const tracker = await (guard as any).getTracker({ params: {}, socket: {} });
    expect(tracker).toBe('public-feedback:unknown:unknown');
  });

  it('overrides throttle props with fixed public feedback limit', async () => {
    const superSpy = jest
      .spyOn(ThrottlerGuard.prototype as any, 'handleRequest')
      .mockResolvedValue(true);

    await expect((guard as any).handleRequest({ context: {}, limit: 1, ttl: 1 })).resolves.toBe(true);

    expect(superSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        ttl: 10 * 60 * 1000,
      }),
    );
  });

  it('returns request/response pair from execution context', () => {
    const req = { path: '/x' };
    const res = { statusCode: 200 };
    const context = {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    };

    const pair = (guard as any).getRequestResponse(context);
    expect(pair).toEqual({ req, res });
  });
});
