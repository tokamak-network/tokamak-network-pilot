import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const authService = {
    requestOtp: jest.fn(),
    verifyOtp: jest.fn(),
    getProfile: jest.fn(),
  };

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(authService as any);
  });

  it('delegates requestOtp', async () => {
    authService.requestOtp.mockResolvedValue({ message: 'ok' });
    await expect(controller.requestOtp({ email: 'alice@tokamak.network' } as any)).resolves.toEqual(
      { message: 'ok' },
    );
    expect(authService.requestOtp).toHaveBeenCalledWith('alice@tokamak.network');
  });

  it('delegates verifyOtp', async () => {
    authService.verifyOtp.mockResolvedValue({ token: 'jwt' });
    await expect(
      controller.verifyOtp({ email: 'alice@tokamak.network', code: '123456' } as any),
    ).resolves.toEqual({ token: 'jwt' });
    expect(authService.verifyOtp).toHaveBeenCalledWith('alice@tokamak.network', '123456');
  });

  it('returns current user profile from request user.sub', async () => {
    authService.getProfile.mockResolvedValue({ id: 'u1' });
    await expect(controller.me({ user: { sub: 'u1' } })).resolves.toEqual({ id: 'u1' });
    expect(authService.getProfile).toHaveBeenCalledWith('u1');
  });
});
