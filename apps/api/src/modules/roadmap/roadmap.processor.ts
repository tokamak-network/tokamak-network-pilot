import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RoadmapService } from './roadmap.service';

export const ROADMAP_INTELLIGENCE_QUEUE = 'roadmap-intelligence';

export interface RoadmapDraftJobData {
  action: 'draft-roadmap';
  projectId: string;
  maxItems?: number;
  triggeredByUserId?: string;
}

@Processor(ROADMAP_INTELLIGENCE_QUEUE)
export class RoadmapProcessor extends WorkerHost {
  private readonly logger = new Logger(RoadmapProcessor.name);

  constructor(private readonly roadmapService: RoadmapService) {
    super();
  }

  async process(job: Job<RoadmapDraftJobData>): Promise<void> {
    this.logger.log(
      `Processing roadmap job ${job.id} — action="${job.data.action}" projectId="${job.data.projectId}"`,
    );

    if (job.data.action === 'draft-roadmap') {
      await this.roadmapService.processRoadmapDraftJob(job.data);
      return;
    }

    this.logger.warn(`Unknown roadmap job action: ${job.data.action as string}`);
  }
}
