import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { Project } from '../../entities/project.entity';
import { ProjectMember } from '../../entities/project-member.entity';
import { ProjectFeedback } from '../../entities/project-feedback.entity';
import { RoadmapItem } from '../../entities/roadmap-item.entity';
import { RoadmapTaskPrompt } from '../../entities/roadmap-task-prompt.entity';
import { LlmModule } from '../llm/llm.module';
import { RoadmapController } from './roadmap.controller';
import { RoadmapService } from './roadmap.service';
import {
  ROADMAP_INTELLIGENCE_QUEUE,
  RoadmapProcessor,
} from './roadmap.processor';
import { PublicFeedbackThrottlerGuard } from './guards/public-feedback-throttler.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectMember,
      ProjectFeedback,
      RoadmapItem,
      RoadmapTaskPrompt,
    ]),
    BullModule.registerQueue({ name: ROADMAP_INTELLIGENCE_QUEUE }),
    LlmModule,
  ],
  controllers: [RoadmapController],
  providers: [RoadmapService, RoadmapProcessor, PublicFeedbackThrottlerGuard],
  exports: [RoadmapService],
})
export class RoadmapModule {}
