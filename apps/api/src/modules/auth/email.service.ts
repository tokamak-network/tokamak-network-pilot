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
  private readonly webAppUrl: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY', '');
    this.fromDomain = this.config.get<string>('EMAIL_FROM_DOMAIN', 'tokamak.network');
    this.fromAddress = `Tokamak Forest <noreply@${this.fromDomain}>`;
    this.apiKeyPrefix = apiKey ? apiKey.slice(0, 8) + '...' : '(not set)';
    this.webAppUrl = this.config.get<string>('WEB_APP_URL', 'http://localhost:3000');

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

  async sendProjectInvitation(params: {
    email: string;
    projectName: string;
    inviterName: string;
    role: string;
    token: string;
    expiresAt: Date;
  }): Promise<void> {
    const { email, projectName, inviterName, role, token, expiresAt } = params;
    const acceptUrl = `${this.webAppUrl}/invitations/accept?token=${token}`;
    const expiryDays = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

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
              <p style="margin: 0 0 6px; font-size: 16px; font-weight: 600; color: #1b3a2d;">You're Invited!</p>
              <p style="margin: 0 0 24px; font-size: 14px; color: #6b7c6f; line-height: 1.6;">
                <strong style="color: #1b3a2d;">${inviterName}</strong> has invited you to join the project
                <strong style="color: #1b3a2d;">${projectName}</strong> as a <strong style="color: #1b3a2d;">${role}</strong>.
              </p>

              <!-- Accept Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${acceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #1b3a2d, #2d5a3f); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 10px; letter-spacing: 0.3px;">
                  Accept Invitation
                </a>
              </div>

              <!-- Details -->
              <div style="background-color: #e8f0e8; border: 1px solid #c5d9c5; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="font-size: 13px; color: #6b7c6f; padding: 4px 0;">Project</td>
                    <td style="font-size: 13px; color: #1b3a2d; font-weight: 600; text-align: right; padding: 4px 0;">${projectName}</td>
                  </tr>
                  <tr>
                    <td style="font-size: 13px; color: #6b7c6f; padding: 4px 0;">Your Role</td>
                    <td style="font-size: 13px; color: #1b3a2d; font-weight: 600; text-align: right; padding: 4px 0;">${role.charAt(0).toUpperCase() + role.slice(1)}</td>
                  </tr>
                  <tr>
                    <td style="font-size: 13px; color: #6b7c6f; padding: 4px 0;">Invited By</td>
                    <td style="font-size: 13px; color: #1b3a2d; font-weight: 600; text-align: right; padding: 4px 0;">${inviterName}</td>
                  </tr>
                </table>
              </div>

              <p style="margin: 0; font-size: 13px; color: #6b7c6f; line-height: 1.6;">
                This invitation expires in <strong style="color: #1b3a2d;">${expiryDays} days</strong>.
                If you didn't expect this invitation, you can safely ignore this email.
              </p>

              <!-- Fallback link -->
              <p style="margin: 16px 0 0; font-size: 12px; color: #9a9083; line-height: 1.5;">
                If the button doesn't work, copy and paste this link into your browser:<br />
                <a href="${acceptUrl}" style="color: #4d8b5c; word-break: break-all;">${acceptUrl}</a>
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
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to: [email],
        subject: `You're invited to join "${projectName}" on Tokamak Forest`,
        html,
      });

      if (error) {
        this.logger.error(
          `Failed to send invitation to ${email}: ${error.message} — ` +
          `from: "${this.fromAddress}", domain: ${this.fromDomain}, key: ${this.apiKeyPrefix}`,
        );
        throw new Error(`Failed to send invitation email: ${error.message}`);
      }

      this.logger.log(`Invitation sent to ${email} for project "${projectName}" (from: ${this.fromAddress})`);
    } else {
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      this.logger.log(`📨 Invitation for ${email}`);
      this.logger.log(`   Project: ${projectName}`);
      this.logger.log(`   Role: ${role}`);
      this.logger.log(`   Accept URL: ${acceptUrl}`);
      this.logger.log(`   (No RESEND_API_KEY — logged for dev)`);
      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    }
  }
}
