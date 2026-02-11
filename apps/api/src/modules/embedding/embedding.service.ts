import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * OpenAI embedding models (as of Feb 2026):
 * - text-embedding-3-small: 1536 dims, best cost/quality ratio (default)
 * - text-embedding-3-large: 3072 dims, highest quality
 *
 * Note: Embeddings are always via OpenAI regardless of LLM_PROVIDER,
 * since Anthropic does not offer an embeddings API.
 */
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_BATCH_SIZE = 100; // OpenAI batch limit

/** Dimension map for known models */
const MODEL_DIMENSIONS: Record<string, number> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
};

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly openai: OpenAI;
  private model!: string;
  private dimensions!: number;

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  onModuleInit() {
    this.model = this.config.get<string>(
      'EMBEDDING_MODEL',
      DEFAULT_EMBEDDING_MODEL,
    );
    this.dimensions = MODEL_DIMENSIONS[this.model] ?? 1536;

    this.logger.log(
      `Embedding service initialized — model=${this.model}, dimensions=${this.dimensions}`,
    );
  }

  /** Get the vector dimension for the current model */
  getDimensions(): number {
    return this.dimensions;
  }

  /** Get the current model name */
  getModel(): string {
    return this.model;
  }

  /**
   * Embed a single text string. Returns a vector.
   */
  async embedText(text: string): Promise<number[]> {
    const cleaned = text.replace(/\n+/g, ' ').trim();
    if (!cleaned) {
      throw new Error('Cannot embed empty text');
    }

    const response = await this.openai.embeddings.create({
      model: this.model,
      input: cleaned,
    });

    return response.data[0].embedding;
  }

  /**
   * Embed multiple texts in batches. Returns an array of vectors
   * in the same order as the input texts.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const cleaned = texts.map((t) => t.replace(/\n+/g, ' ').trim());
    const results: number[][] = new Array(texts.length);

    for (let i = 0; i < cleaned.length; i += MAX_BATCH_SIZE) {
      const batch = cleaned.slice(i, i + MAX_BATCH_SIZE);
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: batch,
      });

      for (let j = 0; j < response.data.length; j++) {
        results[i + j] = response.data[j].embedding;
      }

      this.logger.debug(
        `Embedded batch ${Math.floor(i / MAX_BATCH_SIZE) + 1}/${Math.ceil(cleaned.length / MAX_BATCH_SIZE)}`,
      );
    }

    return results;
  }
}
