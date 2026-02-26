import { AppService } from './app.service';

describe('AppService', () => {
  it('returns health payload with stable fields and ISO timestamp', () => {
    const service = new AppService();
    const result = service.getHealth();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('tokamak-pilot-api');
    expect(result.version).toBe('0.1.0');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
