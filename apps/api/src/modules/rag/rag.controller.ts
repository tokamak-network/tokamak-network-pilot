import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
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
