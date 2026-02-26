import { WidgetController } from './widget.controller';

describe('WidgetController', () => {
  it('builds widget script with configured public url and prefix', () => {
    const config = {
      get: jest.fn((key: string, fallback: unknown) => {
        const values: Record<string, unknown> = {
          PUBLIC_URL: 'https://pilot.tokamak.network',
          API_PREFIX: '/api/v1',
          API_PORT: 4000,
        };
        return key in values ? values[key] : fallback;
      }),
    };

    const controller = new WidgetController(config as any);
    const script = controller.getWidgetScript('tkp_default_key');

    expect(script).toContain("var apiKey = 'tkp_default_key'");
    expect(script).toContain("https://pilot.tokamak.network/api/v1/public");
    expect(script).toContain('No API key provided');
    expect(script).toContain('fetch(apiUrl + \'/ask\'');
  });

  it('falls back to localhost URL when PUBLIC_URL is absent', () => {
    const config = {
      get: jest.fn((key: string, fallback: unknown) => {
        if (key === 'PUBLIC_URL') return fallback;
        if (key === 'API_PORT') return 4300;
        if (key === 'API_PREFIX') return '/api/custom';
        return fallback;
      }),
    };

    const controller = new WidgetController(config as any);
    const script = controller.getWidgetScript();

    expect(script).toContain('http://localhost:4300/api/custom/public');
    expect(script).toContain('var apiKey = null');
  });
});
