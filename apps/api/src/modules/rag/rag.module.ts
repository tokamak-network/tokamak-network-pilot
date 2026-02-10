import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { EmbeddingModule } from '../embedding/embedding.module';
import { VectorModule } from '../vector/vector.module';

@Module({
  imports: [EmbeddingModule, VectorModule],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
