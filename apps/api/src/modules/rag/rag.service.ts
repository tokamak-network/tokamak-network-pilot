import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorService, VectorSearchResult } from '../vector/vector.service';
import { LlmService } from '../llm/llm.service';
import { ChatMessage } from '../llm/llm.types';
import { AskQuestionDto } from './dto/ask-question.dto';
import { ProjectsService } from '../projects/projects.service';
import { Feedback } from '../../entities/feedback.entity';
import { Message } from '../../entities/message.entity';
import { Source } from '../../entities/source.entity';

const TOP_K = 12; // Retrieve more to allow for re-ranking (was 8)
const FINAL_K = 8; // Return top 8 after re-ranking

const RECENCY_HALF_LIFE_DAYS = 90;
const RECENCY_MAX_BOOST = 0.10;
const FEEDBACK_POSITIVE_BOOST = 0.05;
const FEEDBACK_NEGATIVE_PENALTY = 0.08;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly embedding: EmbeddingService,
    private readonly vector: VectorService,
    private readonly llm: LlmService,
    @Inject(forwardRef(() => ProjectsService))
    private readonly projects: ProjectsService,
    @InjectRepository(Feedback)
    private readonly feedbackRepo: Repository<Feedback>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Source)
    private readonly sourceRepo: Repository<Source>,
  ) {}

  /**
   * Process a question through the full RAG pipeline:
   *  1. Embed the question
   *  2. Retrieve relevant chunks from Qdrant (with deprecated/archived filtering)
   *  3. Re-rank results (recency boost + feedback signals)
   *  4. Build prompt with context
   *  5. Generate answer via LLM
   *  6. Return answer with citations
   */
  async ask(dto: AskQuestionDto) {
    const projectId = await this.resolveProjectIdFromDto(dto);
    this.logger.log(
      `Question received: "${dto.question}" [provider=${this.llm.getProvider()}]${projectId ? ` [project=${projectId}]` : ''}`,
    );

    const questionVector = await this.embedding.embedText(dto.question);

    const filter = await this.buildSearchFilter(projectId);
    const rawResults = await this.vector.search(questionVector, TOP_K, filter);

    if (rawResults.length === 0) {
      return {
        answer:
          'I don\'t have enough information to answer this question. No relevant documents were found in the knowledge base. Please try adding knowledge sources first.',
        question: dto.question,
        sources: [],
        confidence: 0,
        provider: this.llm.getProvider(),
        model: this.llm.getModel(),
      };
    }

    const searchResults = await this.rerankResults(rawResults);

    const context = this.buildContext(searchResults);
    const messages = this.buildMessages(dto, context);
    const completion = await this.llm.chatCompletion({
      messages,
      temperature: 0.3,
      maxTokens: 1500,
    });

    const sources = this.extractCitations(searchResults);
    const avgScore =
      searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length;

    return {
      answer: completion.content,
      question: dto.question,
      sources,
      confidence: Math.round(avgScore * 100) / 100,
      provider: completion.provider,
      model: completion.model,
      usage: completion.usage,
    };
  }

  /**
   * Streaming version of ask(): performs the RAG pipeline but streams
   * the LLM answer token-by-token via an AsyncGenerator.
   */
  async *askStream(dto: AskQuestionDto): AsyncGenerator<
    | { type: 'metadata'; sources: any[]; confidence: number; provider: string; model: string }
    | { type: 'chunk'; text: string }
    | { type: 'done' },
    void,
    undefined
  > {
    const projectId = await this.resolveProjectIdFromDto(dto);
    this.logger.log(
      `[stream] Question received: "${dto.question}" [provider=${this.llm.getProvider()}]${projectId ? ` [project=${projectId}]` : ''}`,
    );

    const questionVector = await this.embedding.embedText(dto.question);

    const filter = await this.buildSearchFilter(projectId);
    const rawResults = await this.vector.search(questionVector, TOP_K, filter);

    if (rawResults.length === 0) {
      yield {
        type: 'metadata',
        sources: [],
        confidence: 0,
        provider: this.llm.getProvider(),
        model: this.llm.getModel(),
      };
      yield {
        type: 'chunk',
        text: 'I don\'t have enough information to answer this question. No relevant documents were found in the knowledge base. Please try adding knowledge sources first.',
      };
      yield { type: 'done' };
      return;
    }

    const searchResults = await this.rerankResults(rawResults);

    const context = this.buildContext(searchResults);
    const sources = this.extractCitations(searchResults);
    const avgScore =
      searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length;

    yield {
      type: 'metadata',
      sources,
      confidence: Math.round(avgScore * 100) / 100,
      provider: this.llm.getProvider(),
      model: this.llm.getModel(),
    };

    const messages = this.buildMessages(dto, context);

    for await (const text of this.llm.chatCompletionStream({
      messages,
      temperature: 0.3,
      maxTokens: 1500,
    })) {
      yield { type: 'chunk', text };
    }

    yield { type: 'done' };
  }

  /**
   * Semantic search — return relevant chunks without LLM generation.
   */
  async search(query: string, limit = 10, projectId?: string) {
    this.logger.log(`Search query: ${query} (limit: ${limit})${projectId ? ` [project=${projectId}]` : ''}`);

    const queryVector = await this.embedding.embedText(query);
    const filter = await this.buildSearchFilter(projectId);
    const results = await this.vector.search(queryVector, limit, filter);

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

  // ───────────────────── Filtering ─────────────────────

  /**
   * Resolve projectId from dto (projectId or projectSlug).
   */
  private async resolveProjectIdFromDto(dto: AskQuestionDto): Promise<string | undefined> {
    if (dto.projectId) return dto.projectId;
    if (dto.projectSlug) {
      const id = await this.projects.resolveProjectId(dto.projectSlug);
      return id ?? undefined;
    }
    return undefined;
  }

  /**
   * Build Qdrant filter that:
   *  - Scopes to project sources (if projectId provided)
   *  - Excludes archived repositories
   *  - Excludes disabled sources
   */
  private async buildSearchFilter(projectId?: string): Promise<Record<string, unknown> | undefined> {
    const mustConditions: Record<string, unknown>[] = [];
    const mustNotConditions: Record<string, unknown>[] = [];

    // Project-scoped filter
    if (projectId) {
      const sourceIds = await this.projects.getProjectSourceIds(projectId);
      if (sourceIds.length > 0) {
        mustConditions.push({
          key: 'sourceId',
          match: { any: sourceIds },
        });
      }
    }

    // Exclude archived repos (isArchived stored in Qdrant payload)
    mustNotConditions.push({
      key: 'isArchived',
      match: { value: true },
    });

    // Exclude disabled sources (sourceStatus stored in Qdrant payload)
    mustNotConditions.push({
      key: 'sourceStatus',
      match: { value: 'disabled' },
    });

    // Also filter out disabled sources by checking the DB for source IDs
    // that have been disabled since ingestion
    const disabledSources = await this.sourceRepo.find({
      where: { status: 'disabled' },
      select: ['id'],
    });
    for (const ds of disabledSources) {
      mustNotConditions.push({
        key: 'sourceId',
        match: { value: ds.id },
      });
    }

    if (mustConditions.length === 0 && mustNotConditions.length === 0) {
      return undefined;
    }

    const filter: Record<string, unknown> = {};
    if (mustConditions.length > 0) filter['must'] = mustConditions;
    if (mustNotConditions.length > 0) filter['must_not'] = mustNotConditions;

    return filter;
  }

  // ───────────────────── Re-ranking ─────────────────────

  /**
   * Re-rank retrieved results by combining:
   *  1. Original semantic similarity score
   *  2. Recency boost (newer content scores higher)
   *  3. Feedback signals (penalize sources cited in negatively-rated answers)
   */
  private async rerankResults(results: VectorSearchResult[]): Promise<VectorSearchResult[]> {
    const feedbackScores = await this.getSourceFeedbackScores(results);

    const nowUnix = Math.floor(Date.now() / 1000);

    const scored = results.map((r) => {
      let adjustedScore = r.score;

      // Recency boost: exponential decay favoring newer content
      const ingestedAt = r.payload['ingestedAt'] as number | undefined;
      if (ingestedAt) {
        const ageDays = (nowUnix - ingestedAt) / 86400;
        const recencyFactor = Math.exp(-ageDays * (Math.LN2 / RECENCY_HALF_LIFE_DAYS));
        adjustedScore += RECENCY_MAX_BOOST * recencyFactor;
      }

      // Feedback-based adjustment
      const url = r.payload['url'] as string | undefined;
      if (url && feedbackScores.has(url)) {
        const fb = feedbackScores.get(url)!;
        if (fb.net > 0) {
          adjustedScore += FEEDBACK_POSITIVE_BOOST * Math.min(fb.net / 5, 1);
        } else if (fb.net < 0) {
          adjustedScore -= FEEDBACK_NEGATIVE_PENALTY * Math.min(Math.abs(fb.net) / 3, 1);
        }
      }

      return { ...r, score: adjustedScore };
    });

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, FINAL_K);
  }

  /**
   * Look up aggregate feedback for the source URLs in retrieved results.
   * Returns a map of URL -> { ups, downs, net } based on historical feedback
   * on assistant messages that cited those URLs.
   */
  private async getSourceFeedbackScores(
    results: VectorSearchResult[],
  ): Promise<Map<string, { ups: number; downs: number; net: number }>> {
    const urlScores = new Map<string, { ups: number; downs: number; net: number }>();

    const urls = results
      .map((r) => r.payload['url'] as string)
      .filter(Boolean);

    if (urls.length === 0) return urlScores;

    try {
      // Get recent feedback with their associated messages (last 500 feedback entries)
      const recentFeedback = await this.feedbackRepo.find({
        relations: ['message'],
        order: { createdAt: 'DESC' },
        take: 500,
      });

      for (const fb of recentFeedback) {
        const messageSources = fb.message?.sources;
        if (!messageSources || !Array.isArray(messageSources)) continue;

        for (const src of messageSources) {
          if (!src.url || !urls.includes(src.url)) continue;

          if (!urlScores.has(src.url)) {
            urlScores.set(src.url, { ups: 0, downs: 0, net: 0 });
          }

          const entry = urlScores.get(src.url)!;
          if (fb.rating === 'up') {
            entry.ups++;
            entry.net++;
          } else {
            entry.downs++;
            entry.net--;
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to load feedback scores for re-ranking: ${err}`);
    }

    return urlScores;
  }

  // ───────────────────── Context & Prompts ─────────────────────

  private buildContext(results: VectorSearchResult[]): string {
    return results
      .map((r, i) => {
        const title = r.payload['title'] || 'Unknown';
        const content = r.payload['content'] || '';
        const url = r.payload['url'] || '';
        const ingestedAt = r.payload['ingestedAt'] as number | undefined;
        const dateStr = ingestedAt
          ? new Date(ingestedAt * 1000).toISOString().split('T')[0]
          : '';
        const dateLine = dateStr ? `\nIndexed: ${dateStr}` : '';
        return `[Source ${i + 1}] ${title}\nURL: ${url}${dateLine}\n${content}`;
      })
      .join('\n\n---\n\n');
  }

  private buildMessages(dto: AskQuestionDto, context: string): ChatMessage[] {
    const systemPrompt = `You are a knowledgeable assistant for the Tokamak Network ecosystem. Answer questions accurately based on the provided context documents. If the context doesn't contain enough information, say so honestly. Always cite your sources by referencing the [Source N] tags.

Rules:
- Only use information from the provided context to answer
- Cite sources using [Source N] notation
- If the answer requires information not in the context, explicitly say so
- Be concise but thorough
- Use Markdown formatting for better readability
- **Prefer newer/more recently indexed sources** over older ones when they contain conflicting or overlapping information. Each source includes an "Indexed" date — use this to judge recency.
- If a source appears outdated, deprecated, or contradicts newer sources, note this in your answer and prefer the up-to-date information.
- Treat the sources as ranked by relevance and recency — earlier sources in the list are generally more reliable.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (dto.conversationHistory && dto.conversationHistory.length > 0) {
      for (const msg of dto.conversationHistory) {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    messages.push({
      role: 'user',
      content: `Context documents:\n\n${context}\n\n---\n\nQuestion: ${dto.question}`,
    });

    return messages;
  }

  private extractCitations(
    results: VectorSearchResult[],
  ): Array<{ title: string; url: string; score: number; snippet?: string }> {
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
