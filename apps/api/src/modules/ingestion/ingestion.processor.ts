import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IngestionService } from './ingestion.service';

export const INGESTION_QUEUE = 'ingestion';

export interface IngestionJobData {
  sourceId: string;
  action: 'ingest' | 'clear';
  /** 'light' = markdown only (default), 'full' = everything */
  fetchMode?: 'light' | 'full';
}

@Processor(INGESTION_QUEUE)
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(private readonly ingestionService: IngestionService) {
    super();
  }

  async process(job: Job<IngestionJobData>): Promise<void> {
    const { sourceId, action, fetchMode } = job.data;
    this.logger.log(
      `Processing job ${job.id} — action="${action}" sourceId="${sourceId}" mode="${fetchMode || 'light'}"`,
    );

    switch (action) {
      case 'ingest':
        await this.ingestionService.ingestSource(sourceId, fetchMode);
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
