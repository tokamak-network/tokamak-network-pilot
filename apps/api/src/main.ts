import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Global prefix
  const prefix = config.get<string>('API_PREFIX', '/api/v1');
  app.setGlobalPrefix(prefix);

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
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.get<number>('API_PORT', 4000);
  await app.listen(port);
  console.log(`🚀 Tokamak Pilot API running on http://localhost:${port}${prefix}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
