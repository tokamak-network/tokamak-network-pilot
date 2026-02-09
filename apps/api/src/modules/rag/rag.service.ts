import { Injectable, Logger } from '@nestjs/common';
import { AskQuestionDto } from './dto/ask-question.dto';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import type { VectorSearchResult } from '@tokamak-pilot/shared';

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  /**
   * Process a question through the RAG pipeline:
   *  1. Embed the question
   *  2. Retrieve relevant chunks from vector DB
   *  3. Build prompt with context
   *  4. Generate answer via LLM (TODO — placeholder for now)
   *  5. Return answer with citations
   */
  async ask(dto: AskQuestionDto) {
    this.logger.log(`Question received: ${dto.question}`);

    // Step 1: Embed the question
    let queryEmbedding: number[];
    try {
      queryEmbedding = await this.embeddingService.embedText(dto.question);
    } catch (error) {
      this.logger.warn(
        `Embedding failed: ${(error as Error).message}`,
      );
      return {
        answer:
          'Embedding service is not available. Please configure OPENAI_API_KEY.',
        question: dto.question,
        sources: [],
        confidence: 0,
      };
    }

    // Step 2: Retrieve relevant chunks
    const searchResults = await this.vectorStoreService.search(
      queryEmbedding,
      10,
    );

    if (searchResults.length === 0) {
      return {
        answer:
          'No relevant knowledge found in the indexed sources. Try ingesting some GitHub repos first.',
        question: dto.question,
        sources: [],
        confidence: 0,
      };
    }

    // Step 3: Build context from search results
    const context = searchResults
      .map(
        (r, i) =>
          `[Source ${i + 1}] (score: ${r.score.toFixed(3)})\n${r.content}`,
      )
      .join('\n\n---\n\n');

    // Step 4: Generate answer via LLM
    // TODO: Integrate OpenAI/Anthropic chat completion.
    // For now, return the context directly as a "best-effort" answer.
    const answer = this.buildPlaceholderAnswer(dto.question, searchResults);

    // Step 5: Build source citations
    const sources = searchResults
      .filter((r) => r.score >= 0.6)
      .map((r) => ({
        title:
          (r.metadata.title as string) ??
          (r.metadata.filePath as string) ??
          'Unknown',
        url: (r.metadata.url as string) ?? '',
        score: r.score,
        snippet: r.content.slice(0, 200),
      }));

    return {
      answer,
      question: dto.question,
      sources,
      confidence: searchResults.length > 0 ? searchResults[0].score : 0,
      _debug: {
        retrievedChunks: searchResults.length,
        context: context.slice(0, 2000),
      },
    };
  }

  /**
   * Semantic search — return relevant chunks without LLM generation.
   */
  async search(query: string, limit = 10) {
    this.logger.log(`Search query: ${query} (limit: ${limit})`);

    let queryEmbedding: number[];
    try {
      queryEmbedding = await this.embeddingService.embedText(query);
    } catch (error) {
      this.logger.warn(`Embedding failed: ${(error as Error).message}`);
      return {
        query,
        results: [],
        total: 0,
        error: 'Embedding service not available',
      };
    }

    const results = await this.vectorStoreService.search(
      queryEmbedding,
      limit,
    );

    return {
      query,
      results: results.map((r) => ({
        content: r.content,
        source: (r.metadata.url as string) ?? (r.metadata.filePath as string) ?? 'unknown',
        score: r.score,
        metadata: r.metadata,
      })),
      total: results.length,
    };
  }

  /**
   * Placeholder answer builder until LLM integration is added.
   * Summarizes the top search results into a readable response.
   */
  private buildPlaceholderAnswer(
    question: string,
    results: VectorSearchResult[],
  ): string {
    const topResults = results.slice(0, 3);
    let answer = `Based on ${results.length} relevant knowledge chunks found for your question:\n\n`;
    answer += `**"${question}"**\n\n`;
    answer += `Here are the most relevant excerpts:\n\n`;

    for (const [i, result] of topResults.entries()) {
      const title =
        (result.metadata.title as string) ??
        (result.metadata.filePath as string) ??
        'Source';
      const snippet = result.content.slice(0, 500);
      answer += `### ${i + 1}. ${title} (relevance: ${(result.score * 100).toFixed(0)}%)\n`;
      answer += `${snippet}...\n\n`;
    }

    answer +=
      '\n> **Note:** Full LLM-powered answers will be available once OpenAI/Anthropic chat integration is implemented. For now, these are the raw retrieved chunks.';

    return answer;
  }
}
