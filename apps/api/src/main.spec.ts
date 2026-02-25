import { RequestMethod } from '@nestjs/common';

describe('main bootstrap', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('configures app bootstrap, OpenAPI endpoints, and listen port', async () => {
    const routes: Array<{ path: string; handler: (_req: unknown, res: any) => void }> = [];
    const document = { openapi: '3.1.0', info: { title: 'Tokamak Pilot API' } };

    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const values: Record<string, unknown> = {
          API_PREFIX: '/api/custom',
          CORS_ORIGIN: 'http://localhost:3000, https://pilot.tokamak.network',
          PORT: 5001,
          API_PORT: 4000,
        };

        return key in values ? values[key] : defaultValue;
      }),
    };

    const httpAdapter = {
      get: jest.fn((path: string, handler: (_req: unknown, res: any) => void) => {
        routes.push({ path, handler });
      }),
    };

    const app = {
      get: jest.fn().mockReturnValue(configService),
      setGlobalPrefix: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      getHttpAdapter: jest.fn().mockReturnValue(httpAdapter),
      listen: jest.fn().mockResolvedValue(undefined),
    };

    const nestFactoryCreate = jest.fn().mockResolvedValue(app);
    const createDocument = jest.fn().mockReturnValue(document);
    const setup = jest.fn();
    const dump = jest.fn().mockReturnValue('openapi: 3.1.0\n');

    class MockDocumentBuilder {
      setTitle() {
        return this;
      }

      setDescription() {
        return this;
      }

      setVersion() {
        return this;
      }

      addBearerAuth() {
        return this;
      }

      addApiKey() {
        return this;
      }

      addTag() {
        return this;
      }

      build() {
        return { title: 'Tokamak Pilot API' };
      }
    }

    jest.doMock('@nestjs/core', () => ({
      NestFactory: {
        create: nestFactoryCreate,
      },
    }));

    jest.doMock('@nestjs/swagger', () => ({
      DocumentBuilder: MockDocumentBuilder,
      SwaggerModule: {
        createDocument,
        setup,
      },
    }));

    jest.doMock('js-yaml', () => ({
      dump,
    }));

    jest.doMock('./app.module', () => ({
      AppModule: class AppModule {},
    }));

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    require('./main');
    await new Promise((resolve) => setImmediate(resolve));

    expect(nestFactoryCreate).toHaveBeenCalledTimes(1);
    expect(app.setGlobalPrefix).toHaveBeenCalledWith('/api/custom', {
      exclude: [
        { path: 'llms.txt', method: RequestMethod.GET },
        { path: 'llms-full.txt', method: RequestMethod.GET },
        { path: 'widget.js', method: RequestMethod.GET },
      ],
    });

    expect(app.enableCors).toHaveBeenCalledWith({
      origin: ['http://localhost:3000', 'https://pilot.tokamak.network'],
      credentials: true,
    });

    expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(createDocument).toHaveBeenCalledWith(app, { title: 'Tokamak Pilot API' });
    expect(setup).toHaveBeenCalledWith('docs', app, document);

    expect(routes).toHaveLength(2);
    expect(routes.map((route) => route.path)).toEqual([
      '/api/custom/openapi.json',
      '/api/custom/openapi.yaml',
    ]);

    const jsonResponse = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    routes[0].handler({}, jsonResponse);

    expect(jsonResponse.setHeader).toHaveBeenNthCalledWith(
      1,
      'Content-Type',
      'application/json',
    );
    expect(jsonResponse.setHeader).toHaveBeenNthCalledWith(
      2,
      'Content-Disposition',
      'attachment; filename="tokamak-pilot-openapi.json"',
    );
    expect(jsonResponse.send).toHaveBeenCalledWith(JSON.stringify(document, null, 2));

    const yamlResponse = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    routes[1].handler({}, yamlResponse);

    expect(yamlResponse.setHeader).toHaveBeenNthCalledWith(
      1,
      'Content-Type',
      'application/x-yaml',
    );
    expect(yamlResponse.setHeader).toHaveBeenNthCalledWith(
      2,
      'Content-Disposition',
      'attachment; filename="tokamak-pilot-openapi.yaml"',
    );
    expect(dump).toHaveBeenCalledWith(document);
    expect(yamlResponse.send).toHaveBeenCalledWith('openapi: 3.1.0\n');

    expect(app.listen).toHaveBeenCalledWith(5001, '0.0.0.0');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
