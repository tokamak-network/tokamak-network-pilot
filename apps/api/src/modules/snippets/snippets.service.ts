import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Snippet } from '../../entities/snippet.entity';
import { RagService } from '../rag/rag.service';
import { LlmService } from '../llm/llm.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorService } from '../vector/vector.service';
import { CreateSnippetDto } from './dto/create-snippet.dto';
import { GenerateSnippetDto } from './dto/generate-snippet.dto';

@Injectable()
export class SnippetsService {
  private readonly logger = new Logger(SnippetsService.name);

  constructor(
    @InjectRepository(Snippet)
    private readonly snippetRepo: Repository<Snippet>,
    private readonly llm: LlmService,
    private readonly embedding: EmbeddingService,
    private readonly vector: VectorService,
  ) {}

  async create(dto: CreateSnippetDto, authorId?: string) {
    const snippet = this.snippetRepo.create({
      ...dto,
      tags: dto.tags || [],
      authorId: authorId || undefined,
      isGenerated: false,
    });
    const saved = await this.snippetRepo.save(snippet);
    this.logger.log(`Snippet created: ${saved.id} "${saved.title}"`);
    return this.toResponse(saved);
  }

  async findAll(filters?: {
    language?: string;
    category?: string;
    projectSlug?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 20, 100);

    const qb = this.snippetRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.author', 'author')
      .orderBy('s.copyCount', 'DESC')
      .addOrderBy('s.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters?.language) {
      qb.andWhere('s.language = :language', { language: filters.language });
    }
    if (filters?.category) {
      qb.andWhere('s.category = :category', { category: filters.category });
    }
    if (filters?.projectSlug) {
      qb.andWhere('s.projectSlug = :projectSlug', {
        projectSlug: filters.projectSlug,
      });
    }
    if (filters?.search) {
      qb.andWhere(
        '(s.title ILIKE :q OR s.description ILIKE :q OR s.code ILIKE :q)',
        { q: `%${filters.search}%` },
      );
    }

    const [snippets, total] = await qb.getManyAndCount();

    return {
      data: snippets.map((s) => this.toResponse(s)),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  async findOne(id: string) {
    const snippet = await this.snippetRepo.findOne({
      where: { id },
      relations: ['author'],
    });
    if (!snippet) throw new NotFoundException(`Snippet ${id} not found`);
    return this.toResponse(snippet);
  }

  async update(id: string, dto: Partial<CreateSnippetDto>) {
    const snippet = await this.snippetRepo.findOne({ where: { id } });
    if (!snippet) throw new NotFoundException(`Snippet ${id} not found`);

    Object.assign(snippet, dto);
    if (dto.tags) snippet.tags = dto.tags;

    const saved = await this.snippetRepo.save(snippet);
    return this.toResponse(saved);
  }

  async remove(id: string) {
    const snippet = await this.snippetRepo.findOne({ where: { id } });
    if (!snippet) throw new NotFoundException(`Snippet ${id} not found`);
    await this.snippetRepo.remove(snippet);
    return { message: `Snippet ${id} deleted` };
  }

  async trackCopy(id: string) {
    const snippet = await this.snippetRepo.findOne({ where: { id } });
    if (!snippet) throw new NotFoundException(`Snippet ${id} not found`);
    snippet.copyCount += 1;
    await this.snippetRepo.save(snippet);
    return { copyCount: snippet.copyCount };
  }

  /**
   * AI-powered code generation: uses the RAG pipeline to retrieve relevant
   * code context from indexed repos, then asks the LLM to produce a
   * ready-to-use snippet.
   */
  async generate(dto: GenerateSnippetDto) {
    this.logger.log(`Generating snippet: "${dto.prompt}" [lang=${dto.language || 'auto'}]`);

    const queryVector = await this.embedding.embedText(dto.prompt);
    const searchResults = await this.vector.search(queryVector, 6);

    const codeContext = searchResults
      .map((r, i) => {
        const title = r.payload['title'] || 'Unknown';
        const content = r.payload['content'] || '';
        const url = r.payload['url'] || '';
        return `[Source ${i + 1}] ${title}\nURL: ${url}\n${content}`;
      })
      .join('\n\n---\n\n');

    const lang = dto.language || 'TypeScript';

    const messages = [
      {
        role: 'system' as const,
        content: `You are an expert developer for the Tokamak Network ecosystem. Generate clean, working code snippets based on the user's request and the provided context from the Tokamak codebase.

Rules:
- Write production-quality ${lang} code
- Include necessary imports and setup
- Add brief inline comments only for non-obvious logic
- Use real Tokamak APIs/contracts/SDKs from the context — never invent fake APIs
- If the context doesn't have enough info, say so honestly
- Return your response in this exact JSON format (no markdown wrapping):
{
  "title": "Short descriptive title",
  "description": "One-line explanation of what this code does",
  "code": "the actual code here",
  "language": "${lang.toLowerCase()}",
  "category": "relevant category (e.g. staking, bridge, deployment, contracts, sdk)",
  "tags": ["relevant", "tags"]
}`,
      },
      {
        role: 'user' as const,
        content: `Context from Tokamak codebase:\n\n${codeContext}\n\n---\n\nRequest: ${dto.prompt}`,
      },
    ];

    const completion = await this.llm.chatCompletion({
      messages,
      temperature: 0.2,
      maxTokens: 2000,
    });

    try {
      const cleaned = completion.content
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      const generated = JSON.parse(cleaned);

      const snippet = this.snippetRepo.create({
        title: generated.title || dto.prompt.slice(0, 100),
        description: generated.description,
        code: generated.code,
        language: generated.language || lang.toLowerCase(),
        category: generated.category,
        tags: generated.tags || [],
        projectSlug: dto.projectSlug,
        isGenerated: true,
      });
      const saved = await this.snippetRepo.save(snippet);

      this.logger.log(`Snippet generated: ${saved.id} "${saved.title}"`);

      return {
        ...this.toResponse(saved),
        provider: completion.provider,
        model: completion.model,
      };
    } catch {
      this.logger.warn('Failed to parse LLM response as JSON, returning raw');
      return {
        title: dto.prompt.slice(0, 100),
        description: null,
        code: completion.content,
        language: lang.toLowerCase(),
        category: null,
        tags: [],
        isGenerated: true,
        provider: completion.provider,
        model: completion.model,
      };
    }
  }

  async getLanguages() {
    const result = await this.snippetRepo
      .createQueryBuilder('s')
      .select('s.language', 'language')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('s.language')
      .orderBy('"count"', 'DESC')
      .getRawMany<{ language: string; count: number }>();
    return result;
  }

  async getCategories() {
    const result = await this.snippetRepo
      .createQueryBuilder('s')
      .select('s.category', 'category')
      .addSelect('COUNT(*)::int', 'count')
      .where('s.category IS NOT NULL')
      .groupBy('s.category')
      .orderBy('"count"', 'DESC')
      .getRawMany<{ category: string; count: number }>();
    return result;
  }

  private toResponse(s: Snippet) {
    return {
      id: s.id,
      title: s.title,
      description: s.description,
      code: s.code,
      language: s.language,
      category: s.category,
      tags: s.tags,
      projectSlug: s.projectSlug,
      isGenerated: s.isGenerated,
      copyCount: s.copyCount,
      author: s.author
        ? { id: s.author.id, email: s.author.email, name: s.author.name }
        : undefined,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }
}
