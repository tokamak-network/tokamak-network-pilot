import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorService, VectorSearchResult } from '../vector/vector.service';
import { AskQuestionDto } from './dto/ask-question.dto';

const TOP_K = 8; // Number of chunks to retrieve

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly config: ConfigService,
    private readonly embedding: EmbeddingService,
    private readonly vector: VectorService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Process a question through the full RAG pipeline:
   *  1. Embed the question
   *  2. Retrieve relevant chunks from Qdrant
   *  3. Build prompt with context
   *  4. Generate answer via OpenAI
   *  5. Return answer with citations
   */
  async ask(dto: AskQuestionDto) {
    this.logger.log(`Question received: ${dto.question}`);

    // 1. Embed the question
    const questionVector = await this.embedding.embedText(dto.question);

    // 2. Search Qdrant for relevant chunks
    const searchResults = await this.vector.search(questionVector, TOP_K);

    if (searchResults.length === 0) {
      return {
        answer:
          'I don\'t have enough information to answer this question. No relevant documents were found in the knowledge base. Please try adding knowledge sources first.',
        question: dto.question,
        sources: [],
        confidence: 0,
      };
    }

    // 3. Build context from retrieved chunks
    const context = this.buildContext(searchResults);

    // 4. Generate answer via OpenAI
    const messages = this.buildMessages(dto, context);
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      max_tokens: 1500,
    });

    const answer = completion.choices[0]?.message?.content || 'Unable to generate an answer.';

    // 5. Extract source citations
    const sources = this.extractCitations(searchResults);

    // Estimate confidence from average similarity score
    const avgScore =
      searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length;

    return {
      answer,
      question: dto.question,
      sources,
      confidence: Math.round(avgScore * 100) / 100,
    };
  }

  /**
   * Semantic search — return relevant chunks without LLM generation.
   */
  async search(query: string, limit = 10) {
    this.logger.log(`Search query: ${query} (limit: ${limit})`);

    // Embed the query
    const queryVector = await this.embedding.embedText(query);

    // Search Qdrant
    const results = await this.vector.search(queryVector, limit);

    return {
      query,
      results: results.map((r) => ({
        content: r.payload['content'] as string,
        source: r.payload['title'] as string,
        url: r.payload['url'] as string,
        score: Math.round(r.score * 1000) / 1000,
        contentType: r.payload['contentType'] as string,
        metadata: r.payload,
      })),
      total: results.length,
    };
  }

  // ───────────────────── Private helpers ─────────────────────

  private buildContext(results: VectorSearchResult[]): string {
    return results
      .map((r, i) => {
        const title = r.payload['title'] || 'Unknown';
        const content = r.payload['content'] || '';
        const url = r.payload['url'] || '';
        return `[Source ${i + 1}] ${title}\nURL: ${url}\n${content}`;
      })
      .join('\n\n---\n\n');
  }

  private buildMessages(
    dto: AskQuestionDto,
    context: string,
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const systemPrompt = `You are a knowledgeable assistant for the Tokamak Network ecosystem. Answer questions accurately based on the provided context documents. If the context doesn't contain enough information, say so honestly. Always cite your sources by referencing the [Source N] tags.

Rules:
- Only use information from the provided context to answer
- Cite sources using [Source N] notation
- If the answer requires information not in the context, explicitly say so
- Be concise but thorough
- Use Markdown formatting for better readability`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history if provided
    if (dto.conversationHistory && dto.conversationHistory.length > 0) {
      for (const msg of dto.conversationHistory) {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    // Add the current question with context
    messages.push({
      role: 'user',
      content: `Context documents:\n\n${context}\n\n---\n\nQuestion: ${dto.question}`,
    });

    return messages;
  }

  private extractCitations(
    results: VectorSearchResult[],
  ): Array<{ title: string; url: string; score: number; snippet?: string }> {
    // De-duplicate by URL
    const seen = new Set<string>();
    const citations: Array<{ title: string; url: string; score: number; snippet?: string }> = [];

    for (const r of results) {
      const url = (r.payload['url'] as string) || '';
      if (seen.has(url)) continue;
      seen.add(url);

      citations.push({
        title: (r.payload['title'] as string) || 'Unknown',
        url,
        score: Math.round(r.score * 1000) / 1000,
        snippet: ((r.payload['content'] as string) || '').slice(0, 200),
      });
    }

    return citations;
  }
}
