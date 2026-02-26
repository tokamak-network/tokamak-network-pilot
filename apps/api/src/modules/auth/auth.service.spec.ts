import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

type Repo = {
  findOneBy: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  createQueryBuilder: jest.Mock;
};

function repo(): Repo {
  return {
    findOneBy: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => v),
    createQueryBuilder: jest.fn(),
  };
}

function makeService(opts?: { resendApiKey?: string }) {
  const userRepo = repo();
  const otpRepo = repo();
  const config = {
    get: jest.fn((key: string, fallback: unknown) => {
      if (key === 'RESEND_API_KEY') return opts?.resendApiKey ?? '';
      return fallback;
    }),
  };
  const jwt = { sign: jest.fn().mockReturnValue('jwt-token') };
  const email = { sendOtp: jest.fn() };

  const service = new AuthService(
    config as any,
    jwt as any,
    userRepo as any,
    otpRepo as any,
    email as any,
  );

  return { service, userRepo, otpRepo, config, jwt, email };
}

describe('AuthService', () => {
  it('rejects invalid email format', async () => {
    const { service } = makeService();
    await expect(service.requestOtp('invalid-email')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects unauthorized email domains', async () => {
    const { service } = makeService();
    await expect(service.requestOtp('alice@example.com')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('returns success in dev mode without sending email', async () => {
    const { service, otpRepo, email } = makeService();

    await expect(service.requestOtp('alice@tokamak.network')).resolves.toEqual({
      message: 'Verification code sent to your email',
    });
    expect(otpRepo.createQueryBuilder).not.toHaveBeenCalled();
    expect(email.sendOtp).not.toHaveBeenCalled();
  });

  it('enforces otp request rate limit in production mode', async () => {
    const { service, otpRepo } = makeService({ resendApiKey: 're_12345' });

    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(5),
    };
    otpRepo.createQueryBuilder.mockReturnValue(qb);

    await expect(service.requestOtp('alice@tokamak.network')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('stores and sends OTP in production mode', async () => {
    const { service, otpRepo, email } = makeService({ resendApiKey: 're_12345' });

    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
    };
    otpRepo.createQueryBuilder.mockReturnValue(qb);

    await service.requestOtp('Alice@Tokamak.Network');

    expect(otpRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alice@tokamak.network',
        code: expect.stringMatching(/^\d{6}$/),
      }),
    );
    expect(otpRepo.save).toHaveBeenCalled();
    expect(email.sendOtp).toHaveBeenCalledWith(
      'alice@tokamak.network',
      expect.stringMatching(/^\d{6}$/),
    );
  });

  it('verifyOtp rejects unauthorized domain', async () => {
    const { service } = makeService();
    await expect(service.verifyOtp('alice@example.com', '123456')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('verifyOtp supports dev bypass code', async () => {
    const { service } = makeService();
    const authSpy = jest
      .spyOn(service as any, 'authenticateUser')
      .mockResolvedValue({ token: 't', user: { id: 'u1' } });

    await expect(service.verifyOtp('alice@tokamak.network', '123456')).resolves.toEqual({
      token: 't',
      user: { id: 'u1' },
    });
    expect(authSpy).toHaveBeenCalledWith('alice@tokamak.network');
  });

  it('verifyOtp rejects invalid code in production', async () => {
    const { service, otpRepo } = makeService({ resendApiKey: 're_12345' });
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    otpRepo.createQueryBuilder.mockReturnValue(qb);

    await expect(service.verifyOtp('alice@tokamak.network', '999999')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('verifyOtp marks OTP used then authenticates in production', async () => {
    const { service, otpRepo } = makeService({ resendApiKey: 're_12345' });
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'otp-1',
        used: false,
      }),
    };
    otpRepo.createQueryBuilder.mockReturnValue(qb);
    const authSpy = jest
      .spyOn(service as any, 'authenticateUser')
      .mockResolvedValue({ token: 'ok', user: { id: 'u1' } });

    await expect(service.verifyOtp('alice@tokamak.network', '111111')).resolves.toEqual({
      token: 'ok',
      user: { id: 'u1' },
    });

    expect(otpRepo.save).toHaveBeenCalledWith(expect.objectContaining({ used: true }));
    expect(authSpy).toHaveBeenCalledWith('alice@tokamak.network');
  });

  it('returns user profile or throws when missing', async () => {
    const { service, userRepo } = makeService();

    userRepo.findOneBy.mockResolvedValueOnce(null);
    await expect(service.getProfile('u1')).rejects.toBeInstanceOf(UnauthorizedException);

    userRepo.findOneBy.mockResolvedValueOnce({ id: 'u1', email: 'a@tokamak.network' });
    await expect(service.getProfile('u1')).resolves.toEqual({
      id: 'u1',
      email: 'a@tokamak.network',
    });
  });

  it('cleans up expired OTP rows', async () => {
    const { service, otpRepo } = makeService();

    const qb = {
      delete: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 3 }),
    };
    otpRepo.createQueryBuilder.mockReturnValue(qb);

    await expect(service.cleanupExpiredOtps()).resolves.toBe(3);

    qb.execute.mockResolvedValueOnce({ affected: undefined });
    await expect(service.cleanupExpiredOtps()).resolves.toBe(0);
  });

  it('authenticateUser creates first-time user and issues JWT', async () => {
    const { service, userRepo, jwt } = makeService();

    userRepo.findOneBy.mockResolvedValueOnce(null);
    userRepo.save
      .mockResolvedValueOnce({
        id: 'u1',
        email: 'alice.smith@tokamak.network',
        name: 'Alice Smith',
        role: 'member',
        isActive: true,
      })
      .mockResolvedValueOnce({
        id: 'u1',
        email: 'alice.smith@tokamak.network',
        name: 'Alice Smith',
        role: 'member',
        isActive: true,
      });

    const result = await (service as any).authenticateUser('alice.smith@tokamak.network');

    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alice.smith@tokamak.network',
        name: 'Alice Smith',
        role: 'member',
      }),
    );
    expect(jwt.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'u1', email: 'alice.smith@tokamak.network', role: 'member' }),
    );
    expect(result).toEqual({
      token: 'jwt-token',
      user: {
        id: 'u1',
        email: 'alice.smith@tokamak.network',
        name: 'Alice Smith',
        role: 'member',
      },
    });
  });

  it('generateOtp helper outputs 6-digit string', () => {
    const { service } = makeService();
    const code = (service as any).generateOtp();
    expect(code).toMatch(/^\d{6}$/);
  });
});
