import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as yaml from 'js-yaml';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Global prefix — exclude llms.txt, widget, and openapi spec routes
  const prefix = config.get<string>('API_PREFIX', '/api/v1');
  app.setGlobalPrefix(prefix, {
    exclude: [
      { path: 'llms.txt', method: RequestMethod.GET },
      { path: 'llms-full.txt', method: RequestMethod.GET },
      { path: 'widget.js', method: RequestMethod.GET },
    ],
  });

  // CORS
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Tokamak Pilot API')
    .setDescription(
      'RAG-powered knowledge base API for the Tokamak Network ecosystem',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addApiKey(
      { type: 'apiKey', name: 'X-API-Key', in: 'header', description: 'API key for public endpoints' },
      'api-key',
    )
    .addTag('ask', 'Ask questions about Tokamak Network')
    .addTag('sources', 'Manage knowledge sources (GitHub, docs, files)')
    .addTag('content', 'Team content management')
    .addTag('auth', 'Authentication & authorization')
    .addTag('api-keys', 'API key management (create, rotate, revoke)')
    .addTag('public', 'Public API for third-party integrations (requires API key)')
    .addTag('export', 'Structured export (JSON, Markdown, AI prompt)')
    .addTag('llms-txt', 'LLM-friendly knowledge files (llms.txt spec)')
    .addTag('widget', 'Embeddable chat widget')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // ── OpenAPI spec download endpoints ──
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get(`${prefix}/openapi.json`, (_req: unknown, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="tokamak-pilot-openapi.json"');
    res.send(JSON.stringify(document, null, 2));
  });
  httpAdapter.get(`${prefix}/openapi.yaml`, (_req: unknown, res: any) => {
    res.setHeader('Content-Type', 'application/x-yaml');
    res.setHeader('Content-Disposition', 'attachment; filename="tokamak-pilot-openapi.yaml"');
    res.send(yaml.dump(document));
  });

  // Railway injects PORT; fall back to API_PORT for local dev
  const port = config.get<number>('PORT', config.get<number>('API_PORT', 4000));
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Tokamak Pilot API running on http://localhost:${port}${prefix}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/docs`);
  console.log(`📄 llms.txt at http://localhost:${port}/llms.txt`);
  console.log(`📋 OpenAPI spec at http://localhost:${port}${prefix}/openapi.json`);
}

bootstrap();
