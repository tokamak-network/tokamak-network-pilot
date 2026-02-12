import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { UsageLoggingInterceptor } from './usage-logging.interceptor';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { RagModule } from '../rag/rag.module';
import { SourcesModule } from '../sources/sources.module';
import { ContentModule } from '../content/content.module';

@Module({
  imports: [ApiKeysModule, RagModule, SourcesModule, ContentModule],
  controllers: [PublicApiController],
  providers: [UsageLoggingInterceptor],
})
export class PublicApiModule {}
