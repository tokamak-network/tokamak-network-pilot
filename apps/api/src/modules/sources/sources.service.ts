import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Source, SourceType } from '../../entities/source.entity';
import { Document } from '../../entities/document.entity';
import { VectorService } from '../vector/vector.service';
import { LlmService } from '../llm/llm.service';
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
    private readonly llm: LlmService,
  ) {}

  async findAll() {
    const [sources, total] = await this.sourceRepo.findAndCount();

    // Sort by latest GitHub commit (pushedAt) first, then by document count
    const sorted = sources.sort((a, b) => {
      const aPushed = (a.config as any)?.pushedAt;
      const bPushed = (b.config as any)?.pushedAt;

      // Primary: latest GitHub commit first
      if (aPushed && bPushed) {
        const diff = new Date(bPushed).getTime() - new Date(aPushed).getTime();
        if (diff !== 0) return diff;
      }
      // Repos with pushedAt come before those without
      if (aPushed && !bPushed) return -1;
      if (!aPushed && bPushed) return 1;

      // Secondary: most documents first
      if (b.documentCount !== a.documentCount) {
        return b.documentCount - a.documentCount;
      }

      // Tertiary: last synced
      const aSync = a.lastSyncedAt ? new Date(a.lastSyncedAt).getTime() : 0;
      const bSync = b.lastSyncedAt ? new Date(b.lastSyncedAt).getTime() : 0;
      return bSync - aSync;
    });

    // Enrich each source with pushedAt at top level for the frontend
    const enriched = sorted.map((s) => ({
      ...s,
      pushedAt: (s.config as any)?.pushedAt || null,
      stars: (s.config as any)?.stars ?? 0,
      language: (s.config as any)?.language || null,
      description: (s.config as any)?.description || null,
    }));

    return { sources: enriched, total };
  }

  /**
   * Ingestion status dashboard — per-repo breakdown + overall summary.
   */
  async getIngestionStatus() {
    const sources = await this.sourceRepo.find({
      order: { name: 'ASC' },
    });

    // Get document counts per source in one query
    const docCounts = await this.documentRepo
      .createQueryBuilder('doc')
      .select('doc.sourceId', 'sourceId')
      .addSelect('doc.contentType', 'contentType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('doc.sourceId')
      .addGroupBy('doc.contentType')
      .getRawMany<{ sourceId: string; contentType: string; count: string }>();

    // Build per-source map
    const sourceDocMap: Record<string, Record<string, number>> = {};
    for (const row of docCounts) {
      if (!sourceDocMap[row.sourceId]) sourceDocMap[row.sourceId] = {};
      sourceDocMap[row.sourceId][row.contentType] = parseInt(row.count, 10);
    }

    const repos = sources.map((s) => {
      const stats = sourceDocMap[s.id] || {};
      const totalDocs = Object.values(stats).reduce((a, b) => a + b, 0);
      const cfg = s.config as any;
      const fetchBreakdown = cfg?.fetchBreakdown || {};
      const rawDocumentCount = cfg?.rawDocumentCount || 0;

      return {
        id: s.id,
        name: s.name,
        type: s.type,
        status: s.status,
        lastSyncedAt: s.lastSyncedAt,
        errorMessage: s.errorMessage,
        documentCount: s.documentCount,
        totalChunks: totalDocs,
        rawDocumentCount,
        fetchBreakdown,
        chunkBreakdown: stats,
        createdAt: s.createdAt,
        // GitHub metadata for sorting & display
        pushedAt: cfg?.pushedAt || null,
        stars: cfg?.stars ?? 0,
        language: cfg?.language || null,
        description: cfg?.description || null,
      };
    });

    // Sort: latest GitHub commit first, then most documents
    repos.sort((a, b) => {
      if (a.pushedAt && b.pushedAt) {
        const diff = new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime();
        if (diff !== 0) return diff;
      }
      if (a.pushedAt && !b.pushedAt) return -1;
      if (!a.pushedAt && b.pushedAt) return 1;
      return b.totalChunks - a.totalChunks;
    });

    // Overall summary
    const summary = {
      totalRepos: repos.length,
      fetched: repos.filter((r) => r.status === 'active' && r.totalChunks > 0).length,
      syncing: repos.filter((r) => r.status === 'syncing').length,
      failed: repos.filter((r) => r.status === 'error').length,
      empty: repos.filter((r) => r.status === 'active' && r.totalChunks === 0).length,
      pending: repos.filter((r) => r.status === 'active' && !r.lastSyncedAt).length,
      totalDocuments: repos.reduce((sum, r) => sum + r.rawDocumentCount, 0),
      totalChunks: repos.reduce((sum, r) => sum + r.totalChunks, 0),
    };

    return { summary, repos };
  }

  async findOne(id: string) {
    const source = await this.sourceRepo.findOne({
      where: { id },
    });
    if (!source) {
      throw new NotFoundException(`Source ${id} not found`);
    }

    // Get document count breakdown by content type
    const stats = await this.getDocumentStats(id);
    return { ...source, stats };
  }

  /**
   * Get documents for a source, optionally filtered by content type.
   */
  async findDocuments(
    sourceId: string,
    contentType?: string,
    page = 1,
    limit = 50,
  ) {
    const source = await this.sourceRepo.findOneBy({ id: sourceId });
    if (!source) {
      throw new NotFoundException(`Source ${sourceId} not found`);
    }

    const query = this.documentRepo
      .createQueryBuilder('doc')
      .where('doc.sourceId = :sourceId', { sourceId })
      .orderBy('doc.contentType', 'ASC')
      .addOrderBy('doc.title', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (contentType) {
      query.andWhere('doc.contentType = :contentType', { contentType });
    }

    const [documents, total] = await query.getManyAndCount();

    return {
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        contentType: d.contentType,
        url: d.url,
        chunkIndex: d.chunkIndex,
        createdAt: d.createdAt,
        contentPreview: d.content.slice(0, 300),
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Generate an AI summary of what was ingested for a source.
   */
  async generateSummary(sourceId: string) {
    const source = await this.sourceRepo.findOneBy({ id: sourceId });
    if (!source) {
      throw new NotFoundException(`Source ${sourceId} not found`);
    }

    const stats = await this.getDocumentStats(sourceId);

    // Grab a sample of documents to feed the LLM
    const sampleDocs = await this.documentRepo
      .createQueryBuilder('doc')
      .where('doc.sourceId = :sourceId', { sourceId })
      .andWhere('doc.chunkIndex = 0') // first chunk of each document
      .orderBy('doc.contentType', 'ASC')
      .take(20)
      .getMany();

    const sampleContent = sampleDocs
      .map(
        (d) =>
          `[${d.contentType}] ${d.title}\n${d.content.slice(0, 500)}`,
      )
      .join('\n\n---\n\n');

    const completion = await this.llm.chatCompletion({
      messages: [
        {
          role: 'system',
          content: `You are analyzing a knowledge source that has been ingested into the Tokamak Network knowledge hub. Based on the document samples provided, generate a comprehensive summary that covers:

1. **Overview**: What this source/repository is about
2. **Key Topics**: The main topics, features, or components covered
3. **Technology Stack**: Languages, frameworks, tools mentioned
4. **Notable Findings**: Important patterns, issues, or architectural decisions
5. **Content Quality**: How comprehensive the ingested content is

Be specific and factual. Use Markdown formatting.`,
        },
        {
          role: 'user',
          content: `Source: "${source.name}" (${source.type})
Config: ${JSON.stringify(source.config)}

Document stats:
${Object.entries(stats)
  .map(([type, count]) => `- ${type}: ${count} chunks`)
  .join('\n')}

Sample documents:

${sampleContent}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 2000,
    });

    return {
      sourceId,
      sourceName: source.name,
      sourceType: source.type,
      stats,
      summary: completion.content,
      provider: completion.provider,
      model: completion.model,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get document count breakdown by content type for a source.
   */
  private async getDocumentStats(
    sourceId: string,
  ): Promise<Record<string, number>> {
    const rows = await this.documentRepo
      .createQueryBuilder('doc')
      .select('doc.contentType', 'contentType')
      .addSelect('COUNT(*)', 'count')
      .where('doc.sourceId = :sourceId', { sourceId })
      .groupBy('doc.contentType')
      .getRawMany<{ contentType: string; count: string }>();

    const stats: Record<string, number> = {};
    for (const row of rows) {
      stats[row.contentType] = parseInt(row.count, 10);
    }
    return stats;
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

  async sync(id: string, fetchMode: 'light' | 'full' = 'light') {
    const source = await this.sourceRepo.findOneBy({ id });
    if (!source) {
      throw new NotFoundException(`Source ${id} not found`);
    }

    await this.ingestionQueue.add('ingest', {
      sourceId: id,
      action: 'ingest',
      fetchMode,
    });

    const label = fetchMode === 'full' ? 'Deep sync' : 'Sync';
    this.logger.log(`${label} job enqueued for source ${id} (mode=${fetchMode})`);
    return {
      message: `${label} triggered for "${source.name}"`,
      sourceId: id,
      fetchMode,
    };
  }
}
