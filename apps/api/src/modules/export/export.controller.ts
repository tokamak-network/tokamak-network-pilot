import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Res,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ExportService, ExportFormat } from './export.service';

@ApiTags('export')
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('content/:id')
  @ApiOperation({
    summary: 'Export a content entry as JSON or Markdown',
    description:
      'Download a curated content entry in the specified format for use in other tools or AI workflows.',
  })
  @ApiParam({ name: 'id', description: 'Content entry ID' })
  @ApiQuery({
    name: 'format',
    enum: ['json', 'markdown'],
    required: false,
    description: 'Export format (default: json)',
  })
  async exportContent(
    @Param('id') id: string,
    @Query('format') format: string = 'json',
    @Res() res: Response,
  ) {
    const fmt = this.validateFormat(format);
    const result = await this.exportService.exportContent(id, fmt);
    this.sendExport(res, result);
  }

  @Get('project/:idOrSlug')
  @ApiOperation({
    summary: 'Export a project as JSON or Markdown',
    description:
      'Download a project summary with team, sources, and metadata in the specified format.',
  })
  @ApiParam({ name: 'idOrSlug', description: 'Project ID or slug' })
  @ApiQuery({
    name: 'format',
    enum: ['json', 'markdown'],
    required: false,
    description: 'Export format (default: json)',
  })
  async exportProject(
    @Param('idOrSlug') idOrSlug: string,
    @Query('format') format: string = 'json',
    @Res() res: Response,
  ) {
    const fmt = this.validateFormat(format);
    const result = await this.exportService.exportProject(idOrSlug, fmt);
    this.sendExport(res, result);
  }

  @Post('answer')
  @ApiOperation({
    summary: 'Export a RAG answer as JSON or Markdown',
    description:
      'Format a RAG answer with sources and confidence for export or AI consumption.',
  })
  @ApiQuery({
    name: 'format',
    enum: ['json', 'markdown'],
    required: false,
    description: 'Export format (default: json)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        answer: { type: 'string' },
        sources: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              url: { type: 'string' },
              score: { type: 'number' },
            },
          },
        },
        confidence: { type: 'number' },
      },
      required: ['question', 'answer', 'sources', 'confidence'],
    },
  })
  exportAnswer(
    @Body()
    body: {
      question: string;
      answer: string;
      sources: Array<{ title: string; url: string; score: number }>;
      confidence: number;
    },
    @Query('format') format: string = 'json',
    @Res() res: Response,
  ) {
    const fmt = this.validateFormat(format);
    const result = this.exportService.exportAnswer(body, fmt);
    this.sendExport(res, result);
  }

  @Post('prompt')
  @ApiOperation({
    summary: 'Format content as an AI-ready prompt',
    description:
      'Takes content (answer, content entry, or project summary) and formats it as a structured prompt ' +
      'with context, sources, and instructions — ready to paste into any AI assistant.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['answer', 'content', 'project'] },
        title: { type: 'string' },
        body: { type: 'string' },
        sources: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              url: { type: 'string' },
            },
          },
        },
        metadata: { type: 'object' },
      },
      required: ['type', 'body'],
    },
  })
  formatAsPrompt(
    @Body()
    body: {
      type: 'answer' | 'content' | 'project';
      title?: string;
      body: string;
      sources?: Array<{ title: string; url: string }>;
      metadata?: Record<string, unknown>;
    },
  ) {
    const prompt = this.exportService.formatAsAiPrompt(body);
    return { prompt };
  }

  // ─── Helpers ───────────────────────────────────────────

  private validateFormat(format: string): ExportFormat {
    const normalized = format?.toLowerCase() || 'json';
    if (normalized === 'json' || normalized === 'markdown' || normalized === 'md') {
      return normalized === 'md' ? 'markdown' : (normalized as ExportFormat);
    }
    throw new BadRequestException(
      `Invalid format "${format}". Supported: json, markdown`,
    );
  }

  private sendExport(
    res: Response,
    result: { data: string; contentType: string; filename: string },
  ) {
    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.data);
  }
}
