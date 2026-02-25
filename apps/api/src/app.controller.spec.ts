import { AppController } from './app.controller';

describe('AppController', () => {
  it('delegates health checks to AppService', () => {
    const healthPayload = {
      status: 'ok',
      service: 'tokamak-pilot-api',
      version: '0.1.0',
      timestamp: '2026-02-25T00:00:00.000Z',
    };

    const appService = {
      getHealth: jest.fn().mockReturnValue(healthPayload),
    };

    const controller = new AppController(appService as any);

    expect(controller.health()).toBe(healthPayload);
    expect(appService.getHealth).toHaveBeenCalledTimes(1);
  });
});
