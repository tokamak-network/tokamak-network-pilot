import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';
import {
  QDRANT_COLLECTION_NAME,
  EMBEDDING_DIMENSIONS,
} from '@tokamak-pilot/shared';
import type { DocumentChunk, VectorSearchResult } from '@tokamak-pilot/shared';

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(VectorStoreService.name);
  private client!: QdrantClient;
  private readonly collectionName: string;

  constructor(private readonly configService: ConfigService) {
    this.collectionName =
      this.configService.get<string>('QDRANT_COLLECTION') ??
      QDRANT_COLLECTION_NAME;
  }

  async onModuleInit() {
    const url =
      this.configService.get<string>('QDRANT_URL') ?? 'http://localhost:6333';
    const apiKey = this.configService.get<string>('QDRANT_API_KEY');

    this.client = new QdrantClient({
      url,
      ...(apiKey ? { apiKey } : {}),
    });

    this.logger.log(`Connecting to Qdrant at ${url}`);
    await this.ensureCollection();
  }

  /** Create the collection if it doesn't exist yet. */
  private async ensureCollection(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.collectionName,
      );

      if (!exists) {
        this.logger.log(
          `Creating Qdrant collection "${this.collectionName}" (dim=${EMBEDDING_DIMENSIONS})`,
        );
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: EMBEDDING_DIMENSIONS,
            distance: 'Cosine',
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        });

        // Create payload index on sourceId for efficient filtering
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: 'sourceId',
          field_schema: 'keyword',
        });

        this.logger.log(`Collection "${this.collectionName}" created`);
      } else {
        this.logger.log(
          `Collection "${this.collectionName}" already exists`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Could not connect to Qdrant (is it running?): ${(error as Error).message}. Vector operations will fail until Qdrant is available.`,
      );
    }
  }

  /**
   * Upsert document chunks with their embeddings into the vector store.
   */
  async upsertChunks(chunks: DocumentChunk[]): Promise<number> {
    if (chunks.length === 0) return 0;

    const points = chunks.map((chunk) => ({
      id: chunk.id || uuidv4(),
      vector: chunk.embedding!,
      payload: {
        content: chunk.content,
        sourceId: chunk.sourceId,
        sourceType: chunk.sourceType,
        chunkType: chunk.chunkType,
        ...chunk.metadata,
      },
    }));

    // Upsert in batches of 100
    const batchSize = 100;
    let upserted = 0;

    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: batch,
      });
      upserted += batch.length;
      this.logger.debug(
        `Upserted batch ${Math.floor(i / batchSize) + 1} (${upserted}/${points.length})`,
      );
    }

    this.logger.log(
      `Upserted ${upserted} chunks into "${this.collectionName}"`,
    );
    return upserted;
  }

  /**
   * Perform a similarity search against the vector store.
   */
  async search(
    embedding: number[],
    limit = 10,
    filters?: { sourceId?: string; chunkType?: string },
  ): Promise<VectorSearchResult[]> {
    const must: Array<Record<string, unknown>> = [];

    if (filters?.sourceId) {
      must.push({
        key: 'sourceId',
        match: { value: filters.sourceId },
      });
    }

    if (filters?.chunkType) {
      must.push({
        key: 'chunkType',
        match: { value: filters.chunkType },
      });
    }

    const results = await this.client.search(this.collectionName, {
      vector: embedding,
      limit,
      with_payload: true,
      score_threshold: 0.5,
      ...(must.length > 0 ? { filter: { must } } : {}),
    });

    return results.map((result) => {
      const payload = result.payload as Record<string, unknown>;
      return {
        id: String(result.id),
        content: (payload.content as string) ?? '',
        score: result.score,
        chunkType: (payload.chunkType as string) ?? 'text',
        metadata: {
          title: payload.title as string | undefined,
          url: payload.url as string | undefined,
          filePath: payload.filePath as string | undefined,
          repo: payload.repo as string | undefined,
          owner: payload.owner as string | undefined,
          language: payload.language as string | undefined,
          lastUpdated: payload.lastUpdated as string | undefined,
          sourceId: payload.sourceId as string | undefined,
          sourceType: payload.sourceType as string | undefined,
        },
      } as VectorSearchResult;
    });
  }

  /**
   * Delete all vectors associated with a specific source.
   */
  async deleteBySource(sourceId: string): Promise<void> {
    await this.client.delete(this.collectionName, {
      wait: true,
      filter: {
        must: [
          {
            key: 'sourceId',
            match: { value: sourceId },
          },
        ],
      },
    });
    this.logger.log(
      `Deleted all vectors for source "${sourceId}" from "${this.collectionName}"`,
    );
  }

  /**
   * Get the total point count in the collection.
   */
  async getCollectionInfo(): Promise<{
    pointCount: number;
    status: string;
  }> {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return {
        pointCount: info.points_count ?? 0,
        status: info.status,
      };
    } catch {
      return { pointCount: 0, status: 'unavailable' };
    }
  }
}
