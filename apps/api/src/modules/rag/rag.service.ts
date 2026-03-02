import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorService, VectorSearchResult } from '../vector/vector.service';
import { LlmService } from '../llm/llm.service';
import { ChatMessage } from '../llm/llm.types';
import { AskQuestionDto } from './dto/ask-question.dto';
import { ProjectsService } from '../projects/projects.service';
import { Feedback } from '../../entities/feedback.entity';
import { Message } from '../../entities/message.entity';
import { Source } from '../../entities/source.entity';
import { Project } from '../../entities/project.entity';
import { ProjectSource } from '../../entities/project-source.entity';

const TOP_K = 12;
const FINAL_K = 8;

const RECENCY_HALF_LIFE_DAYS = 90;
const RECENCY_MAX_BOOST = 0.10;
const FEEDBACK_POSITIVE_BOOST = 0.05;
const FEEDBACK_NEGATIVE_PENALTY = 0.08;

type QueryIntent = 'project_list' | 'project_specific' | 'general';

export interface Citation {
  title: string;
  url: string;
  score: number;
  snippet?: string;
}

interface StructuredContextResult {
  projectContext: string | null;
  projectSources: Citation[];
  resolvedProjectId?: string;
}

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
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectSource)
    private readonly projectSourceRepo: Repository<ProjectSource>,
  ) {}

  /**
   * Process a question through the enhanced RAG pipeline:
   *  1. Classify the query intent (project_list / project_specific / general)
   *  2. Gather structured project data from DB when relevant
   *  3. Embed the question & retrieve relevant chunks from Qdrant
   *  4. Re-rank results (recency boost + feedback signals)
   *  5. Build prompt with vector context + structured project context
   *  6. Generate answer via LLM
   *  7. Return answer with citations
   */
  async ask(dto: AskQuestionDto) {
    const [projectId, intent] = await Promise.all([
      this.resolveProjectIdFromDto(dto),
      this.classifyQuery(dto.question),
    ]);
    this.logger.log(
      `Question received: "${dto.question}" [intent=${intent}] [provider=${this.llm.getProvider()}]${projectId ? ` [project=${projectId}]` : ''}`,
    );

    const structuredContext = await this.gatherStructuredContext(intent, dto.question, projectId);

    const questionVector = await this.embedding.embedText(dto.question);
    const filter = await this.buildSearchFilter(
      structuredContext.resolvedProjectId ?? projectId,
    );
    const rawResults = await this.vector.search(questionVector, TOP_K, filter);

    if (rawResults.length === 0 && !structuredContext.projectContext) {
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

    const searchResults = rawResults.length > 0
      ? await this.rerankResults(rawResults)
      : [];

    const vectorContext = this.buildContext(searchResults);
    const fullContext = this.mergeContexts(vectorContext, structuredContext.projectContext);
    const messages = this.buildMessages(dto, fullContext, intent);
    const completion = await this.llm.chatCompletion({
      messages,
      temperature: 0.3,
      maxTokens: 2000,
    });

    const vectorCitations = this.extractCitations(searchResults);
    const sources = this.mergeCitations(structuredContext.projectSources, vectorCitations);
    const avgScore = searchResults.length > 0
      ? searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length
      : structuredContext.projectContext ? 0.8 : 0;

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
   * Streaming version of ask() with the same enhanced intent-aware pipeline.
   */
  async *askStream(dto: AskQuestionDto): AsyncGenerator<
    | { type: 'metadata'; sources: any[]; confidence: number; provider: string; model: string }
    | { type: 'chunk'; text: string }
    | { type: 'done' },
    void,
    undefined
  > {
    const [projectId, intent] = await Promise.all([
      this.resolveProjectIdFromDto(dto),
      this.classifyQuery(dto.question),
    ]);
    this.logger.log(
      `[stream] Question received: "${dto.question}" [intent=${intent}] [provider=${this.llm.getProvider()}]${projectId ? ` [project=${projectId}]` : ''}`,
    );

    const structuredContext = await this.gatherStructuredContext(intent, dto.question, projectId);

    const questionVector = await this.embedding.embedText(dto.question);
    const filter = await this.buildSearchFilter(
      structuredContext.resolvedProjectId ?? projectId,
    );
    const rawResults = await this.vector.search(questionVector, TOP_K, filter);

    if (rawResults.length === 0 && !structuredContext.projectContext) {
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

    const searchResults = rawResults.length > 0
      ? await this.rerankResults(rawResults)
      : [];

    const vectorContext = this.buildContext(searchResults);
    const fullContext = this.mergeContexts(vectorContext, structuredContext.projectContext);
    const vectorCitations = this.extractCitations(searchResults);
    const sources = this.mergeCitations(structuredContext.projectSources, vectorCitations);
    const avgScore = searchResults.length > 0
      ? searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length
      : structuredContext.projectContext ? 0.8 : 0;

    yield {
      type: 'metadata',
      sources,
      confidence: Math.round(avgScore * 100) / 100,
      provider: this.llm.getProvider(),
      model: this.llm.getModel(),
    };

    const messages = this.buildMessages(dto, fullContext, intent);

    for await (const text of this.llm.chatCompletionStream({
      messages,
      temperature: 0.3,
      maxTokens: 2000,
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

  // ───────────────────── Query Classification ─────────────────────

  /**
   * Classify the user's question intent. Uses regex as a fast-path for
   * obvious matches, then falls back to an LLM call for ambiguous or
   * misspelled queries so typos / informal phrasing still route correctly.
   */
  private async classifyQuery(question: string): Promise<QueryIntent> {
    const fast = this.fastClassifyQuery(question);
    if (fast !== 'general') {
      this.logger.debug(`Intent resolved via fast-path: ${fast}`);
      return fast;
    }

    return this.aiClassifyQuery(question);
  }

  /**
   * Regex-based fast-path for clear-cut intent detection (zero latency).
   */
  private fastClassifyQuery(question: string): QueryIntent {
    const q = question.toLowerCase().trim();

    const listPatterns = [
      /(?:list|show|what are|give me|enumerate|display)\s+(?:all\s+)?(?:the\s+)?(?:projects|repos|repositories)/,
      /(?:projects|repos|repositories)\s+(?:available|built|created|under|in|on|exist)/,
      /(?:how many|which)\s+(?:projects|repos|repositories)/,
      /(?:latest|recent|new|all)\s+(?:projects|repos|repositories)/,
      /(?:overview|summary)\s+(?:of\s+)?(?:all\s+)?(?:projects|repos|repositories)/,
      /(?:what|which)\s+.*(?:projects|repos|repositories)\s+.*(?:have|are|exist|built|available)/,
    ];
    if (listPatterns.some((p) => p.test(q))) {
      return 'project_list';
    }

    return 'general';
  }

  /**
   * LLM-powered intent classification for ambiguous, misspelled, or
   * informally phrased questions that the regex fast-path cannot handle.
   */
  private async aiClassifyQuery(question: string): Promise<QueryIntent> {
    try {
      const completion = await this.llm.chatCompletion({
        messages: [
          {
            role: 'system',
            content: `You are a query intent classifier for a knowledge base about the Tokamak Network blockchain ecosystem.

Classify the user's question into exactly ONE of these categories:

project_list — The user wants to see, list, browse, or get an overview of multiple projects, repositories, or what has been built. This includes questions with typos, misspellings, or informal language that clearly refer to listing/showing projects. Examples:
  - "what are the latest projects built under tokamak network"
  - "show me all repos"
  - "what projects have been built"
  - "list them with short description"
  - "what are the latest p[roejcts een build under tokamak network org"

project_specific — The user is asking about ONE specific project by name, wanting details, documentation, or how it works. Examples:
  - "tell me about titan"
  - "how does tokamak bridge work"
  - "what is the TON staking contract"

general — Any other question: technical how-tos, concepts, staking, governance, code-level questions, etc. Examples:
  - "how does layer 2 rollup work"
  - "what is TON token"
  - "explain plasma architecture"

Reply with ONLY the category name. No explanation, no punctuation.`,
          },
          { role: 'user', content: question },
        ],
        temperature: 0,
        maxTokens: 20,
      });

      const result = completion.content.trim().toLowerCase();

      if (result === 'project_list' || result === 'project_specific' || result === 'general') {
        this.logger.debug(`Intent resolved via AI: ${result}`);
        return result;
      }

      if (result.includes('project_list')) return 'project_list';
      if (result.includes('project_specific')) return 'project_specific';

      this.logger.warn(`AI classifier returned unexpected value "${result}", defaulting to general`);
      return 'general';
    } catch (err) {
      this.logger.warn(`AI intent classification failed, defaulting to general: ${err}`);
      return 'general';
    }
  }

  // ───────────────────── Structured Context Gathering ─────────────────────

  /**
   * Gather structured project data from the database based on query intent.
   * Returns formatted context + citation entries derived from project metadata.
   */
  private async gatherStructuredContext(
    intent: QueryIntent,
    question: string,
    existingProjectId?: string,
  ): Promise<StructuredContextResult> {
    if (intent === 'project_list') {
      const { context, citations } = await this.getProjectListContext();
      return { projectContext: context, projectSources: citations };
    }

    if (intent === 'project_specific' && !existingProjectId) {
      const match = await this.findMatchingProject(question);
      if (match) {
        const { context, citations } = await this.getProjectDetailContext(match.id);
        return { projectContext: context, projectSources: citations, resolvedProjectId: match.id };
      }
      const { context, citations } = await this.getProjectListContext();
      return {
        projectContext: `[No exact project match found for the question. Here are all available projects for reference:]\n\n${context}`,
        projectSources: citations,
      };
    }

    if (existingProjectId) {
      const { context, citations } = await this.getProjectDetailContext(existingProjectId);
      return { projectContext: context, projectSources: citations, resolvedProjectId: existingProjectId };
    }

    return { projectContext: null, projectSources: [] };
  }

  /**
   * Fetch all projects from the database and format as structured context
   * plus citation entries for each project's links/repos.
   */
  private async getProjectListContext(): Promise<{ context: string; citations: Citation[] }> {
    const projects = await this.projectRepo.find({
      order: { createdAt: 'DESC' },
    });

    if (projects.length === 0) {
      return { context: '[PROJECT DATA]\nNo projects have been created yet.', citations: [] };
    }

    const citations: Citation[] = [];

    const projectIds = projects.map((p) => p.id);
    const allProjectSources = await this.projectSourceRepo.find({
      where: { projectId: In(projectIds) },
      relations: ['source'],
    });
    const sourcesByProject = new Map<string, ProjectSource[]>();
    for (const ps of allProjectSources) {
      const list = sourcesByProject.get(ps.projectId) ?? [];
      list.push(ps);
      sourcesByProject.set(ps.projectId, list);
    }

    const enrichedProjects = projects.map((p) => {
        const sources = sourcesByProject.get(p.id) ?? [];
        const sourceNames = sources
          .map((ps) => `${ps.source.name} (${ps.source.type})`)
          .join(', ');
        const githubLinks = p.links
          ?.filter((l) => l.url?.includes('github.com'))
          .map((l) => l.url) ?? [];

        // Build citation for this project — prefer GitHub link, fall back to
        // the first knowledge source's GitHub URL, or the project page itself.
        const primaryUrl = githubLinks[0]
          ?? this.extractGithubUrl(sources)
          ?? `/projects/${p.slug}`;

        citations.push({
          title: p.name,
          url: primaryUrl,
          score: 1.0,
          snippet: p.description || undefined,
        });

        // Also add individual knowledge sources as citations
        for (const ps of sources) {
          const config = ps.source.config as Record<string, unknown>;
          if (config.owner && config.repo) {
            const repoUrl = `https://github.com/${config.owner}/${config.repo}`;
            if (!citations.some((c) => c.url === repoUrl)) {
              citations.push({
                title: `${ps.source.name}`,
                url: repoUrl,
                score: 0.9,
                snippet: `Knowledge source for ${p.name} (${ps.source.type}, ${ps.source.documentCount} docs)`,
              });
            }
          }
        }

        return {
          name: p.name,
          slug: p.slug,
          description: p.description || 'No description',
          isPublic: p.isPublic,
          sourceCount: sources.length,
          sources: sourceNames || 'No sources assigned',
          githubLinks,
          createdAt: p.createdAt.toISOString().split('T')[0],
          summary: p.summary ? p.summary.slice(0, 300) : null,
        };
      });

    const lines = enrichedProjects.map((p, i) => {
      let entry = `${i + 1}. **${p.name}** (slug: ${p.slug})`;
      entry += `\n   Description: ${p.description}`;
      if (p.summary) entry += `\n   Summary: ${p.summary}`;
      entry += `\n   Sources (${p.sourceCount}): ${p.sources}`;
      if (p.githubLinks.length > 0) entry += `\n   GitHub: ${p.githubLinks.join(', ')}`;
      entry += `\n   Created: ${p.createdAt} | Public: ${p.isPublic ? 'Yes' : 'No'}`;
      return entry;
    });

    return {
      context: `[PROJECT DATA — ${projects.length} projects in the knowledge base]\n\n${lines.join('\n\n')}`,
      citations,
    };
  }

  /**
   * Fetch detailed info about a specific project for context + citations.
   */
  private async getProjectDetailContext(projectId: string): Promise<{ context: string; citations: Citation[] }> {
    const empty = { context: '', citations: [] };
    try {
      const project = await this.projectRepo.findOneBy({ id: projectId });
      if (!project) return empty;

      const projectSources = await this.projectSourceRepo.find({
        where: { projectId },
        relations: ['source'],
      });

      const citations: Citation[] = [];

      // Add the project's own links as citations
      const githubLinks = project.links
        ?.filter((l) => l.url?.includes('github.com'))
        .map((l) => l.url) ?? [];

      const primaryUrl = githubLinks[0]
        ?? this.extractGithubUrl(projectSources)
        ?? `/projects/${project.slug}`;

      citations.push({
        title: project.name,
        url: primaryUrl,
        score: 1.0,
        snippet: project.description || undefined,
      });

      // Add each knowledge source repository as a citation
      for (const ps of projectSources) {
        const config = ps.source.config as Record<string, unknown>;
        if (config.owner && config.repo) {
          const repoUrl = `https://github.com/${config.owner}/${config.repo}`;
          citations.push({
            title: ps.source.name,
            url: repoUrl,
            score: 0.95,
            snippet: `${ps.source.type} source — ${ps.source.documentCount} documents indexed`,
          });
        }
      }

      // Also add non-GitHub links from the project
      for (const link of project.links ?? []) {
        if (link.url && !link.url.includes('github.com') && !citations.some((c) => c.url === link.url)) {
          citations.push({
            title: `${project.name} — ${link.label}`,
            url: link.url,
            score: 0.85,
            snippet: `${link.label} link for ${project.name}`,
          });
        }
      }

      const sourceDetails = projectSources.map((ps) => {
        const s = ps.source;
        const config = s.config as Record<string, unknown>;
        return `  - ${s.name} (${s.type}, ${s.documentCount} documents, status: ${s.status})${config.owner && config.repo ? ` — github.com/${config.owner}/${config.repo}` : ''}`;
      });

      let context = `[PROJECT DETAIL — ${project.name}]\n`;
      context += `Name: ${project.name}\n`;
      context += `Slug: ${project.slug}\n`;
      context += `Description: ${project.description || 'No description'}\n`;
      if (project.summary) context += `Summary:\n${project.summary}\n`;
      if (project.links?.length) {
        context += `Links:\n${project.links.map((l) => `  - ${l.label}: ${l.url}`).join('\n')}\n`;
      }
      context += `Created: ${project.createdAt.toISOString().split('T')[0]}\n`;
      context += `Knowledge Sources (${projectSources.length}):\n${sourceDetails.join('\n')}\n`;

      return { context, citations };
    } catch (err) {
      this.logger.warn(`Failed to fetch project detail context: ${err}`);
      return empty;
    }
  }

  /**
   * Extract the first GitHub URL from a list of project sources.
   */
  private extractGithubUrl(projectSources: ProjectSource[]): string | null {
    for (const ps of projectSources) {
      const config = ps.source.config as Record<string, unknown>;
      if (config.owner && config.repo) {
        return `https://github.com/${config.owner}/${config.repo}`;
      }
    }
    return null;
  }

  /**
   * Try to find a matching project in the database based on keywords in the question.
   * Uses fuzzy matching against project names, slugs, and descriptions.
   */
  private async findMatchingProject(question: string): Promise<Project | null> {
    const q = question.toLowerCase();

    const projects = await this.projectRepo.find();
    if (projects.length === 0) return null;

    const scored = projects
      .map((p) => {
        let score = 0;
        const nameLower = p.name.toLowerCase();
        const slugLower = p.slug.toLowerCase();

        if (q.includes(nameLower)) score += 10;
        if (q.includes(slugLower)) score += 8;

        const nameWords = nameLower.split(/[\s\-_]+/);
        const slugWords = slugLower.split(/[\s\-_]+/);
        const questionWords = q.split(/[\s\-_?.,!]+/).filter((w) => w.length > 2);

        for (const word of nameWords) {
          if (word.length > 2 && questionWords.includes(word)) score += 3;
        }
        for (const word of slugWords) {
          if (word.length > 2 && questionWords.includes(word)) score += 2;
        }

        return { project: p, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.length > 0 ? scored[0].project : null;
  }

  /**
   * Merge vector search context with structured project context.
   */
  private mergeContexts(vectorContext: string, projectContext: string | null): string {
    if (!projectContext && !vectorContext) return '';
    if (!projectContext) return vectorContext;
    if (!vectorContext) return projectContext;
    return `${projectContext}\n\n---\n\n${vectorContext}`;
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

  private buildMessages(dto: AskQuestionDto, context: string, intent: QueryIntent = 'general'): ChatMessage[] {
    let intentGuidance = '';

    if (intent === 'project_list') {
      intentGuidance = `
- The user is asking about projects/repositories in the ecosystem. The context includes a structured [PROJECT DATA] section with the definitive list of all projects from the database.
- Use this structured data as your primary source for listing projects. Present each project clearly with its name, description, and key details.
- If vector search results (the [Source N] sections) provide additional relevant information about the projects, incorporate that too.
- Format the list in a clean, readable way using Markdown.`;
    } else if (intent === 'project_specific') {
      intentGuidance = `
- The user is asking about a specific project. The context may include a [PROJECT DETAIL] section with structured metadata about the matched project.
- If a project was matched, use the structured detail as the foundation of your answer, and supplement with relevant information from the [Source N] vector search results.
- If no exact project was matched (indicated by "[No exact project match found]"), let the user know and suggest the closest available projects from the list provided.
- When answering about a specific project, cover: what it does, its technology, its sources/repositories, and any other relevant details available.`;
    }

    const systemPrompt = `You are a knowledgeable assistant for the Tokamak Network ecosystem. Answer questions accurately based on the provided context. The context may include two types of data:

1. **Structured project data** (marked with [PROJECT DATA] or [PROJECT DETAIL]) — authoritative metadata from the database about projects, their sources, and links.
2. **Vector search results** (marked with [Source N]) — relevant document chunks retrieved from the knowledge base.

Rules:
- Use both structured project data and vector search results to give comprehensive answers
- When structured project data is available, treat it as the authoritative source for project names, descriptions, and metadata
- Cite vector search sources using [Source N] notation when referencing information from those documents
- If the answer requires information not in any provided context, explicitly say so
- Be concise but thorough
- Use Markdown formatting for better readability
- **Prefer newer/more recently indexed sources** over older ones when they contain conflicting or overlapping information. Each source includes an "Indexed" date — use this to judge recency.
- If a source appears outdated, deprecated, or contradicts newer sources, note this in your answer and prefer the up-to-date information.
- Treat the vector sources as ranked by relevance and recency — earlier sources in the list are generally more reliable.${intentGuidance}`;

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
      content: `Context:\n\n${context}\n\n---\n\nQuestion: ${dto.question}`,
    });

    return messages;
  }

  private extractCitations(results: VectorSearchResult[]): Citation[] {
    const seen = new Set<string>();
    const citations: Citation[] = [];

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

  /**
   * Merge project-derived citations with vector search citations.
   * Project sources come first (they are the authoritative metadata),
   * followed by vector citations. Deduplicates by URL.
   */
  private mergeCitations(projectCitations: Citation[], vectorCitations: Citation[]): Citation[] {
    const seen = new Set<string>();
    const merged: Citation[] = [];

    for (const c of projectCitations) {
      if (seen.has(c.url)) continue;
      seen.add(c.url);
      merged.push(c);
    }

    for (const c of vectorCitations) {
      if (seen.has(c.url)) continue;
      seen.add(c.url);
      merged.push(c);
    }

    return merged;
  }
}
