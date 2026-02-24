import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { EmbeddingModule } from '../embedding/embedding.module';
import { VectorModule } from '../vector/vector.module';
import { LlmModule } from '../llm/llm.module';
import { ProjectsModule } from '../projects/projects.module';
import { Feedback } from '../../entities/feedback.entity';
import { Message } from '../../entities/message.entity';
import { Source } from '../../entities/source.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Feedback, Message, Source]),
    EmbeddingModule,
    VectorModule,
    LlmModule,
    forwardRef(() => ProjectsModule),
  ],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
