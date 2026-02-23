import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Feedback } from '../../entities/feedback.entity';
import { Message } from '../../entities/message.entity';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @InjectRepository(Feedback)
    private readonly feedbackRepo: Repository<Feedback>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  async submit(dto: SubmitFeedbackDto, userId: string) {
    const message = await this.messageRepo.findOne({ where: { id: dto.messageId } });
    if (!message) {
      throw new NotFoundException(`Message ${dto.messageId} not found`);
    }
    if (message.role !== 'assistant') {
      throw new BadRequestException('Feedback can only be given on assistant messages');
    }

    const existing = await this.feedbackRepo.findOne({
      where: { messageId: dto.messageId, userId },
    });

    if (existing) {
      existing.rating = dto.rating;
      existing.comment = dto.comment ?? existing.comment;
      const saved = await this.feedbackRepo.save(existing);
      this.logger.log(`Feedback updated: ${saved.id} [${dto.rating}]`);
      return this.toResponse(saved);
    }

    const feedback = this.feedbackRepo.create({
      messageId: dto.messageId,
      userId,
      rating: dto.rating,
      comment: dto.comment,
    });
    const saved = await this.feedbackRepo.save(feedback);
    this.logger.log(`Feedback submitted: ${saved.id} [${dto.rating}]`);
    return this.toResponse(saved);
  }

  async getForMessage(messageId: string, userId: string) {
    const feedback = await this.feedbackRepo.findOne({
      where: { messageId, userId },
    });
    return feedback ? this.toResponse(feedback) : null;
  }

  async stats() {
    const total = await this.feedbackRepo.count();
    const upCount = await this.feedbackRepo.count({ where: { rating: 'up' } });
    const downCount = await this.feedbackRepo.count({ where: { rating: 'down' } });

    const recentNegative = await this.feedbackRepo.find({
      where: { rating: 'down' },
      order: { createdAt: 'DESC' },
      take: 10,
      relations: ['message'],
    });

    return {
      total,
      upCount,
      downCount,
      satisfactionRate: total > 0 ? Math.round((upCount / total) * 100) : null,
      recentNegative: recentNegative.map((f) => ({
        id: f.id,
        messageId: f.messageId,
        comment: f.comment,
        messagePreview: f.message?.content?.slice(0, 200),
        createdAt: f.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Returns the most frequently asked user questions from conversation history,
   * optionally enriched with curated suggestions.
   */
  async suggestedQuestions(limit = 6) {
    const popularQueries = await this.messageRepo
      .createQueryBuilder('m')
      .select('m.content', 'question')
      .addSelect('COUNT(*)::int', 'count')
      .where('m.role = :role', { role: 'user' })
      .andWhere('LENGTH(m.content) > 10')
      .andWhere('LENGTH(m.content) < 200')
      .groupBy('m.content')
      .orderBy('"count"', 'DESC')
      .limit(limit * 3)
      .getRawMany<{ question: string; count: number }>();

    const curatedSuggestions = [
      'How does TON staking work?',
      'What is the Tokamak Network architecture?',
      'How do I deploy a rollup on Tokamak?',
      'What are the differences between Titan and Thanos?',
      'How does the Tokamak bridge work?',
      'What is TON tokenomics?',
    ];

    const seen = new Set<string>();
    const results: Array<{ question: string; source: 'popular' | 'curated' }> = [];

    for (const q of popularQueries) {
      const normalized = q.question.trim().toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      results.push({ question: q.question.trim(), source: 'popular' });
      if (results.length >= limit) break;
    }

    if (results.length < limit) {
      for (const q of curatedSuggestions) {
        const normalized = q.toLowerCase();
        if (seen.has(normalized)) continue;
        seen.add(normalized);
        results.push({ question: q, source: 'curated' });
        if (results.length >= limit) break;
      }
    }

    return { suggestions: results };
  }

  private toResponse(f: Feedback) {
    return {
      id: f.id,
      messageId: f.messageId,
      userId: f.userId,
      rating: f.rating,
      comment: f.comment,
      createdAt: f.createdAt.toISOString(),
    };
  }
}
