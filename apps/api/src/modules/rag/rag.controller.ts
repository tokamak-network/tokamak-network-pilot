import { Controller, Post, Body, Get, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { RagService } from './rag.service';
import { AskQuestionDto } from './dto/ask-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('ask')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ask')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post()
  @ApiOperation({
    summary: 'Ask a question about Tokamak Network',
    description:
      'Submit a natural-language question and receive a RAG-powered answer with source citations.',
  })
  @ApiBody({ type: AskQuestionDto })
  async ask(@Body() dto: AskQuestionDto) {
    return this.ragService.ask(dto);
  }

  @Post('stream')
  @ApiOperation({
    summary: 'Ask a question with streaming response',
    description:
      'SSE streaming version. Returns events: metadata (sources), chunk (text tokens), done.',
  })
  @ApiBody({ type: AskQuestionDto })
  async askStream(@Body() dto: AskQuestionDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const event of this.ragService.askStream(dto)) {
        if (event.type === 'metadata') {
          res.write(`event: metadata\ndata: ${JSON.stringify(event)}\n\n`);
        } else if (event.type === 'chunk') {
          res.write(`event: chunk\ndata: ${JSON.stringify({ text: event.text })}\n\n`);
        } else if (event.type === 'done') {
          res.write(`event: done\ndata: {}\n\n`);
        }
      }
    } catch (err: any) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
    }
    res.end();
  }

  @Get('search')
  @ApiOperation({
    summary: 'Semantic search across indexed knowledge',
    description:
      'Search the vector store for relevant chunks without generating an LLM answer. Optionally scope to a project.',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results', example: 10 })
  @ApiQuery({ name: 'projectId', required: false, description: 'Scope search to a specific project' })
  async search(
    @Query('q') query: string,
    @Query('limit') limit?: number,
    @Query('projectId') projectId?: string,
  ) {
    return this.ragService.search(query, limit, projectId);
  }
}
