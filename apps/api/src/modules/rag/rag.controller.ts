import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { RagService } from './rag.service';
import { AskQuestionDto } from './dto/ask-question.dto';

@ApiTags('ask')
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
      'Search the vector store for relevant chunks without generating an LLM answer.',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results', example: 10 })
  async search(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.ragService.search(query, limit);
  }
}
