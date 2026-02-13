import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Source } from '../../entities/source.entity';
import { Document, ContentType } from '../../entities/document.entity';
import { GitHubService, RawDocument } from '../github/github.service';
import { ChunkerService } from './chunker.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorService } from '../vector/vector.service';

const EMBED_BATCH_SIZE = 50;

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @InjectRepository(Source)
    private readonly sourceRepo: Repository<Source>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly github: GitHubService,
    private readonly chunker: ChunkerService,
    private readonly embedding: EmbeddingService,
    private readonly vector: VectorService,
  ) {}

  /**
   * Run the ingestion pipeline for a source.
   * @param modeOverride — 'light' (markdown only) or 'full' (everything).
   *   If not provided, reads from source.config.fetchMode (default: 'light').
   */
  async ingestSource(sourceId: string, modeOverride?: 'light' | 'full'): Promise<void> {
    const source = await this.sourceRepo.findOneBy({ id: sourceId });
    if (!source) {
      this.logger.error(`Source ${sourceId} not found`);
      return;
    }

    const fetchMode = modeOverride || (source.config as any)?.fetchMode || 'light';
    this.logger.log(`Starting ${fetchMode} ingestion for source "${source.name}" (${source.type})`);

    // Mark as syncing
    await this.sourceRepo.update(sourceId, {
      status: 'syncing',
      errorMessage: undefined,
    });

    try {
      // 1. Fetch raw documents from GitHub
      const { rawDocs, breakdown, repoMeta } = await this.fetchDocuments(source, fetchMode);
      this.logger.log(`Fetched ${rawDocs.length} raw documents`);

      // Store the fetch breakdown + GitHub metadata in source config for monitoring/sorting
      const updatedConfig: Record<string, unknown> = {
        ...source.config,
        fetchMode,
        fetchBreakdown: breakdown,
        fetchedAt: new Date().toISOString(),
        rawDocumentCount: rawDocs.length,
        // Store GitHub activity data for sorting
        ...(repoMeta && {
          pushedAt: repoMeta.pushedAt ?? undefined,
          stars: repoMeta.stars,
          forks: repoMeta.forks,
          language: repoMeta.language ?? undefined,
          description: repoMeta.description ?? undefined,
          isArchived: repoMeta.isArchived,
        }),
      };

      if (rawDocs.length === 0) {
        await this.sourceRepo.update(sourceId, {
          status: 'active',
          lastSyncedAt: new Date(),
          documentCount: 0,
          config: updatedConfig as any,
        });
        return;
      }

      // 2. Remove old documents & vectors for this source
      await this.clearSourceData(sourceId);

      // 3. Chunk all documents
      const chunks = await this.chunker.chunkDocuments(
        rawDocs.map((d) => ({
          content: d.content,
          metadata: {
            sourceId,
            title: d.title,
            contentType: d.contentType,
            url: d.url,
            ...d.metadata,
          },
        })),
      );
      this.logger.log(`Created ${chunks.length} chunks from ${rawDocs.length} documents`);

      // 4. Embed & store in batches
      let storedCount = 0;
      for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
        const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
        const texts = batch.map((c) => c.content);

        // Generate embeddings
        const embeddings = await this.embedding.embedBatch(texts);

        // Upsert to Qdrant
        const pointIds = await this.vector.upsert(
          batch.map((chunk, j) => ({
            vector: embeddings[j],
            payload: {
              sourceId,
              title: chunk.metadata['title'] as string,
              content: chunk.content,
              contentType: chunk.metadata['contentType'] as string,
              url: chunk.metadata['url'] as string,
              chunkIndex: chunk.chunkIndex,
            },
          })),
        );

        // Save document records to PostgreSQL
        const docs = batch.map((chunk, j) => {
          const doc = new Document();
          doc.sourceId = sourceId;
          doc.title = (chunk.metadata['title'] as string) || 'Untitled';
          doc.content = chunk.content;
          doc.contentType = (chunk.metadata['contentType'] as ContentType) || 'other';
          doc.url = chunk.metadata['url'] as string;
          doc.metadata = chunk.metadata;
          doc.qdrantPointId = pointIds[j];
          doc.chunkIndex = chunk.chunkIndex;
          return doc;
        });

        await this.documentRepo.save(docs);
        storedCount += batch.length;

        this.logger.log(
          `Progress: ${storedCount}/${chunks.length} chunks embedded & stored`,
        );
      }

      // 5. Update source status with full stats
      await this.sourceRepo.update(sourceId, {
        status: 'active',
        lastSyncedAt: new Date(),
        documentCount: storedCount,
        config: { ...updatedConfig, chunkCount: storedCount } as any,
      });

      this.logger.log(
        `Ingestion complete for "${source.name}": ${storedCount} chunks indexed`,
      );
    } catch (error: any) {
      this.logger.error(
        `Ingestion failed for source ${sourceId}: ${error.message}`,
        error.stack,
      );
      await this.sourceRepo.update(sourceId, {
        status: 'error',
        errorMessage: error.message,
      });
    }
  }

  /**
   * Clear all documents and vectors for a source.
   */
  async clearSourceData(sourceId: string): Promise<void> {
    await this.vector.deleteByFilter({
      must: [{ key: 'sourceId', match: { value: sourceId } }],
    });
    await this.documentRepo.delete({ sourceId });
    this.logger.log(`Cleared all data for source ${sourceId}`);
  }

  // ───────────────────── Private helpers ─────────────────────

  private async fetchDocuments(
    source: Source,
    mode: 'light' | 'full' = 'light',
  ): Promise<{
    rawDocs: RawDocument[];
    breakdown: Record<string, number>;
    repoMeta: import('../github/github.service').RepoMeta | null;
  }> {
    switch (source.type) {
      case 'github_repo': {
        const { owner, repo } = source.config as { owner: string; repo: string };
        const result = await this.github.fetchAllRepoContent(owner, repo, mode);
        return { rawDocs: result.documents, breakdown: result.breakdown, repoMeta: result.meta };
      }

      case 'github_org': {
        const { org } = source.config as { org: string };
        const repos = await this.github.listOrgRepos(org);
        const allDocs: RawDocument[] = [];
        const breakdown: Record<string, number> = {};

        for (const r of repos) {
          try {
            const result = await this.github.fetchAllRepoContent(r.owner, r.repo, mode);
            allDocs.push(...result.documents);
            for (const [key, count] of Object.entries(result.breakdown)) {
              breakdown[key] = (breakdown[key] || 0) + count;
            }
          } catch (error) {
            this.logger.warn(`Failed to fetch ${r.owner}/${r.repo}: ${error}`);
          }
        }
        return { rawDocs: allDocs, breakdown, repoMeta: null };
      }

      default:
        this.logger.warn(`Source type "${source.type}" ingestion not yet implemented`);
        return { rawDocs: [], breakdown: {}, repoMeta: null };
    }
  }

  /**
   * Ingest pre-parsed raw documents for a source (e.g. from file uploads).
   * Skips the fetch step and goes straight to chunk → embed → store.
   */
  async ingestRawDocuments(
    sourceId: string,
    rawDocs: RawDocument[],
  ): Promise<void> {
    const source = await this.sourceRepo.findOneBy({ id: sourceId });
    if (!source) {
      this.logger.error(`Source ${sourceId} not found`);
      return;
    }

    this.logger.log(
      `Starting raw document ingestion for source "${source.name}" — ${rawDocs.length} documents`,
    );

    await this.sourceRepo.update(sourceId, {
      status: 'syncing',
      errorMessage: undefined,
    });

    try {
      if (rawDocs.length === 0) {
        await this.sourceRepo.update(sourceId, {
          status: 'active',
          lastSyncedAt: new Date(),
          documentCount: 0,
        });
        return;
      }

      // Clear any existing data (in case of re-upload)
      await this.clearSourceData(sourceId);

      // Build breakdown from the raw docs
      const breakdown: Record<string, number> = {};
      for (const doc of rawDocs) {
        breakdown[doc.contentType] = (breakdown[doc.contentType] || 0) + 1;
      }

      // Chunk all documents
      const chunks = await this.chunker.chunkDocuments(
        rawDocs.map((d) => ({
          content: d.content,
          metadata: {
            sourceId,
            title: d.title,
            contentType: d.contentType,
            url: d.url,
            ...d.metadata,
          },
        })),
      );
      this.logger.log(`Created ${chunks.length} chunks from ${rawDocs.length} documents`);

      // Embed & store in batches
      let storedCount = 0;
      for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
        const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
        const texts = batch.map((c) => c.content);

        const embeddings = await this.embedding.embedBatch(texts);

        const pointIds = await this.vector.upsert(
          batch.map((chunk, j) => ({
            vector: embeddings[j],
            payload: {
              sourceId,
              title: chunk.metadata['title'] as string,
              content: chunk.content,
              contentType: chunk.metadata['contentType'] as string,
              url: chunk.metadata['url'] as string,
              chunkIndex: chunk.chunkIndex,
            },
          })),
        );

        const docs = batch.map((chunk, j) => {
          const doc = new Document();
          doc.sourceId = sourceId;
          doc.title = (chunk.metadata['title'] as string) || 'Untitled';
          doc.content = chunk.content;
          doc.contentType = (chunk.metadata['contentType'] as ContentType) || 'other';
          doc.url = chunk.metadata['url'] as string;
          doc.metadata = chunk.metadata;
          doc.qdrantPointId = pointIds[j];
          doc.chunkIndex = chunk.chunkIndex;
          return doc;
        });

        await this.documentRepo.save(docs);
        storedCount += batch.length;

        this.logger.log(
          `Progress: ${storedCount}/${chunks.length} chunks embedded & stored`,
        );
      }

      // Update source status
      await this.sourceRepo.update(sourceId, {
        status: 'active',
        lastSyncedAt: new Date(),
        documentCount: storedCount,
        config: {
          ...source.config,
          fetchBreakdown: breakdown,
          rawDocumentCount: rawDocs.length,
          chunkCount: storedCount,
          fetchedAt: new Date().toISOString(),
        } as any,
      });

      this.logger.log(
        `File ingestion complete for "${source.name}": ${storedCount} chunks indexed`,
      );
    } catch (error: any) {
      this.logger.error(
        `File ingestion failed for source ${sourceId}: ${error.message}`,
        error.stack,
      );
      await this.sourceRepo.update(sourceId, {
        status: 'error',
        errorMessage: error.message,
      });
    }
  }
}
