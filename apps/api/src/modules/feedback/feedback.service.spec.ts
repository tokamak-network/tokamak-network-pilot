import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FeedbackService } from './feedback.service';

type Repo = {
  findOne: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  count: jest.Mock;
  find: jest.Mock;
  createQueryBuilder: jest.Mock;
};

function repo(): Repo {
  return {
    findOne: jest.fn(),
    save: jest.fn(async (v) => v),
    create: jest.fn((v) => v),
    count: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

describe('FeedbackService', () => {
  let feedbackRepo: Repo;
  let messageRepo: Repo;
  let service: FeedbackService;

  beforeEach(() => {
    feedbackRepo = repo();
    messageRepo = repo();
    service = new FeedbackService(feedbackRepo as any, messageRepo as any);
  });

  it('rejects feedback for missing message', async () => {
    messageRepo.findOne.mockResolvedValue(null);

    await expect(
      service.submit({ messageId: 'm1', rating: 'up' } as any, 'u1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects feedback for non-assistant message', async () => {
    messageRepo.findOne.mockResolvedValue({ id: 'm1', role: 'user' });

    await expect(
      service.submit({ messageId: 'm1', rating: 'up' } as any, 'u1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates existing feedback instead of creating duplicate', async () => {
    messageRepo.findOne.mockResolvedValue({ id: 'm1', role: 'assistant' });
    feedbackRepo.findOne.mockResolvedValue({
      id: 'f1',
      messageId: 'm1',
      userId: 'u1',
      rating: 'up',
      comment: 'old',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.submit(
      { messageId: 'm1', rating: 'down', comment: 'new' } as any,
      'u1',
    );

    expect(feedbackRepo.create).not.toHaveBeenCalled();
    expect(feedbackRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 'down', comment: 'new' }),
    );
    expect(result.rating).toBe('down');
  });

  it('creates new feedback when none exists', async () => {
    messageRepo.findOne.mockResolvedValue({ id: 'm1', role: 'assistant' });
    feedbackRepo.findOne.mockResolvedValue(null);
    feedbackRepo.save.mockResolvedValue({
      id: 'f1',
      messageId: 'm1',
      userId: 'u1',
      rating: 'up',
      comment: 'nice',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.submit(
      { messageId: 'm1', rating: 'up', comment: 'nice' } as any,
      'u1',
    );

    expect(feedbackRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ messageId: 'm1', userId: 'u1', rating: 'up' }),
    );
    expect(result.id).toBe('f1');
  });

  it('gets feedback for message or returns null', async () => {
    feedbackRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.getForMessage('m1', 'u1')).resolves.toBeNull();

    feedbackRepo.findOne.mockResolvedValueOnce({
      id: 'f1',
      messageId: 'm1',
      userId: 'u1',
      rating: 'up',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(service.getForMessage('m1', 'u1')).resolves.toEqual(
      expect.objectContaining({ id: 'f1', messageId: 'm1', rating: 'up' }),
    );
  });

  it('returns aggregate stats and recent negative previews', async () => {
    feedbackRepo.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1);
    feedbackRepo.find.mockResolvedValue([
      {
        id: 'f1',
        messageId: 'm1',
        comment: 'not great',
        message: { content: 'x'.repeat(500) },
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
      },
    ]);

    const stats = await service.stats();

    expect(stats.total).toBe(5);
    expect(stats.upCount).toBe(4);
    expect(stats.downCount).toBe(1);
    expect(stats.satisfactionRate).toBe(80);
    expect(stats.recentNegative[0].messagePreview).toHaveLength(200);
  });

  it('builds suggested questions from popular + curated fallback', async () => {
    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        { question: 'How does TON staking work?', count: 10 },
        { question: ' How does TON staking work? ', count: 9 },
        { question: 'What is Tokamak Network architecture?', count: 8 },
      ]),
    };

    messageRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.suggestedQuestions(4);

    expect(result.suggestions).toHaveLength(4);
    expect(result.suggestions[0]).toEqual({
      question: 'How does TON staking work?',
      source: 'popular',
    });
    expect(result.suggestions.some((s) => s.source === 'curated')).toBe(true);
  });
});
