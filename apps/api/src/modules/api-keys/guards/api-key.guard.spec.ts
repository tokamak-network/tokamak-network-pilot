import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  const apiKeysService = {
    validateKey: jest.fn(),
    hasScope: jest.fn(),
    recordUsage: jest.fn(),
  };
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  let guard: ApiKeyGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new ApiKeyGuard(apiKeysService as any, reflector);
  });

  function createContext(request: any): any {
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => 'handler',
      getClass: () => 'class',
    };
  }

  it('rejects requests without API key header', async () => {
    await expect(guard.canActivate(createContext({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects invalid API key', async () => {
    apiKeysService.validateKey.mockResolvedValue(null);

    await expect(
      guard.canActivate(createContext({ headers: { 'x-api-key': 'bad' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when required scope is missing', async () => {
    apiKeysService.validateKey.mockResolvedValue({ id: 'k1' });
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ask']);
    apiKeysService.hasScope.mockReturnValue(false);

    await expect(
      guard.canActivate(createContext({ headers: { 'x-api-key': 'ok' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('attaches api key and records usage on success', async () => {
    const request = { headers: { 'x-api-key': 'ok' } };
    apiKeysService.validateKey.mockResolvedValue({ id: 'k1' });
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ask']);
    apiKeysService.hasScope.mockReturnValue(true);
    apiKeysService.recordUsage.mockResolvedValue(undefined);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect((request as any).apiKey).toEqual({ id: 'k1' });
    expect(apiKeysService.recordUsage).toHaveBeenCalledWith('k1');
  });

  it('still succeeds when fire-and-forget usage logging fails', async () => {
    apiKeysService.validateKey.mockResolvedValue({ id: 'k2' });
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    apiKeysService.recordUsage.mockRejectedValue(new Error('db down'));

    await expect(
      guard.canActivate(createContext({ headers: { 'x-api-key': 'ok' } })),
    ).resolves.toBe(true);
  });
});
