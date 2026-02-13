import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../../entities/conversation.entity';
import { Message } from '../../entities/message.entity';
import { RagService } from '../rag/rag.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { AskInConversationDto } from './dto/ask-in-conversation.dto';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly ragService: RagService,
  ) {}

  /**
   * Create a new conversation.
   */
  async create(dto: CreateConversationDto, userId?: string) {
    const conversation = this.conversationRepo.create({
      title: dto.title || 'New conversation',
      userId: userId || undefined,
    });
    const saved = await this.conversationRepo.save(conversation);
    this.logger.log(`Conversation created: ${saved.id}`);
    return this.toSummary(saved, 0);
  }

  /**
   * List conversations for a user (or all anonymous ones), ordered by most recent activity.
   */
  async list(userId?: string, page = 1, limit = 20) {
    const qb = this.conversationRepo
      .createQueryBuilder('c')
      .loadRelationCountAndMap('c.messageCount', 'c.messages')
      .orderBy('c.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (userId) {
      qb.where('c.userId = :userId', { userId });
    }

    const [conversations, total] = await qb.getManyAndCount();

    // Get last message dates and message counts
    const ids = conversations.map((c) => c.id);
    let messageCounts: Record<string, { count: number; lastAt: Date | null }> = {};

    if (ids.length > 0) {
      const stats = await this.messageRepo
        .createQueryBuilder('m')
        .select('m.conversationId', 'conversationId')
        .addSelect('COUNT(*)::int', 'count')
        .addSelect('MAX(m.createdAt)', 'lastAt')
        .where('m.conversationId IN (:...ids)', { ids })
        .groupBy('m.conversationId')
        .getRawMany();

      messageCounts = Object.fromEntries(
        stats.map((s) => [s.conversationId, { count: s.count, lastAt: s.lastAt }]),
      );
    }

    return {
      data: conversations.map((c) => {
        const stats = messageCounts[c.id];
        return this.toSummary(c, stats?.count ?? 0, stats?.lastAt ?? undefined);
      }),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  /**
   * Get a single conversation with all its messages.
   */
  async findOne(id: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id },
      relations: ['messages'],
      order: { messages: { createdAt: 'ASC' } },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    return {
      id: conversation.id,
      title: conversation.title,
      userId: conversation.userId,
      messageCount: conversation.messages.length,
      lastMessageAt: conversation.messages.length > 0
        ? conversation.messages[conversation.messages.length - 1].createdAt.toISOString()
        : undefined,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        role: m.role,
        content: m.content,
        sources: m.sources,
        confidence: m.confidence,
        provider: m.provider,
        model: m.model,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Update conversation title.
   */
  async update(id: string, dto: UpdateConversationDto) {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    conversation.title = dto.title;
    const saved = await this.conversationRepo.save(conversation);

    const count = await this.messageRepo.count({ where: { conversationId: id } });
    return this.toSummary(saved, count);
  }

  /**
   * Delete a conversation and all its messages (cascade).
   */
  async remove(id: string) {
    const conversation = await this.conversationRepo.findOne({ where: { id } });
    if (!conversation) {
      throw new NotFoundException(`Conversation ${id} not found`);
    }

    await this.conversationRepo.remove(conversation);
    this.logger.log(`Conversation deleted: ${id}`);
    return { message: `Conversation ${id} deleted` };
  }

  /**
   * Ask a question within a conversation.
   * - Loads conversation history from DB
   * - Passes it to the RAG pipeline
   * - Saves both user message and assistant response
   * - Auto-generates title from first question
   */
  async askInConversation(conversationId: string, dto: AskInConversationDto, userId?: string) {
    // 1. Load or create conversation
    let conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    // 2. Load existing messages for context
    const existingMessages = await this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });

    // 3. Build conversation history for RAG
    const conversationHistory = existingMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 4. Save user message
    const userMessage = this.messageRepo.create({
      conversationId,
      role: 'user' as const,
      content: dto.question,
    });
    const savedUserMsg = await this.messageRepo.save(userMessage);

    // 5. Call RAG with conversation history
    const ragResult = await this.ragService.ask({
      question: dto.question,
      filters: dto.filters,
      conversationHistory,
    });

    // 6. Save assistant message
    const assistantMessage = this.messageRepo.create({
      conversationId,
      role: 'assistant' as const,
      content: ragResult.answer,
      sources: ragResult.sources,
      confidence: ragResult.confidence,
      provider: ragResult.provider,
      model: ragResult.model,
    });
    const savedAssistantMsg = await this.messageRepo.save(assistantMessage);

    // 7. Auto-generate title from first question if still default
    if (conversation.title === 'New conversation') {
      conversation.title = this.generateTitle(dto.question);
      await this.conversationRepo.save(conversation);
    } else {
      // Touch updatedAt
      await this.conversationRepo.update(conversationId, {});
    }

    this.logger.log(
      `Message added to conversation ${conversationId}: "${dto.question.slice(0, 50)}..."`,
    );

    return {
      conversationId,
      userMessage: {
        id: savedUserMsg.id,
        conversationId,
        role: savedUserMsg.role,
        content: savedUserMsg.content,
        sources: undefined,
        confidence: undefined,
        provider: undefined,
        model: undefined,
        createdAt: savedUserMsg.createdAt.toISOString(),
      },
      assistantMessage: {
        id: savedAssistantMsg.id,
        conversationId,
        role: savedAssistantMsg.role,
        content: savedAssistantMsg.content,
        sources: savedAssistantMsg.sources,
        confidence: savedAssistantMsg.confidence,
        provider: savedAssistantMsg.provider,
        model: savedAssistantMsg.model,
        createdAt: savedAssistantMsg.createdAt.toISOString(),
      },
    };
  }

  /**
   * Quick-ask: create a conversation + ask in one step.
   */
  async quickAsk(dto: AskInConversationDto, userId?: string) {
    const conversation = this.conversationRepo.create({
      title: this.generateTitle(dto.question),
      userId: userId || undefined,
    });
    const saved = await this.conversationRepo.save(conversation);

    return this.askInConversation(saved.id, dto, userId);
  }

  // ───── Helpers ─────

  private generateTitle(question: string): string {
    // Trim to first sentence or 60 chars, whichever is shorter
    const firstSentence = question.split(/[.!?]\s/)[0];
    if (firstSentence.length <= 60) return firstSentence;
    return firstSentence.slice(0, 57) + '...';
  }

  private toSummary(
    c: Conversation,
    messageCount: number,
    lastMessageAt?: Date,
  ) {
    return {
      id: c.id,
      title: c.title,
      userId: c.userId,
      messageCount,
      lastMessageAt: lastMessageAt?.toISOString(),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}
