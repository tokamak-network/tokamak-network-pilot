import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Source, SourceType } from '../../entities/source.entity';
import { Document } from '../../entities/document.entity';
import { VectorService } from '../vector/vector.service';
import { INGESTION_QUEUE } from '../ingestion/ingestion.processor';
import type { IngestionJobData } from '../ingestion/ingestion.processor';
import { CreateSourceDto, UpdateSourceDto } from './dto/create-source.dto';

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);

  constructor(
    @InjectRepository(Source)
    private readonly sourceRepo: Repository<Source>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectQueue(INGESTION_QUEUE)
    private readonly ingestionQueue: Queue<IngestionJobData>,
    private readonly vector: VectorService,
  ) {}

  async findAll() {
    const [sources, total] = await this.sourceRepo.findAndCount({
      order: { createdAt: 'DESC' },
    });
    return { sources, total };
  }

  async findOne(id: string) {
    const source = await this.sourceRepo.findOne({
      where: { id },
      relations: ['documents'],
    });
    if (!source) {
      throw new NotFoundException(`Source ${id} not found`);
    }
    return source;
  }

  async create(dto: CreateSourceDto) {
    this.logger.log(`Creating new source: ${dto.name} (${dto.type})`);

    const source = this.sourceRepo.create({
      name: dto.name,
      type: dto.type as SourceType,
      config: dto.config,
      status: 'active',
    });

    const saved = await this.sourceRepo.save(source);

    // Enqueue initial ingestion job
    await this.ingestionQueue.add('ingest', {
      sourceId: saved.id,
      action: 'ingest',
    });

    this.logger.log(`Source "${saved.name}" created (id=${saved.id}), ingestion job enqueued`);
    return saved;
  }

  async update(id: string, dto: UpdateSourceDto) {
    const source = await this.sourceRepo.findOneBy({ id });
    if (!source) {
      throw new NotFoundException(`Source ${id} not found`);
    }

    if (dto.name !== undefined) source.name = dto.name;
    if (dto.config !== undefined) source.config = dto.config;

    const updated = await this.sourceRepo.save(source);
    this.logger.log(`Source ${id} updated`);
    return updated;
  }

  async remove(id: string) {
    const source = await this.sourceRepo.findOneBy({ id });
    if (!source) {
      throw new NotFoundException(`Source ${id} not found`);
    }

    // Remove all vectors from Qdrant for this source
    await this.vector.deleteByFilter({
      must: [{ key: 'sourceId', match: { value: id } }],
    });

    // Remove all documents from PostgreSQL (cascade will handle this too)
    await this.documentRepo.delete({ sourceId: id });

    // Remove the source itself
    await this.sourceRepo.remove(source);

    this.logger.log(`Source ${id} and all its data removed`);
    return { message: `Source "${source.name}" removed successfully` };
  }

  async sync(id: string) {
    const source = await this.sourceRepo.findOneBy({ id });
    if (!source) {
      throw new NotFoundException(`Source ${id} not found`);
    }

    // Enqueue a re-indexing job
    await this.ingestionQueue.add('ingest', {
      sourceId: id,
      action: 'ingest',
    });

    this.logger.log(`Re-indexing job enqueued for source ${id}`);
    return { message: `Sync triggered for "${source.name}"`, sourceId: id };
  }
}
