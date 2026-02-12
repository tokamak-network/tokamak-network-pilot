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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiSecurity,
  ApiQuery,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeyGuard } from '../api-keys/guards/api-key.guard';
import { ApiKeyThrottlerGuard } from '../api-keys/guards/api-key-throttler.guard';
import { Scopes } from '../api-keys/decorators/scopes.decorator';
import { RagService } from '../rag/rag.service';
import { SourcesService } from '../sources/sources.service';
import { ContentService } from '../content/content.service';
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

  @Get('search')
  @Scopes('search')
  @ApiOperation({
    summary: 'Semantic search across indexed knowledge',
    description:
      'Search the vector store for relevant chunks without generating an LLM answer. Requires the `search` scope.',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results', example: 10 })
  @ApiResponse({ status: 200, description: 'Search results returned' })
  async search(
    @Query('q') query: string,
    @Query('limit') limit?: number,
  ) {
    return this.ragService.search(query, limit ? Number(limit) : undefined);
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
