import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { EmbeddingModule } from '../embedding/embedding.module';
import { VectorModule } from '../vector/vector.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [EmbeddingModule, VectorModule, LlmModule],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
