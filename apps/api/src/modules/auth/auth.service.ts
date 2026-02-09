import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  async login(email: string, _password: string) {
    this.logger.log(`Login attempt for: ${email}`);
    // TODO: Validate credentials, issue JWT
    return {
      message: 'Authentication not yet implemented',
      token: null,
    };
  }

  async getProfile(userId: string) {
    // TODO: Fetch user profile from database
    return {
      id: userId,
      message: 'User profile not yet implemented',
    };
  }
}
