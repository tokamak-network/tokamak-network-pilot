import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IngestionService } from './ingestion.service';

export const INGESTION_QUEUE = 'ingestion';

export interface IngestionJobData {
  sourceId: string;
  action: 'ingest' | 'clear';
}

@Processor(INGESTION_QUEUE)
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(private readonly ingestionService: IngestionService) {
    super();
  }

  async process(job: Job<IngestionJobData>): Promise<void> {
    const { sourceId, action } = job.data;
    this.logger.log(
      `Processing job ${job.id} — action="${action}" sourceId="${sourceId}"`,
    );

    switch (action) {
      case 'ingest':
        await this.ingestionService.ingestSource(sourceId);
        break;

      case 'clear':
        await this.ingestionService.clearSourceData(sourceId);
        break;

      default:
        this.logger.warn(`Unknown action: ${action}`);
    }

    this.logger.log(`Job ${job.id} completed`);
  }
}
