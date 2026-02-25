import { of, throwError } from 'rxjs';
import { UsageLoggingInterceptor } from './usage-logging.interceptor';

describe('UsageLoggingInterceptor', () => {
  const apiKeysService = {
    logUsage: jest.fn(),
  };

  let interceptor: UsageLoggingInterceptor;

  beforeEach(() => {
    jest.clearAllMocks();
    interceptor = new UsageLoggingInterceptor(apiKeysService as any);
  });

  function contextWith(req: any, res: any): any {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
    };
  }

  it('logs usage on successful responses', async () => {
    apiKeysService.logUsage.mockResolvedValue(undefined);

    const req = {
      apiKey: { id: 'k1' },
      path: '/api/v1/public/ask',
      method: 'POST',
      ip: '1.2.3.4',
      socket: {},
      headers: { 'user-agent': 'jest' },
    };
    const res = { statusCode: 200 };

    await new Promise<void>((resolve, reject) => {
      interceptor
        .intercept(contextWith(req, res), { handle: () => of({ ok: true }) } as any)
        .subscribe({ next: () => undefined, error: reject, complete: resolve });
    });

    expect(apiKeysService.logUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKeyId: 'k1',
        endpoint: '/api/v1/public/ask',
        method: 'POST',
        statusCode: 200,
      }),
    );
  });

  it('also logs usage on error responses', async () => {
    apiKeysService.logUsage.mockResolvedValue(undefined);

    const req = {
      apiKey: { id: 'k1' },
      path: '/api/v1/public/ask',
      method: 'POST',
      ip: '1.2.3.4',
      socket: {},
      headers: {},
    };
    const res = { statusCode: 500 };

    await new Promise<void>((resolve) => {
      interceptor
        .intercept(contextWith(req, res), {
          handle: () => throwError(() => new Error('boom')),
        } as any)
        .subscribe({ error: () => resolve(), complete: resolve });
    });

    expect(apiKeysService.logUsage).toHaveBeenCalledWith(
      expect.objectContaining({ apiKeyId: 'k1', statusCode: 500 }),
    );
  });

  it('skips logging when request has no apiKey', async () => {
    const req = { path: '/x', method: 'GET', headers: {}, socket: {} };
    const res = { statusCode: 200 };

    await new Promise<void>((resolve, reject) => {
      interceptor
        .intercept(contextWith(req, res), { handle: () => of('ok') } as any)
        .subscribe({ error: reject, complete: resolve });
    });

    expect(apiKeysService.logUsage).not.toHaveBeenCalled();
  });

  it('swallows logUsage failures', async () => {
    apiKeysService.logUsage.mockRejectedValue(new Error('db unavailable'));

    const req = {
      apiKey: { id: 'k1' },
      path: '/x',
      method: 'GET',
      headers: {},
      socket: {},
    };
    const res = { statusCode: 200 };

    await new Promise<void>((resolve, reject) => {
      interceptor
        .intercept(contextWith(req, res), { handle: () => of('ok') } as any)
        .subscribe({ error: reject, complete: resolve });
    });

    expect(apiKeysService.logUsage).toHaveBeenCalled();
  });
});
