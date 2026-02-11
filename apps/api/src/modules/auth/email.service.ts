import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY', '');
    const fromDomain = this.config.get<string>('EMAIL_FROM_DOMAIN', 'tokamak.network');
    this.fromAddress = `Tokamak Pilot <noreply@${fromDomain}>`;

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log(`Resend configured (from: ${this.fromAddress})`);
    } else {
      this.resend = null;
      this.logger.warn(
        'No RESEND_API_KEY configured — emails will be logged to console (dev mode)',
      );
    }
  }

  async sendOtp(email: string, code: string): Promise<void> {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">Tokamak Pilot</h2>
        <p style="color: #475569; font-size: 15px;">Your login verification code:</p>
        <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">${code}</span>
        </div>
        <p style="color: #64748b; font-size: 13px;">This code expires in 5 minutes. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;

    if (this.resend) {
      // Production: send via Resend
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to: [email],
        subject: `Your Tokamak Pilot login code: ${code}`,
        html,
      });

      if (error) {
        this.logger.error(`Failed to send OTP to ${email}: ${error.message}`);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      this.logger.log(`OTP email sent to ${email} via Resend`);
    } else {
      // Dev mode: just log
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      this.logger.log(`📧 OTP for ${email}: ${code}`);
      this.logger.log(`   (No RESEND_API_KEY — logged for dev)`);
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }
  }
}
