import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../../entities/user.entity';
import { OtpCode } from '../../entities/otp-code.entity';
import { EmailService } from './email.service';

/** Allowed email domains for OTP login */
const ALLOWED_DOMAINS = ['tokamak.network'];

/** OTP validity in minutes */
const OTP_TTL_MINUTES = 5;

/** Max OTP attempts before lockout (per email, within TTL window) */
const MAX_OTP_ATTEMPTS = 5;

/** Dev bypass code — always accepted on localhost */
const DEV_OTP_CODE = '123456';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly isDev: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(OtpCode)
    private readonly otpRepo: Repository<OtpCode>,
    private readonly email: EmailService,
  ) {
    // Dev mode when no RESEND_API_KEY is set (i.e. local development)
    this.isDev = !this.config.get<string>('RESEND_API_KEY');
    if (this.isDev) {
      this.logger.warn(
        `Dev mode active — OTP code "${DEV_OTP_CODE}" is always accepted`,
      );
    }
  }

  // ─── Request OTP ───────────────────────────────────────────

  async requestOtp(emailAddress: string): Promise<{ message: string }> {
    const email = emailAddress.toLowerCase().trim();

    // 1. Validate email format
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Invalid email address');
    }

    // 2. Check domain — reject non-tokamak emails immediately
    const domain = email.split('@')[1];
    if (!ALLOWED_DOMAINS.includes(domain)) {
      this.logger.warn(`OTP request rejected — unauthorized domain: ${email}`);
      throw new ForbiddenException(
        `Only @${ALLOWED_DOMAINS.join(', @')} email addresses are allowed`,
      );
    }

    // 3. In dev mode, skip sending — just return success
    if (this.isDev) {
      this.logger.log(
        `[DEV] OTP requested for ${email} — use code "${DEV_OTP_CODE}" to verify`,
      );
      return { message: 'Verification code sent to your email' };
    }

    // 4. Rate-limit: count active (non-expired) OTPs
    const activeOtps = await this.otpRepo
      .createQueryBuilder('otp')
      .where('otp.email = :email', { email })
      .andWhere('otp.used = false')
      .andWhere('otp.expiresAt > NOW()')
      .getCount();

    if (activeOtps >= MAX_OTP_ATTEMPTS) {
      throw new BadRequestException(
        'Too many OTP requests. Please wait a few minutes and try again.',
      );
    }

    // 5. Generate 6-digit OTP
    const code = this.generateOtp();

    // 6. Store OTP in database
    const otp = this.otpRepo.create({
      email,
      code,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    });
    await this.otpRepo.save(otp);

    // 7. Send OTP via Resend
    await this.email.sendOtp(email, code);

    this.logger.log(`OTP sent to ${email}`);
    return { message: 'Verification code sent to your email' };
  }

  // ─── Verify OTP ────────────────────────────────────────────

  async verifyOtp(
    emailAddress: string,
    code: string,
  ): Promise<{ token: string; user: Partial<User> }> {
    const email = emailAddress.toLowerCase().trim();

    // 1. Check domain again (defense in depth)
    const domain = email.split('@')[1];
    if (!ALLOWED_DOMAINS.includes(domain)) {
      throw new ForbiddenException('Unauthorized email domain');
    }

    // 2. Dev mode bypass: accept "123456" without DB lookup
    if (this.isDev && code === DEV_OTP_CODE) {
      this.logger.log(`[DEV] Bypass OTP verification for ${email}`);
      return this.authenticateUser(email);
    }

    // 3. Find matching, unused, non-expired OTP
    const otp = await this.otpRepo
      .createQueryBuilder('otp')
      .where('otp.email = :email', { email })
      .andWhere('otp.code = :code', { code })
      .andWhere('otp.used = false')
      .andWhere('otp.expiresAt > NOW()')
      .orderBy('otp.createdAt', 'DESC')
      .getOne();

    if (!otp) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    // 4. Mark OTP as used
    otp.used = true;
    await this.otpRepo.save(otp);

    return this.authenticateUser(email);
  }

  // ─── Profile ───────────────────────────────────────────────

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  // ─── Cleanup expired OTPs (can be called periodically) ────

  async cleanupExpiredOtps(): Promise<number> {
    const result = await this.otpRepo
      .createQueryBuilder()
      .delete()
      .where('expiresAt < NOW()')
      .orWhere('used = true')
      .execute();
    return result.affected ?? 0;
  }

  // ─── Private helpers ──────────────────────────────────────

  /**
   * Find or create user, update last login, issue JWT.
   */
  private async authenticateUser(
    email: string,
  ): Promise<{ token: string; user: Partial<User> }> {
    let user = await this.userRepo.findOneBy({ email });

    if (!user) {
      // Auto-create user on first login
      const namePart = email.split('@')[0];
      const name = namePart
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      user = this.userRepo.create({
        email,
        name,
        role: 'member',
        isActive: true,
      });
      user = await this.userRepo.save(user);
      this.logger.log(`New user created: ${email} (${user.id})`);
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    // Issue JWT
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwt.sign(payload);

    this.logger.log(`User authenticated: ${email}`);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  private generateOtp(): string {
    const bytes = crypto.randomBytes(4);
    const num = bytes.readUInt32BE(0) % 1000000;
    return String(num).padStart(6, '0');
  }
}
