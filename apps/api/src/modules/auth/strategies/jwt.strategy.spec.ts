import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const config = {
    get: jest.fn().mockReturnValue('jwt-secret'),
  };
  const userRepo = {
    findOneBy: jest.fn(),
  };

  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(config as any, userRepo as any);
  });

  it('returns normalized auth user when account is active', async () => {
    userRepo.findOneBy.mockResolvedValue({ id: 'u1', isActive: true });

    await expect(
      strategy.validate({ sub: 'u1', email: 'a@tokamak.network', role: 'member' }),
    ).resolves.toEqual({
      id: 'u1',
      sub: 'u1',
      email: 'a@tokamak.network',
      role: 'member',
    });
  });

  it('rejects inactive or missing user', async () => {
    userRepo.findOneBy.mockResolvedValueOnce(null);
    await expect(
      strategy.validate({ sub: 'u1', email: 'a@tokamak.network', role: 'member' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    userRepo.findOneBy.mockResolvedValueOnce({ id: 'u1', isActive: false });
    await expect(
      strategy.validate({ sub: 'u1', email: 'a@tokamak.network', role: 'member' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
