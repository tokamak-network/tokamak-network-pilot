import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './modules/database/database.module';
import { VectorModule } from './modules/vector/vector.module';
import { EmbeddingModule } from './modules/embedding/embedding.module';
import { GitHubModule } from './modules/github/github.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { RagModule } from './modules/rag/rag.module';
import { SourcesModule } from './modules/sources/sources.module';
import { ContentModule } from './modules/content/content.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    // ── Config ──
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),

    // ── Database (PostgreSQL via TypeORM) ──
    DatabaseModule,

    // ── BullMQ (Redis-backed job queue) ──
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: new URL(
            config.get<string>('REDIS_URL', 'redis://localhost:6379'),
          ).hostname,
          port: parseInt(
            new URL(
              config.get<string>('REDIS_URL', 'redis://localhost:6379'),
            ).port || '6379',
            10,
          ),
        },
      }),
    }),

    // ── Infrastructure modules ──
    VectorModule,
    EmbeddingModule,
    GitHubModule,
    IngestionModule,

    // ── Feature modules ──
    RagModule,
    SourcesModule,
    ContentModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
