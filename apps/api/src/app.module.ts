import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './modules/database/database.module';
import { VectorModule } from './modules/vector/vector.module';
import { EmbeddingModule } from './modules/embedding/embedding.module';
import { LlmModule } from './modules/llm/llm.module';
import { GitHubModule } from './modules/github/github.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { RagModule } from './modules/rag/rag.module';
import { SourcesModule } from './modules/sources/sources.module';
import { ContentModule } from './modules/content/content.module';
import { AuthModule } from './modules/auth/auth.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { PublicApiModule } from './modules/public-api/public-api.module';
import { FileUploadModule } from './modules/file-upload/file-upload.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { LlmsTxtModule } from './modules/llms-txt/llms-txt.module';
import { ExportModule } from './modules/export/export.module';
import { WidgetModule } from './modules/widget/widget.module';
import { ChangelogModule } from './modules/changelog/changelog.module';

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
      useFactory: (config: ConfigService) => {
        const redisUrl = new URL(
          config.get<string>('REDIS_URL', 'redis://localhost:6379'),
        );
        return {
          connection: {
            host: redisUrl.hostname,
            port: parseInt(redisUrl.port || '6379', 10),
            password: redisUrl.password || undefined,
            username: redisUrl.username || undefined,
            tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),

    // ── Rate limiting (used by public API with per-key limits) ──
    ThrottlerModule.forRoot([
      {
        name: 'public-api',
        ttl: 60_000, // 1 minute window
        limit: 600, // default premium limit; overridden per-key by ApiKeyThrottlerGuard
      },
    ]),

    // ── Infrastructure modules ──
    VectorModule,
    EmbeddingModule,
    LlmModule,
    GitHubModule,
    IngestionModule,

    // ── Feature modules ──
    RagModule,
    SourcesModule,
    ContentModule,
    AuthModule,

    // ── File upload & document parsing ──
    FileUploadModule,

    // ── Conversation history ──
    ConversationsModule,

    // ── Project Management ──
    ProjectsModule,

    // ── API Key management & Public API ──
    ApiKeysModule,
    PublicApiModule,

    // ── Phase 2: AI-Friendly Output & Integrations ──
    LlmsTxtModule,
    ExportModule,
    WidgetModule,

    // ── Phase 4: Enhanced Docs & Developer Experience ──
    ChangelogModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
