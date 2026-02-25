import { EmailService } from './email.service';

const sendMock = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: (...args: any[]) => sendMock(...args),
    },
  })),
}));

describe('EmailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeConfig(values: Record<string, string>) {
    return {
      get: jest.fn((key: string, fallback: string) =>
        key in values ? values[key] : fallback,
      ),
    };
  }

  it('does not send via Resend when API key is missing (dev mode)', async () => {
    const service = new EmailService(
      makeConfig({
        RESEND_API_KEY: '',
        EMAIL_FROM_DOMAIN: 'tokamak.network',
        WEB_APP_URL: 'http://localhost:3000',
      }) as any,
    );

    await service.sendOtp('alice@tokamak.network', '123456');
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('sends OTP email through Resend when configured', async () => {
    sendMock.mockResolvedValue({ error: null });
    const service = new EmailService(
      makeConfig({
        RESEND_API_KEY: 're_test_key',
        EMAIL_FROM_DOMAIN: 'tokamak.network',
      }) as any,
    );

    await service.sendOtp('alice@tokamak.network', '123456');

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['alice@tokamak.network'],
        subject: expect.stringContaining('123456'),
      }),
    );
  });

  it('throws when Resend returns OTP send error', async () => {
    sendMock.mockResolvedValue({ error: { message: 'quota exceeded' } });
    const service = new EmailService(
      makeConfig({
        RESEND_API_KEY: 're_test_key',
        EMAIL_FROM_DOMAIN: 'tokamak.network',
      }) as any,
    );

    await expect(service.sendOtp('alice@tokamak.network', '123456')).rejects.toThrow(
      'Failed to send email: quota exceeded',
    );
  });

  it('sends project invitation email with accept URL', async () => {
    sendMock.mockResolvedValue({ error: null });
    const service = new EmailService(
      makeConfig({
        RESEND_API_KEY: 're_test_key',
        EMAIL_FROM_DOMAIN: 'tokamak.network',
        WEB_APP_URL: 'https://app.tokamak.network',
      }) as any,
    );

    await service.sendProjectInvitation({
      email: 'bob@tokamak.network',
      projectName: 'Pilot',
      inviterName: 'Alice',
      role: 'lead',
      token: 'invite-token',
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    });

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['bob@tokamak.network'],
        subject: expect.stringContaining('Pilot'),
        html: expect.stringContaining('https://app.tokamak.network/invitations/accept?token=invite-token'),
      }),
    );
  });

  it('throws when invitation email fails', async () => {
    sendMock.mockResolvedValue({ error: { message: 'domain not verified' } });
    const service = new EmailService(
      makeConfig({ RESEND_API_KEY: 're_test_key' }) as any,
    );

    await expect(
      service.sendProjectInvitation({
        email: 'bob@tokamak.network',
        projectName: 'Pilot',
        inviterName: 'Alice',
        role: 'viewer',
        token: 'invite-token',
        expiresAt: new Date(Date.now() + 1000),
      }),
    ).rejects.toThrow('Failed to send invitation email: domain not verified');
  });
});
