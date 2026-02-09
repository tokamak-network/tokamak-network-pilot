import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VectorStoreModule } from './modules/vector-store/vector-store.module';
import { EmbeddingModule } from './modules/embedding/embedding.module';
import { GitHubModule } from './modules/github/github.module';
import { RagModule } from './modules/rag/rag.module';
import { SourcesModule } from './modules/sources/sources.module';
import { ContentModule } from './modules/content/content.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),

    // Infrastructure modules (global)
    VectorStoreModule,
    EmbeddingModule,

    // Feature modules
    GitHubModule,
    RagModule,
    SourcesModule,
    ContentModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
