import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Source } from '../../entities/source.entity';
import { Document } from '../../entities/document.entity';
import { IngestionService } from './ingestion.service';
import { IngestionProcessor, INGESTION_QUEUE } from './ingestion.processor';
import { ChunkerService } from './chunker.service';
import { BootstrapService } from './bootstrap.service';
import { GitHubModule } from '../github/github.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { VectorModule } from '../vector/vector.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Source, Document]),
    BullModule.registerQueue({ name: INGESTION_QUEUE }),
    GitHubModule,
    EmbeddingModule,
    VectorModule,
  ],
  providers: [IngestionService, IngestionProcessor, ChunkerService, BootstrapService],
  exports: [IngestionService],
})
export class IngestionModule {}
