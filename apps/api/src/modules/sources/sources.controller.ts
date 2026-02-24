import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { SourcesService } from './sources.service';
import { CreateSourceDto, UpdateSourceDto } from './dto/create-source.dto';
import { CrawlWebsiteDto } from './dto/crawl-website.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('sources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Post('crawl')
  @ApiOperation({
    summary: 'Crawl a website and add it as a knowledge source',
    description:
      'Submits a URL for crawling. Creates a website source and enqueues a background job to fetch pages, extract text, and index into the RAG pipeline. Returns the new source and job ID.',
  })
  @ApiBody({ type: CrawlWebsiteDto })
  async crawlWebsite(@Body() dto: CrawlWebsiteDto) {
    return this.sourcesService.crawlWebsite(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all registered knowledge sources' })
  async findAll() {
    return this.sourcesService.findAll();
  }

  @Get('status')
  @ApiOperation({
    summary: 'Ingestion status dashboard',
    description:
      'Returns per-repo ingestion status with document counts, fetch breakdowns, errors, and an overall summary.',
  })
  async getIngestionStatus() {
    return this.sourcesService.getIngestionStatus();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific source with document stats' })
  async findOne(@Param('id') id: string) {
    return this.sourcesService.findOne(id);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'List documents ingested for a source' })
  @ApiQuery({ name: 'contentType', required: false, description: 'Filter by content type (readme, issue, pull_request, code, wiki, documentation)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Results per page', example: 50 })
  async findDocuments(
    @Param('id') id: string,
    @Query('contentType') contentType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.sourcesService.findDocuments(
      id,
      contentType,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  @Post(':id/summary')
  @ApiOperation({
    summary: 'Generate an AI summary of what was ingested for this source',
    description: 'Uses the configured LLM to analyze the ingested documents and produce a structured summary of the source content.',
  })
  async generateSummary(@Param('id') id: string) {
    return this.sourcesService.generateSummary(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Register a new knowledge source',
    description:
      'Add a GitHub repo, documentation URL, file upload, or other source type to the indexing pipeline. Automatically triggers ingestion.',
  })
  @ApiBody({ type: CreateSourceDto })
  async create(@Body() dto: CreateSourceDto) {
    return this.sourcesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a knowledge source configuration' })
  @ApiBody({ type: UpdateSourceDto })
  async update(@Param('id') id: string, @Body() dto: UpdateSourceDto) {
    return this.sourcesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a knowledge source and its indexed data' })
  async remove(@Param('id') id: string) {
    return this.sourcesService.remove(id);
  }

  @Post(':id/sync')
  @ApiOperation({
    summary: 'Trigger light re-indexing (markdown/docs only)',
    description: 'Re-fetches README and all markdown files for this source.',
  })
  async sync(@Param('id') id: string) {
    return this.sourcesService.sync(id, 'light');
  }

  @Post(':id/sync-full')
  @ApiOperation({
    summary: 'Trigger deep re-indexing (everything)',
    description:
      'Re-fetches all content: README, markdown, source code, issues, PRs, wiki. Use this for individual repos when you need full coverage.',
  })
  async syncFull(@Param('id') id: string) {
    return this.sourcesService.sync(id, 'full');
  }
}
