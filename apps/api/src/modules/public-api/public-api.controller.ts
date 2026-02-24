import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiSecurity,
  ApiQuery,
  ApiBody,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ApiKeyGuard } from '../api-keys/guards/api-key.guard';
import { ApiKeyThrottlerGuard } from '../api-keys/guards/api-key-throttler.guard';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { Scopes } from '../api-keys/decorators/scopes.decorator';
import { RagService } from '../rag/rag.service';
import { SourcesService } from '../sources/sources.service';
import { ContentService } from '../content/content.service';
import { ProjectsService } from '../projects/projects.service';
import { AskQuestionDto } from '../rag/dto/ask-question.dto';
import { UsageLoggingInterceptor } from './usage-logging.interceptor';

@ApiTags('public')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard, ApiKeyThrottlerGuard)
@UseInterceptors(UsageLoggingInterceptor)
@Controller('public')
export class PublicApiController {
  constructor(
    private readonly ragService: RagService,
    private readonly sourcesService: SourcesService,
    private readonly contentService: ContentService,
    private readonly projectsService: ProjectsService,
    private readonly apiKeysService: ApiKeysService,
  ) {}

  // ─── RAG ──────────────────────────────────────────────────

  @Post('ask')
  @Scopes('ask')
  @ApiOperation({
    summary: 'Ask a question about Tokamak Network',
    description:
      'Submit a natural-language question and receive a RAG-powered answer with source citations. Requires the `ask` scope.',
  })
  @ApiBody({ type: AskQuestionDto })
  @ApiResponse({ status: 200, description: 'Answer with citations returned' })
  @ApiResponse({ status: 401, description: 'Invalid or missing API key' })
  @ApiResponse({ status: 403, description: 'API key missing required scope' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async ask(@Body() dto: AskQuestionDto) {
    return this.ragService.ask(dto);
  }

  @Post('ask/stream')
  @Scopes('ask')
  @ApiOperation({
    summary: 'Ask a question with streaming response (SSE)',
    description:
      'Submit a question and receive the answer as a Server-Sent Events stream. ' +
      'Events: `metadata` (sources, confidence, provider), `chunk` (text token), `done` (completion signal), `error`. ' +
      'Requires the `ask` scope.',
  })
  @ApiBody({ type: AskQuestionDto })
  @ApiResponse({ status: 200, description: 'SSE stream of answer tokens' })
  @ApiResponse({ status: 401, description: 'Invalid or missing API key' })
  @ApiResponse({ status: 403, description: 'API key missing required scope' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async askStream(
    @Body() dto: AskQuestionDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const start = Date.now();

    try {
      for await (const event of this.ragService.askStream(dto)) {
        if (event.type === 'metadata') {
          res.write(`event: metadata\ndata: ${JSON.stringify({
            sources: event.sources,
            confidence: event.confidence,
            provider: event.provider,
            model: event.model,
          })}\n\n`);
        } else if (event.type === 'chunk') {
          res.write(`event: chunk\ndata: ${JSON.stringify({ text: event.text })}\n\n`);
        } else if (event.type === 'done') {
          res.write(`event: done\ndata: {}\n\n`);
        }
      }
    } catch (err: any) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
    }

    // Log usage for the streaming request (interceptor is bypassed with @Res)
    const apiKey = (req as any).apiKey;
    if (apiKey) {
      this.apiKeysService.logUsage({
        apiKeyId: apiKey.id,
        endpoint: req.path,
        method: req.method,
        statusCode: 200,
        responseTimeMs: Date.now() - start,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      }).catch(() => {});
    }

    res.end();
  }

  @Get('search')
  @Scopes('search')
  @ApiOperation({
    summary: 'Semantic search across indexed knowledge',
    description:
      'Search the vector store for relevant chunks without generating an LLM answer. Requires the `search` scope.',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results', example: 10 })
  @ApiQuery({ name: 'projectId', required: false, description: 'Scope search to a project by ID' })
  @ApiQuery({ name: 'projectSlug', required: false, description: 'Scope search to a project by slug' })
  @ApiResponse({ status: 200, description: 'Search results returned' })
  async search(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Query('projectId') projectId?: string,
    @Query('projectSlug') projectSlug?: string,
  ) {
    let resolvedProjectId = projectId ?? undefined;
    if (projectSlug && !resolvedProjectId) {
      resolvedProjectId =
        (await this.projectsService.resolveProjectId(projectSlug)) ?? undefined;
    }
    return this.ragService.search(
      query,
      limit ? Number(limit) : undefined,
      resolvedProjectId,
    );
  }

  // ─── Projects ────────────────────────────────────────

  @Get('projects')
  @Scopes('projects:read')
  @ApiOperation({
    summary: 'List public projects',
    description:
      'List projects that are marked public, with optional pagination and filters. Requires the `projects:read` scope.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page (1-based)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (max 100)' })
  @ApiQuery({ name: 'slug', required: false, description: 'Filter by exact slug' })
  @ApiQuery({ name: 'search', required: false, description: 'Search in name, slug, description' })
  @ApiResponse({ status: 200, description: 'Paginated list of projects' })
  async listProjects(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('slug') slug?: string,
    @Query('search') search?: string,
  ) {
    return this.projectsService.findAllPublic({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      slug,
      search,
    });
  }

  @Get('projects/:idOrSlug')
  @Scopes('projects:read')
  @ApiOperation({
    summary: 'Get a project by ID or slug',
    description: 'Returns project details by UUID or slug. Requires the `projects:read` scope.',
  })
  @ApiParam({ name: 'idOrSlug', description: 'Project UUID or slug' })
  @ApiResponse({ status: 200, description: 'Project details' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProject(@Param('idOrSlug') idOrSlug: string) {
    return this.projectsService.findOne(idOrSlug);
  }

  // ─── Sources ──────────────────────────────────────────────

  @Get('sources')
  @Scopes('sources:read')
  @ApiOperation({
    summary: 'List all knowledge sources',
    description:
      'Returns all registered knowledge sources (GitHub repos, docs, etc.). Requires the `sources:read` scope.',
  })
  @ApiResponse({ status: 200, description: 'List of sources' })
  async listSources() {
    return this.sourcesService.findAll();
  }

  @Get('sources/:id')
  @Scopes('sources:read')
  @ApiOperation({
    summary: 'Get details of a specific source',
    description: 'Returns source details with document statistics. Requires the `sources:read` scope.',
  })
  @ApiResponse({ status: 200, description: 'Source details' })
  @ApiResponse({ status: 404, description: 'Source not found' })
  async getSource(@Param('id') id: string) {
    return this.sourcesService.findOne(id);
  }

  // ─── Content ──────────────────────────────────────────────

  @Get('content')
  @Scopes('content:read')
  @ApiOperation({
    summary: 'Browse curated content entries',
    description:
      'List team-curated content entries (project overviews, FAQs, guides). Requires the `content:read` scope.',
  })
  @ApiQuery({ name: 'project', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated content entries' })
  async listContent(
    @Query('project') project?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.contentService.findAll({ project, category, page, limit });
  }

  @Get('content/:id')
  @Scopes('content:read')
  @ApiOperation({
    summary: 'Get a specific content entry',
    description: 'Retrieve a single content entry by ID. Requires the `content:read` scope.',
  })
  @ApiResponse({ status: 200, description: 'Content entry' })
  @ApiResponse({ status: 404, description: 'Content entry not found' })
  async getContent(@Param('id') id: string) {
    return this.contentService.findOne(id);
  }

  // ─── Health ───────────────────────────────────────────────

  @Get('health')
  @ApiOperation({
    summary: 'Public API health check',
    description: 'Simple health check that verifies the API key is valid. No scope required.',
  })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  async health(@Req() req: Request) {
    const apiKey = (req as any).apiKey;
    return {
      status: 'ok',
      keyPrefix: apiKey?.keyPrefix,
      tier: apiKey?.tier,
      rateLimit: apiKey?.rateLimit,
    };
  }
}
