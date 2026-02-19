import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { AskInConversationDto } from './dto/ask-in-conversation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new conversation',
    description: 'Start a new conversation thread. Optionally provide a title.',
  })
  async create(@Body() dto: CreateConversationDto, @Req() req: any) {
    return this.service.create(dto, req.user?.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List conversations',
    description: 'List all conversations for the authenticated user, ordered by most recent.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async list(
    @Req() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.list(req.user?.id, page, limit);
  }

  // ── Static routes MUST come before parameterized `:id` routes ──

  @Post('quick-ask')
  @ApiOperation({
    summary: 'Quick ask — creates a new conversation and asks a question in one step',
    description:
      'Convenience endpoint: creates a new conversation, asks the question, saves both messages, and auto-generates a title.',
  })
  async quickAsk(@Body() dto: AskInConversationDto, @Req() req: any) {
    return this.service.quickAsk(dto, req.user?.id);
  }

  @Post('quick-ask/stream')
  @ApiOperation({
    summary: 'Quick ask with streaming — creates a conversation and streams the answer',
    description:
      'SSE streaming version of quick-ask. Returns events: metadata (sources), chunk (text tokens), done (assistant message ID).',
  })
  async quickAskStream(
    @Body() dto: AskInConversationDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const chunk of this.service.quickAskStream(dto, req.user?.id)) {
        res.write(chunk);
      }
    } catch (err: any) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
    }
    res.end();
  }

  // ── Parameterized routes ──

  @Get(':id')
  @ApiOperation({
    summary: 'Get conversation with messages',
    description: 'Retrieve a conversation and all its messages in chronological order.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update conversation',
    description: 'Update the title of a conversation.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateConversationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete conversation',
    description: 'Delete a conversation and all its messages.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/ask')
  @ApiOperation({
    summary: 'Ask a question within a conversation',
    description:
      'Send a question in an existing conversation. The full conversation history is automatically included as context for the RAG pipeline.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async askInConversation(
    @Param('id') id: string,
    @Body() dto: AskInConversationDto,
    @Req() req: any,
  ) {
    return this.service.askInConversation(id, dto, req.user?.id);
  }

  @Post(':id/ask/stream')
  @ApiOperation({
    summary: 'Ask a question within a conversation with streaming',
    description:
      'SSE streaming version. Returns events: metadata (sources), chunk (text tokens), done (assistant message ID).',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  async askInConversationStream(
    @Param('id') id: string,
    @Body() dto: AskInConversationDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const chunk of this.service.askInConversationStream(id, dto, req.user?.id)) {
        res.write(chunk);
      }
    } catch (err: any) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
    }
    res.end();
  }
}
