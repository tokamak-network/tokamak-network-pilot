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
   * Run the full ingestion pipeline for a source.
   */
  async ingestSource(sourceId: string): Promise<void> {
    const source = await this.sourceRepo.findOneBy({ id: sourceId });
    if (!source) {
      this.logger.error(`Source ${sourceId} not found`);
      return;
    }

    this.logger.log(`Starting ingestion for source "${source.name}" (${source.type})`);

    // Mark as syncing
    await this.sourceRepo.update(sourceId, {
      status: 'syncing',
      errorMessage: undefined,
    });

    try {
      // 1. Fetch raw documents from GitHub
      const rawDocs = await this.fetchDocuments(source);
      this.logger.log(`Fetched ${rawDocs.length} raw documents`);

      if (rawDocs.length === 0) {
        await this.sourceRepo.update(sourceId, {
          status: 'active',
          lastSyncedAt: new Date(),
          documentCount: 0,
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

      // 5. Update source status
      await this.sourceRepo.update(sourceId, {
        status: 'active',
        lastSyncedAt: new Date(),
        documentCount: storedCount,
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
    // Delete vectors from Qdrant by source filter
    await this.vector.deleteByFilter({
      must: [{ key: 'sourceId', match: { value: sourceId } }],
    });

    // Delete documents from PostgreSQL
    await this.documentRepo.delete({ sourceId });

    this.logger.log(`Cleared all data for source ${sourceId}`);
  }

  // ───────────────────── Private helpers ─────────────────────

  private async fetchDocuments(source: Source): Promise<RawDocument[]> {
    switch (source.type) {
      case 'github_repo': {
        const { owner, repo } = source.config as { owner: string; repo: string };
        return this.github.fetchAllRepoContent(owner, repo);
      }

      case 'github_org': {
        const { org } = source.config as { org: string };
        const repos = await this.github.listOrgRepos(org);
        const allDocs: RawDocument[] = [];

        for (const r of repos) {
          try {
            const docs = await this.github.fetchAllRepoContent(r.owner, r.repo);
            allDocs.push(...docs);
          } catch (error) {
            this.logger.warn(
              `Failed to fetch ${r.owner}/${r.repo}: ${error}`,
            );
          }
        }
        return allDocs;
      }

      default:
        this.logger.warn(
          `Source type "${source.type}" ingestion not yet implemented`,
        );
        return [];
    }
  }
}
