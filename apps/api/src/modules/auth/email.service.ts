import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromAddress: string;
  private readonly fromDomain: string;
  private readonly apiKeyPrefix: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY', '');
    this.fromDomain = this.config.get<string>('EMAIL_FROM_DOMAIN', 'tokamak.network');
    this.fromAddress = `Tokamak Forest <noreply@${this.fromDomain}>`;
    this.apiKeyPrefix = apiKey ? apiKey.slice(0, 8) + '...' : '(not set)';

    if (apiKey) {
      this.resend = new Resend(apiKey);
      this.logger.log(
        `Resend configured — from: "${this.fromAddress}", domain: ${this.fromDomain}, key: ${this.apiKeyPrefix}`,
      );
    } else {
      this.resend = null;
      this.logger.warn(
        'No RESEND_API_KEY configured — emails will be logged to console (dev mode)',
      );
    }
  }

  async sendOtp(email: string, code: string): Promise<void> {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f1eb; padding: 40px 16px;">
        <div style="max-width: 460px; margin: 0 auto;">

          <!-- Header -->
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #1b3a2d; letter-spacing: -0.3px;">Tokamak Forest</h1>
          </div>

          <!-- Card -->
          <div style="background-color: #faf7f2; border-radius: 16px; border: 1px solid #e0d9cd; overflow: hidden;">

            <!-- Green accent bar -->
            <div style="height: 4px; background: linear-gradient(90deg, #1b3a2d, #4d8b5c, #1b3a2d);"></div>

            <div style="padding: 36px 32px;">
              <p style="margin: 0 0 6px; font-size: 16px; font-weight: 600; color: #1b3a2d;">Verification Code</p>
              <p style="margin: 0 0 24px; font-size: 14px; color: #6b7c6f; line-height: 1.5;">
                Enter this code to sign in to your Tokamak Forest account.
              </p>

              <!-- OTP Code -->
              <div style="background-color: #e8f0e8; border: 1px solid #c5d9c5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 38px; font-weight: 700; letter-spacing: 10px; color: #1b3a2d; font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;">${code}</span>
              </div>

              <!-- Expiry notice -->
              <p style="margin: 0; font-size: 13px; color: #6b7c6f; line-height: 1.6;">
                This code expires in <strong style="color: #1b3a2d;">5 minutes</strong>. If you didn't request this, you can safely ignore this email.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 28px;">
            <p style="margin: 0 0 4px; font-size: 12px; color: #9a9083;">
              Sent by Tokamak Forest &mdash; Knowledge Hub for the Tokamak Network
            </p>
            <p style="margin: 0; font-size: 11px; color: #b5ad9f;">
              &copy; ${new Date().getFullYear()} Tokamak Network. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    `;

    if (this.resend) {
      // Production: send via Resend
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to: [email],
        subject: `${code} — Your Tokamak Forest login code`,
        html,
      });

      if (error) {
        this.logger.error(
          `Failed to send OTP to ${email}: ${error.message} — ` +
          `from: "${this.fromAddress}", domain: ${this.fromDomain}, key: ${this.apiKeyPrefix}`,
        );
        throw new Error(`Failed to send email: ${error.message}`);
      }

      this.logger.log(`OTP sent to ${email} (from: ${this.fromAddress})`);
    } else {
      // Dev mode: just log
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      this.logger.log(`📧 OTP for ${email}: ${code}`);
      this.logger.log(`   (No RESEND_API_KEY — logged for dev)`);
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }
  }
}
