import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';

export const COLLECTION_NAME = 'tokamak_knowledge';
const VECTOR_SIZE = 1536; // OpenAI text-embedding-3-small dimension

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

@Injectable()
export class VectorService implements OnModuleInit {
  private readonly logger = new Logger(VectorService.name);
  private client!: QdrantClient;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('QDRANT_URL', 'http://localhost:6333');
    const apiKey = this.config.get<string>('QDRANT_API_KEY');

    this.client = new QdrantClient({
      url,
      ...(apiKey ? { apiKey } : {}),
    });

    this.logger.log(`Qdrant client initialized — ${url}`);
    await this.ensureCollection();
  }

  /**
   * Create the collection if it doesn't already exist.
   */
  async ensureCollection(): Promise<void> {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === COLLECTION_NAME,
      );

      if (!exists) {
        await this.client.createCollection(COLLECTION_NAME, {
          vectors: {
            size: VECTOR_SIZE,
            distance: 'Cosine',
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        });
        this.logger.log(
          `Created Qdrant collection "${COLLECTION_NAME}" (dim=${VECTOR_SIZE})`,
        );
      } else {
        this.logger.log(
          `Qdrant collection "${COLLECTION_NAME}" already exists`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Could not ensure Qdrant collection — is Qdrant running? Error: ${error}`,
      );
    }
  }

  /**
   * Upsert vectors into Qdrant. Returns the generated point IDs.
   */
  async upsert(
    points: Array<{ vector: number[]; payload: Record<string, unknown> }>,
  ): Promise<string[]> {
    const ids = points.map(() => uuidv4());

    const qdrantPoints = points.map((p, i) => ({
      id: ids[i],
      vector: p.vector,
      payload: p.payload,
    }));

    await this.client.upsert(COLLECTION_NAME, {
      wait: true,
      points: qdrantPoints,
    });

    this.logger.log(`Upserted ${points.length} vectors into Qdrant`);
    return ids;
  }

  /**
   * Search for similar vectors. Returns top-k results.
   */
  async search(
    vector: number[],
    limit = 10,
    filter?: Record<string, unknown>,
  ): Promise<VectorSearchResult[]> {
    const results = await this.client.search(COLLECTION_NAME, {
      vector,
      limit,
      with_payload: true,
      ...(filter ? { filter } : {}),
    });

    return results.map((r) => ({
      id: typeof r.id === 'string' ? r.id : String(r.id),
      score: r.score,
      payload: (r.payload as Record<string, unknown>) ?? {},
    }));
  }

  /**
   * Delete vectors by their point IDs.
   */
  async delete(pointIds: string[]): Promise<void> {
    if (pointIds.length === 0) return;

    await this.client.delete(COLLECTION_NAME, {
      wait: true,
      points: pointIds,
    });

    this.logger.log(`Deleted ${pointIds.length} vectors from Qdrant`);
  }

  /**
   * Delete all vectors matching a filter (e.g., by sourceId).
   */
  async deleteByFilter(filter: Record<string, unknown>): Promise<void> {
    await this.client.delete(COLLECTION_NAME, {
      wait: true,
      filter: filter as any,
    });
    this.logger.log('Deleted vectors by filter from Qdrant');
  }

  /**
   * Get collection info (useful for health checks).
   */
  async getCollectionInfo() {
    try {
      return await this.client.getCollection(COLLECTION_NAME);
    } catch {
      return null;
    }
  }
}
