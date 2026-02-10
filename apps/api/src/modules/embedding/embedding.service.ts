import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions
const MAX_BATCH_SIZE = 100; // OpenAI batch limit

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly openai: OpenAI;

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Embed a single text string. Returns a 1536-dimensional vector.
   */
  async embedText(text: string): Promise<number[]> {
    const cleaned = text.replace(/\n+/g, ' ').trim();
    if (!cleaned) {
      throw new Error('Cannot embed empty text');
    }

    const response = await this.openai.embeddings.create({
      model: EMBEDDING_MODEL,
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
        model: EMBEDDING_MODEL,
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
