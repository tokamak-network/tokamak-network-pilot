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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
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
}
