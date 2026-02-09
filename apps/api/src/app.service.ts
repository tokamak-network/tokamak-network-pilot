import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'tokamak-pilot-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }
}
