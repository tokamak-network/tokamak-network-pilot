import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Source } from '../../entities/source.entity';
import { Document } from '../../entities/document.entity';
import { SourcesController } from './sources.controller';
import { SourcesService } from './sources.service';
import { VectorModule } from '../vector/vector.module';
import { LlmModule } from '../llm/llm.module';
import { INGESTION_QUEUE } from '../ingestion/ingestion.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Source, Document]),
    BullModule.registerQueue({ name: INGESTION_QUEUE }),
    VectorModule,
    LlmModule,
  ],
  controllers: [SourcesController],
  providers: [SourcesService],
  exports: [SourcesService],
})
export class SourcesModule {}
