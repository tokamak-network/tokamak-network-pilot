import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private client: OpenAI | null = null;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.model =
      this.configService.get<string>('EMBEDDING_MODEL') ??
      'text-embedding-3-small';

    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      this.logger.log(`Embedding service initialized (model: ${this.model})`);
    } else {
      this.logger.warn(
        'OPENAI_API_KEY not set — embedding service will not work until configured',
      );
    }
  }

  /**
   * Generate an embedding vector for a single text string.
   */
  async embedText(text: string): Promise<number[]> {
    if (!this.client) {
      throw new Error(
        'Embedding service not initialized — OPENAI_API_KEY is required',
      );
    }

    const cleaned = text.replace(/\n+/g, ' ').trim();
    if (!cleaned) {
      throw new Error('Cannot embed empty text');
    }

    const response = await this.client.embeddings.create({
      model: this.model,
      input: cleaned,
    });

    return response.data[0].embedding;
  }

  /**
   * Generate embeddings for multiple texts in a single batch.
   * OpenAI supports up to 2048 inputs per request.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.client) {
      throw new Error(
        'Embedding service not initialized — OPENAI_API_KEY is required',
      );
    }

    if (texts.length === 0) return [];

    const cleaned = texts.map((t) => t.replace(/\n+/g, ' ').trim());

    // Process in batches of 512 to stay within API limits
    const batchSize = 512;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < cleaned.length; i += batchSize) {
      const batch = cleaned.slice(i, i + batchSize);
      this.logger.debug(
        `Embedding batch ${Math.floor(i / batchSize) + 1} (${batch.length} texts)`,
      );

      const response = await this.client.embeddings.create({
        model: this.model,
        input: batch,
      });

      const embeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);

      allEmbeddings.push(...embeddings);
    }

    this.logger.log(`Generated ${allEmbeddings.length} embeddings`);
    return allEmbeddings;
  }
}
