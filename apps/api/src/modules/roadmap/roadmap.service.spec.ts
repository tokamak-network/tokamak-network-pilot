import { BadRequestException } from '@nestjs/common';
import { RoadmapService } from './roadmap.service';

type MockRepo = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  createQueryBuilder: jest.Mock;
  update: jest.Mock;
  count: jest.Mock;
};

function createMockRepo(): MockRepo {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((input) => input),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };
}

describe('RoadmapService', () => {
  let service: RoadmapService;

  let projectRepo: MockRepo;
  let projectMemberRepo: MockRepo;
  let projectFeedbackRepo: MockRepo;
  let roadmapItemRepo: MockRepo;
  let taskPromptRepo: MockRepo;

  let llm: {
    chatCompletion: jest.Mock;
    getProvider: jest.Mock;
    getModel: jest.Mock;
  };

  let queue: {
    add: jest.Mock;
  };

  const project = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    slug: 'tokamak-project',
    isPublic: true,
    name: 'Tokamak Project',
  };

  beforeEach(() => {
    projectRepo = createMockRepo();
    projectMemberRepo = createMockRepo();
    projectFeedbackRepo = createMockRepo();
    roadmapItemRepo = createMockRepo();
    taskPromptRepo = createMockRepo();

    llm = {
      chatCompletion: jest.fn(),
      getProvider: jest.fn().mockReturnValue('openai'),
      getModel: jest.fn().mockReturnValue('gpt-4.1-mini'),
    };

    queue = {
      add: jest.fn(),
    };

    service = new RoadmapService(
      projectRepo as any,
      projectMemberRepo as any,
      projectFeedbackRepo as any,
      roadmapItemRepo as any,
      taskPromptRepo as any,
      llm as any,
      queue as any,
    );
  });

  it('redacts sensitive feedback data for viewer role', async () => {
    projectRepo.findOne.mockResolvedValue(project);
    projectMemberRepo.findOne.mockResolvedValue({
      id: 'member-1',
      role: 'viewer',
    });

    const feedbackRows = [
      {
        id: 'f-1',
        projectId: project.id,
        category: 'feature',
        status: 'new',
        title: 'Need better onboarding',
        content: 'Please add a clearer onboarding flow.',
        painLevel: 4,
        persona: 'validator',
        submitterName: 'Alice',
        submitterEmail: 'alice@example.com',
        sourceType: 'public_form',
        sourceUrl: undefined,
        votes: 0,
        moderatorNote: undefined,
        metadata: { ip: '1.2.3.4', userAgent: 'agent' },
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        updatedAt: new Date('2026-02-01T00:00:00.000Z'),
      },
    ];

    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([feedbackRows, 1]),
    };
    projectFeedbackRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.listFeedback(project.slug, 'user-1', {} as any);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].submitterEmail).toBeUndefined();
    expect(result.data[0].metadata).toEqual({});
  });

  it('keeps sensitive feedback data visible for lead role', async () => {
    projectRepo.findOne.mockResolvedValue(project);
    projectMemberRepo.findOne.mockResolvedValue({
      id: 'member-1',
      role: 'lead',
    });

    const feedbackRows = [
      {
        id: 'f-1',
        projectId: project.id,
        category: 'feature',
        status: 'new',
        title: 'Need better onboarding',
        content: 'Please add a clearer onboarding flow.',
        painLevel: 4,
        persona: 'validator',
        submitterName: 'Alice',
        submitterEmail: 'alice@example.com',
        sourceType: 'public_form',
        sourceUrl: undefined,
        votes: 0,
        moderatorNote: undefined,
        metadata: { ip: '1.2.3.4', userAgent: 'agent' },
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        updatedAt: new Date('2026-02-01T00:00:00.000Z'),
      },
    ];

    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([feedbackRows, 1]),
    };
    projectFeedbackRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.listFeedback(project.slug, 'user-1', {} as any);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].submitterEmail).toBe('alice@example.com');
    expect(result.data[0].metadata).toEqual({ ip: '1.2.3.4', userAgent: 'agent' });
  });

  it('rejects duplicate public feedback in dedupe window', async () => {
    projectRepo.findOne.mockResolvedValue(project);

    const dedupeQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(1),
    };
    projectFeedbackRepo.createQueryBuilder.mockReturnValue(dedupeQb);

    await expect(
      service.submitPublicFeedback(
        project.slug,
        {
          content: 'Need better docs',
          submitterEmail: 'alice@example.com',
        } as any,
        { ip: '1.2.3.4' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(projectFeedbackRepo.save).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('enqueues deduped roadmap draft job on public feedback submission', async () => {
    projectRepo.findOne.mockResolvedValue(project);

    const dedupeQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
    };
    projectFeedbackRepo.createQueryBuilder.mockReturnValue(dedupeQb);

    projectFeedbackRepo.save.mockImplementation(async (row) => ({
      ...row,
      id: 'feedback-1',
      createdAt: new Date('2026-02-20T00:00:00.000Z'),
      updatedAt: new Date('2026-02-20T00:00:00.000Z'),
    }));

    queue.add.mockResolvedValue({ id: 'job-1' });

    await service.submitPublicFeedback(
      project.slug,
      {
        content: 'Need better docs',
      } as any,
      { ip: '1.2.3.4', userAgent: 'test-agent' },
    );

    expect(queue.add).toHaveBeenCalledWith(
      'draft-roadmap',
      expect.objectContaining({ projectId: project.id, action: 'draft-roadmap' }),
      expect.objectContaining({
        jobId: `draft-roadmap:${project.id}`,
        delay: 5_000,
      }),
    );
  });

  it('continues draft creation when AI returns invalid feedback IDs', async () => {
    projectRepo.findOne.mockResolvedValue(project);

    projectFeedbackRepo.find
      .mockResolvedValueOnce([
        {
          id: 'fb-1',
          projectId: project.id,
          status: 'new',
          category: 'feature',
          content: 'Need better onboarding',
          painLevel: 4,
          votes: 0,
          createdAt: new Date('2026-02-20T00:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([]);

    roadmapItemRepo.find.mockResolvedValue([]);
    roadmapItemRepo.create.mockImplementation((row) => row);
    roadmapItemRepo.save.mockImplementation(async (row) => ({
      ...row,
      id: 'roadmap-1',
    }));

    jest
      .spyOn(service as any, 'generateRoadmapCandidates')
      .mockResolvedValue([
        {
          title: 'Improve onboarding docs',
          problem: 'Users are blocked in onboarding.',
          priority: 'high',
          effort: 'm',
          feedbackIds: ['11111111-1111-1111-1111-111111111111'],
        },
      ]);

    await expect(
      service.processRoadmapDraftJob({
        action: 'draft-roadmap',
        projectId: project.id,
        maxItems: 5,
      }),
    ).resolves.toBeUndefined();

    expect(roadmapItemRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Improve onboarding docs',
        sourceFeedbackIds: [],
      }),
    );
  });
});
