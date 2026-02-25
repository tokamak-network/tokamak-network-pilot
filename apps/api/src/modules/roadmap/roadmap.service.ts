import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash } from 'crypto';
import { In, Repository } from 'typeorm';
import { Project } from '../../entities/project.entity';
import { ProjectMember, ProjectRole } from '../../entities/project-member.entity';
import {
  ProjectFeedback,
  ProjectFeedbackCategory,
  ProjectFeedbackStatus,
} from '../../entities/project-feedback.entity';
import {
  RoadmapEffort,
  RoadmapItem,
  RoadmapPriority,
  RoadmapStatus,
} from '../../entities/roadmap-item.entity';
import { RoadmapTaskPrompt } from '../../entities/roadmap-task-prompt.entity';
import { LlmService } from '../llm/llm.service';
import {
  AiRoadmapCandidate,
  AiRoadmapDraft,
  AiTaskPromptPayload,
  CreateRoadmapItemDto,
  GenerateTaskPromptDto,
  ListRoadmapItemsDto,
  ListTaskPromptsDto,
  UpdateRoadmapItemDto,
} from './dto/roadmap.dto';
import {
  ListPublicProjectFeedbackDto,
  ListProjectFeedbackDto,
  SubmitPublicFeedbackDto,
  UpdateProjectFeedbackDto,
} from './dto/submit-public-feedback.dto';
import {
  ROADMAP_INTELLIGENCE_QUEUE,
  RoadmapDraftJobData,
} from './roadmap.queue';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FEEDBACK_STATUSES: ProjectFeedbackStatus[] = [
  'new',
  'reviewed',
  'planned',
  'rejected',
];
const ROADMAP_PRIORITIES: RoadmapPriority[] = [
  'low',
  'medium',
  'high',
  'critical',
];
const ROADMAP_EFFORTS: RoadmapEffort[] = ['xs', 's', 'm', 'l', 'xl'];
const ROADMAP_STATUSES: RoadmapStatus[] = [
  'proposed',
  'approved',
  'planned',
  'in_progress',
  'completed',
  'rejected',
];
const FEEDBACK_DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const MAX_PUBLIC_FEEDBACK_ROWS = 50;
const MAX_PUBLIC_VOTER_TRACKERS = 3000;

@Injectable()
export class RoadmapService {
  private readonly logger = new Logger(RoadmapService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepo: Repository<ProjectMember>,
    @InjectRepository(ProjectFeedback)
    private readonly projectFeedbackRepo: Repository<ProjectFeedback>,
    @InjectRepository(RoadmapItem)
    private readonly roadmapItemRepo: Repository<RoadmapItem>,
    @InjectRepository(RoadmapTaskPrompt)
    private readonly taskPromptRepo: Repository<RoadmapTaskPrompt>,
    private readonly llm: LlmService,
    @InjectQueue(ROADMAP_INTELLIGENCE_QUEUE)
    private readonly roadmapQueue: Queue<RoadmapDraftJobData>,
  ) {}

  // ───────────────────── Phase 1: Public Feedback Inbox ─────────────────────

  async submitPublicFeedback(
    projectSlug: string,
    dto: SubmitPublicFeedbackDto,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const project = await this.projectRepo.findOne({
      where: { slug: projectSlug, isPublic: true },
    });
    if (!project) {
      throw new NotFoundException(`Public project "${projectSlug}" not found`);
    }

    const content = dto.content.trim();
    await this.enforceFeedbackDedupe(project.id, content, {
      ip: meta?.ip,
      submitterEmail: dto.submitterEmail?.trim().toLowerCase(),
    });

    const feedback = this.projectFeedbackRepo.create({
      projectId: project.id,
      category: dto.category ?? 'other',
      status: 'new',
      title: dto.title?.trim(),
      content,
      painLevel: dto.painLevel,
      persona: dto.persona?.trim(),
      submitterName: dto.submitterName?.trim(),
      submitterEmail: dto.submitterEmail?.trim().toLowerCase(),
      sourceType: 'public_form',
      sourceUrl: dto.sourceUrl,
      metadata: {
        ip: meta?.ip,
        userAgent: meta?.userAgent?.slice(0, 300),
      },
    });

    const saved = await this.projectFeedbackRepo.save(feedback);

    await this.roadmapQueue.add(
      'draft-roadmap',
      {
        action: 'draft-roadmap',
        projectId: project.id,
        maxItems: 5,
      },
      {
        jobId: `draft-roadmap:${project.id}`,
        delay: 5_000,
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );

    return {
      message: 'Feedback submitted successfully',
      feedback: this.serializeFeedback(saved),
    };
  }

  async listPublicFeedback(
    projectSlug: string,
    query: ListPublicProjectFeedbackDto,
  ) {
    const project = await this.projectRepo.findOne({
      where: { slug: projectSlug, isPublic: true },
    });
    if (!project) {
      throw new NotFoundException(`Public project "${projectSlug}" not found`);
    }

    const limit = Math.min(
      MAX_PUBLIC_FEEDBACK_ROWS,
      Math.max(1, query.limit ?? 10),
    );
    const sort = query.sort ?? 'top';

    const qb = this.projectFeedbackRepo
      .createQueryBuilder('feedback')
      .where('feedback.projectId = :projectId', { projectId: project.id })
      .andWhere('feedback.status IN (:...statuses)', {
        statuses: ['new', 'reviewed', 'planned'],
      })
      .take(limit);

    if (query.category) {
      qb.andWhere('feedback.category = :category', { category: query.category });
    }

    if (sort === 'latest') {
      qb.orderBy('feedback.createdAt', 'DESC');
    } else {
      qb
        .orderBy('feedback.votes', 'DESC')
        .addOrderBy('feedback.painLevel', 'DESC')
        .addOrderBy('feedback.createdAt', 'DESC');
    }

    const rows = await qb.getMany();

    return {
      data: rows.map((row) => this.serializePublicFeedback(row)),
      total: rows.length,
      limit,
      sort,
    };
  }

  async votePublicFeedback(
    projectSlug: string,
    feedbackId: string,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const project = await this.projectRepo.findOne({
      where: { slug: projectSlug, isPublic: true },
    });
    if (!project) {
      throw new NotFoundException(`Public project "${projectSlug}" not found`);
    }

    const feedback = await this.projectFeedbackRepo.findOne({
      where: {
        id: feedbackId,
        projectId: project.id,
      },
    });
    if (!feedback || feedback.status === 'rejected') {
      throw new NotFoundException(
        `Public feedback "${feedbackId}" not found for project "${projectSlug}"`,
      );
    }

    const tracker = this.createPublicVoteTracker(project.id, meta);
    const existingTrackers = this.readPublicVoteTrackers(feedback.metadata);

    if (existingTrackers.includes(tracker)) {
      throw new BadRequestException(
        'You already voted for this feedback item.',
      );
    }

    feedback.votes += 1;
    feedback.metadata = {
      ...(feedback.metadata ?? {}),
      publicVoters: [...existingTrackers, tracker].slice(-MAX_PUBLIC_VOTER_TRACKERS),
    };

    const saved = await this.projectFeedbackRepo.save(feedback);

    return {
      message: 'Vote recorded',
      feedback: this.serializePublicFeedback(saved),
    };
  }

  async listFeedback(
    projectIdOrSlug: string,
    userId: string,
    filters: ListProjectFeedbackDto,
  ) {
    const project = await this.resolveProject(projectIdOrSlug);
    const role = await this.requireProjectRole(project.id, userId, [
      'lead',
      'contributor',
      'viewer',
    ]);

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));

    const qb = this.projectFeedbackRepo
      .createQueryBuilder('feedback')
      .where('feedback.projectId = :projectId', { projectId: project.id })
      .orderBy('feedback.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.status) {
      qb.andWhere('feedback.status = :status', { status: filters.status });
    }

    if (filters.category) {
      qb.andWhere('feedback.category = :category', { category: filters.category });
    }

    const [rows, total] = await qb.getManyAndCount();
    const redactSensitive = role === 'viewer';

    return {
      data: rows.map((row) =>
        this.serializeFeedback(row, { redactSensitive }),
      ),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  async updateFeedback(
    projectIdOrSlug: string,
    feedbackId: string,
    dto: UpdateProjectFeedbackDto,
    userId: string,
  ) {
    const project = await this.resolveProject(projectIdOrSlug);
    await this.requireProjectRole(project.id, userId, ['lead', 'contributor']);

    const feedback = await this.projectFeedbackRepo.findOne({
      where: { id: feedbackId, projectId: project.id },
    });

    if (!feedback) {
      throw new NotFoundException(`Feedback ${feedbackId} not found in this project`);
    }

    if (dto.status) feedback.status = dto.status;
    if (dto.moderatorNote !== undefined) feedback.moderatorNote = dto.moderatorNote;

    const saved = await this.projectFeedbackRepo.save(feedback);
    return this.serializeFeedback(saved);
  }

  // ───────────────────── Phase 2: AI Draft Pipeline ─────────────────────

  async queueRoadmapDraft(
    projectIdOrSlug: string,
    userId: string,
    maxItems = 5,
  ) {
    const project = await this.resolveProject(projectIdOrSlug);
    await this.requireProjectRole(project.id, userId, ['lead', 'contributor']);

    const normalizedMaxItems = Math.max(1, Math.min(10, maxItems));

    const job = await this.roadmapQueue.add(
      'draft-roadmap',
      {
        action: 'draft-roadmap',
        projectId: project.id,
        maxItems: normalizedMaxItems,
        triggeredByUserId: userId,
      },
      {
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );

    return {
      jobId: job.id,
      projectId: project.id,
      message: 'Roadmap draft job queued',
    };
  }

  async processRoadmapDraftJob(data: RoadmapDraftJobData) {
    const project = await this.projectRepo.findOne({ where: { id: data.projectId } });
    if (!project) {
      this.logger.warn(`Skipping roadmap draft: project ${data.projectId} not found`);
      return;
    }

    const feedbackRows = await this.projectFeedbackRepo.find({
      where: {
        projectId: project.id,
        status: In(['new', 'reviewed']),
      },
      order: {
        votes: 'DESC',
        painLevel: 'DESC',
        createdAt: 'DESC',
      },
      take: 80,
    });

    if (feedbackRows.length === 0) {
      this.logger.log(`Roadmap draft skipped for ${project.slug}: no feedback`);
      return;
    }

    const maxItems = Math.max(1, Math.min(10, data.maxItems ?? 5));
    const aiCandidates = await this.generateRoadmapCandidates(project, feedbackRows, maxItems);

    const existing = await this.roadmapItemRepo.find({
      where: { projectId: project.id },
      select: ['id', 'title'],
    });
    const existingTitles = new Set(existing.map((item) => this.normalizeTitle(item.title)));

    const createdItems: RoadmapItem[] = [];
    for (const candidate of aiCandidates) {
      const normalized = this.normalizeTitle(candidate.title);
      if (!normalized || existingTitles.has(normalized)) {
        continue;
      }

      const linkedFeedbackIds = await this.filterFeedbackIdsForProject(
        project.id,
        this.sanitizeFeedbackIds(candidate.feedbackIds),
      );

      const item = this.roadmapItemRepo.create({
        projectId: project.id,
        title: candidate.title,
        problem: candidate.problem,
        outcome: candidate.outcome,
        priority: this.normalizePriority(candidate.priority),
        effort: this.normalizeEffort(candidate.effort),
        status: 'proposed',
        aiConfidence: this.normalizeConfidence(candidate.confidence),
        aiRationale: candidate.rationale,
        sourceFeedbackIds: linkedFeedbackIds,
        autoGenerated: true,
        createdById: data.triggeredByUserId,
      });

      const saved = await this.roadmapItemRepo.save(item);
      createdItems.push(saved);
      existingTitles.add(normalized);

      if (linkedFeedbackIds.length > 0) {
        await this.projectFeedbackRepo.update(
          {
            id: In(linkedFeedbackIds),
            projectId: project.id,
            status: In(['new', 'reviewed']),
          },
          { status: 'reviewed' },
        );
      }
    }

    this.logger.log(
      `Roadmap draft processed for ${project.slug}: created=${createdItems.length} from feedback=${feedbackRows.length}`,
    );
  }

  // ───────────────────── Phase 3: Roadmap Management ─────────────────────

  async listRoadmapItems(
    projectIdOrSlug: string,
    userId: string,
    query: ListRoadmapItemsDto,
  ) {
    const project = await this.resolveProject(projectIdOrSlug);
    await this.requireProjectRole(project.id, userId, [
      'lead',
      'contributor',
      'viewer',
    ]);

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const qb = this.roadmapItemRepo
      .createQueryBuilder('item')
      .where('item.projectId = :projectId', { projectId: project.id })
      .orderBy(
        `CASE item.priority
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END`,
        'ASC',
      )
      .addOrderBy(
        `CASE item.status
          WHEN 'in_progress' THEN 0
          WHEN 'planned' THEN 1
          WHEN 'approved' THEN 2
          WHEN 'proposed' THEN 3
          WHEN 'completed' THEN 4
          WHEN 'rejected' THEN 5
          ELSE 6
        END`,
        'ASC',
      )
      .addOrderBy('item.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.status) {
      qb.andWhere('item.status = :status', { status: query.status });
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((row) => this.serializeRoadmapItem(row)),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  async createRoadmapItem(
    projectIdOrSlug: string,
    dto: CreateRoadmapItemDto,
    userId: string,
  ) {
    const project = await this.resolveProject(projectIdOrSlug);
    await this.requireProjectRole(project.id, userId, ['lead', 'contributor']);

    const sourceFeedbackIds = this.sanitizeFeedbackIds(dto.sourceFeedbackIds);
    if (sourceFeedbackIds.length > 0) {
      await this.ensureFeedbackBelongsToProject(project.id, sourceFeedbackIds);
    }

    const item = this.roadmapItemRepo.create({
      projectId: project.id,
      title: dto.title.trim(),
      problem: dto.problem.trim(),
      outcome: dto.outcome?.trim(),
      priority: this.normalizePriority(dto.priority),
      effort: this.normalizeEffort(dto.effort),
      status: this.normalizeStatus(dto.status),
      targetQuarter: dto.targetQuarter?.trim(),
      sourceFeedbackIds,
      ownerId: dto.ownerId,
      createdById: userId,
      autoGenerated: false,
    });

    const saved = await this.roadmapItemRepo.save(item);

    if (sourceFeedbackIds.length > 0) {
      await this.projectFeedbackRepo.update(
        {
          id: In(sourceFeedbackIds),
          projectId: project.id,
        },
        { status: 'planned' },
      );
    }

    return this.serializeRoadmapItem(saved);
  }

  async updateRoadmapItem(
    projectIdOrSlug: string,
    itemId: string,
    dto: UpdateRoadmapItemDto,
    userId: string,
  ) {
    const project = await this.resolveProject(projectIdOrSlug);
    await this.requireProjectRole(project.id, userId, ['lead', 'contributor']);

    const item = await this.roadmapItemRepo.findOne({
      where: { id: itemId, projectId: project.id },
    });

    if (!item) {
      throw new NotFoundException(`Roadmap item ${itemId} not found in this project`);
    }

    if (dto.title !== undefined) item.title = dto.title.trim();
    if (dto.problem !== undefined) item.problem = dto.problem.trim();
    if (dto.outcome !== undefined) item.outcome = dto.outcome.trim();
    if (dto.priority !== undefined) item.priority = this.normalizePriority(dto.priority);
    if (dto.effort !== undefined) item.effort = this.normalizeEffort(dto.effort);
    if (dto.status !== undefined) item.status = this.normalizeStatus(dto.status);
    if (dto.targetQuarter !== undefined) item.targetQuarter = dto.targetQuarter?.trim();
    if (dto.ownerId !== undefined) item.ownerId = dto.ownerId;

    if (dto.sourceFeedbackIds !== undefined) {
      const ids = this.sanitizeFeedbackIds(dto.sourceFeedbackIds);
      if (ids.length > 0) {
        await this.ensureFeedbackBelongsToProject(project.id, ids);
      }
      item.sourceFeedbackIds = ids;

      if (ids.length > 0) {
        await this.projectFeedbackRepo.update(
          { id: In(ids), projectId: project.id },
          { status: 'planned' },
        );
      }
    }

    const saved = await this.roadmapItemRepo.save(item);
    return this.serializeRoadmapItem(saved);
  }

  async getPipelineSummary(projectIdOrSlug: string, userId: string) {
    const project = await this.resolveProject(projectIdOrSlug);
    await this.requireProjectRole(project.id, userId, [
      'lead',
      'contributor',
      'viewer',
    ]);

    const feedbackRaw = await this.projectFeedbackRepo
      .createQueryBuilder('feedback')
      .select('feedback.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('feedback.projectId = :projectId', { projectId: project.id })
      .groupBy('feedback.status')
      .getRawMany<{ status: ProjectFeedbackStatus; count: string }>();

    const roadmapRaw = await this.roadmapItemRepo
      .createQueryBuilder('item')
      .select('item.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('item.projectId = :projectId', { projectId: project.id })
      .groupBy('item.status')
      .getRawMany<{ status: RoadmapStatus; count: string }>();

    const feedbackByStatus = FEEDBACK_STATUSES.reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<ProjectFeedbackStatus, number>,
    );

    for (const row of feedbackRaw) {
      feedbackByStatus[row.status] = parseInt(row.count, 10);
    }

    const roadmapByStatus = ROADMAP_STATUSES.reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<RoadmapStatus, number>,
    );

    for (const row of roadmapRaw) {
      roadmapByStatus[row.status] = parseInt(row.count, 10);
    }

    return {
      projectId: project.id,
      feedbackByStatus,
      roadmapByStatus,
    };
  }

  // ───────────────────── Phase 4: Task Prompt Generation ─────────────────────

  async generateTaskPrompt(
    projectIdOrSlug: string,
    itemId: string,
    dto: GenerateTaskPromptDto,
    userId: string,
  ) {
    const project = await this.resolveProject(projectIdOrSlug);
    await this.requireProjectRole(project.id, userId, ['lead', 'contributor']);

    const item = await this.roadmapItemRepo.findOne({
      where: { id: itemId, projectId: project.id },
    });

    if (!item) {
      throw new NotFoundException(`Roadmap item ${itemId} not found in this project`);
    }

    const feedbackRows = item.sourceFeedbackIds.length
      ? await this.projectFeedbackRepo.find({
          where: {
            projectId: project.id,
            id: In(item.sourceFeedbackIds),
          },
          order: { createdAt: 'DESC' },
        })
      : [];

    const aiPayload = await this.generateAiTaskPrompt(
      project,
      item,
      feedbackRows,
      dto,
    );

    const savedPrompt = await this.taskPromptRepo.save(
      this.taskPromptRepo.create({
        projectId: project.id,
        roadmapItemId: item.id,
        prompt: aiPayload.prompt,
        tasks: aiPayload.tasks,
        provider: this.llm.getProvider(),
        model: this.llm.getModel(),
        createdById: userId,
      }),
    );

    item.latestTaskPrompt = aiPayload.prompt;
    item.latestTaskChecklist = aiPayload.tasks;
    if (item.status === 'proposed' || item.status === 'approved') {
      item.status = 'planned';
    }
    await this.roadmapItemRepo.save(item);

    return this.serializeTaskPrompt(savedPrompt);
  }

  async listTaskPrompts(
    projectIdOrSlug: string,
    itemId: string,
    query: ListTaskPromptsDto,
    userId: string,
  ) {
    const project = await this.resolveProject(projectIdOrSlug);
    await this.requireProjectRole(project.id, userId, [
      'lead',
      'contributor',
      'viewer',
    ]);

    const exists = await this.roadmapItemRepo.findOne({
      where: { id: itemId, projectId: project.id },
      select: ['id'],
    });
    if (!exists) {
      throw new NotFoundException(`Roadmap item ${itemId} not found in this project`);
    }

    const limit = Math.max(1, Math.min(50, query.limit ?? 10));
    const rows = await this.taskPromptRepo.find({
      where: { projectId: project.id, roadmapItemId: itemId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return {
      data: rows.map((row) => this.serializeTaskPrompt(row)),
      total: rows.length,
    };
  }

  // ───────────────────── AI Helpers ─────────────────────

  private async generateRoadmapCandidates(
    project: Project,
    feedbackRows: ProjectFeedback[],
    maxItems: number,
  ): Promise<AiRoadmapCandidate[]> {
    const clippedFeedback = feedbackRows.slice(0, 30).map((f) => ({
      id: f.id,
      category: f.category,
      painLevel: f.painLevel ?? null,
      votes: f.votes,
      title: f.title ?? null,
      content: f.content.slice(0, 500),
      persona: f.persona ?? null,
      createdAt: f.createdAt.toISOString(),
    }));

    try {
      const completion = await this.llm.chatCompletion({
        messages: [
          {
            role: 'system',
            content:
              'You are a senior product manager. Convert user feedback into roadmap candidates. ' +
              'Return strict JSON only in this exact shape: ' +
              '{"items":[{"title":"string","problem":"string","outcome":"string","priority":"low|medium|high|critical","effort":"xs|s|m|l|xl","confidence":0.0,"rationale":"string","feedbackIds":["uuid"]}]}. ' +
              `Produce at most ${maxItems} items. Avoid duplicates and generic wording.`,
          },
          {
            role: 'user',
            content: JSON.stringify(
              {
                project: {
                  id: project.id,
                  name: project.name,
                  slug: project.slug,
                  description: project.description ?? null,
                  summary: project.summary ?? null,
                },
                maxItems,
                feedback: clippedFeedback,
              },
              null,
              2,
            ),
          },
        ],
        temperature: 0.2,
        maxTokens: 1800,
      });

      const parsed = this.parseJson<AiRoadmapDraft>(completion.content);
      if (parsed?.items?.length) {
        return parsed.items
          .filter((item) => item.title?.trim() && item.problem?.trim())
          .slice(0, maxItems);
      }
    } catch (err: any) {
      this.logger.warn(`AI roadmap draft failed, using fallback: ${err.message}`);
    }

    return this.generateFallbackCandidates(feedbackRows, maxItems);
  }

  private generateFallbackCandidates(
    feedbackRows: ProjectFeedback[],
    maxItems: number,
  ): AiRoadmapCandidate[] {
    const byCategory = new Map<
      ProjectFeedbackCategory,
      { items: ProjectFeedback[]; painSum: number }
    >();

    for (const row of feedbackRows) {
      const current = byCategory.get(row.category) ?? { items: [], painSum: 0 };
      current.items.push(row);
      current.painSum += row.painLevel ?? 3;
      byCategory.set(row.category, current);
    }

    const ordered = [...byCategory.entries()]
      .sort((a, b) => {
        const aScore = a[1].items.length * 2 + a[1].painSum;
        const bScore = b[1].items.length * 2 + b[1].painSum;
        return bScore - aScore;
      })
      .slice(0, maxItems);

    return ordered.map(([category, payload], idx) => {
      const top = payload.items[0];
      const avgPain = Math.round((payload.painSum / payload.items.length) * 10) / 10;
      const priority: RoadmapPriority = avgPain >= 4
        ? 'high'
        : avgPain >= 3
          ? 'medium'
          : 'low';

      return {
        title: `${this.capitalize(category)} improvements #${idx + 1}`,
        problem: `Received ${payload.items.length} feedback submissions about ${category}. Representative issue: ${top.content.slice(0, 220)}`,
        outcome: `Reduce friction around ${category} and improve user satisfaction metrics.`,
        priority,
        effort: payload.items.length >= 5 ? 'l' : 'm',
        confidence: Math.min(0.95, 0.4 + payload.items.length * 0.08),
        rationale: `Grouped by category=${category}, submissions=${payload.items.length}, avgPain=${avgPain}`,
        feedbackIds: payload.items.slice(0, 8).map((item) => item.id),
      };
    });
  }

  private async generateAiTaskPrompt(
    project: Project,
    item: RoadmapItem,
    feedbackRows: ProjectFeedback[],
    dto: GenerateTaskPromptDto,
  ): Promise<AiTaskPromptPayload> {
    const feedbackContext = feedbackRows.map((f) => ({
      id: f.id,
      category: f.category,
      painLevel: f.painLevel ?? null,
      content: f.content.slice(0, 300),
    }));

    try {
      const completion = await this.llm.chatCompletion({
        messages: [
          {
            role: 'system',
            content:
              'You are a principal engineer turning roadmap items into execution plans. Return strict JSON only in this shape: ' +
              '{"prompt":"string","tasks":[{"title":"string","description":"string","acceptanceCriteria":["string"]}]}. ' +
              'Prompt must be directly usable as an AI coding task prompt with context, scope, acceptance criteria, and test requirements.',
          },
          {
            role: 'user',
            content: JSON.stringify(
              {
                project: {
                  id: project.id,
                  name: project.name,
                  slug: project.slug,
                  description: project.description ?? null,
                },
                roadmapItem: {
                  id: item.id,
                  title: item.title,
                  problem: item.problem,
                  outcome: item.outcome,
                  priority: item.priority,
                  effort: item.effort,
                },
                linkedFeedback: feedbackContext,
                extraContext: dto.extraContext ?? null,
                taskSeeds: dto.taskSeeds ?? [],
              },
              null,
              2,
            ),
          },
        ],
        temperature: 0.2,
        maxTokens: 2000,
      });

      const parsed = this.parseJson<AiTaskPromptPayload>(completion.content);
      if (parsed?.prompt?.trim() && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
        return {
          prompt: parsed.prompt.trim(),
          tasks: parsed.tasks
            .filter((task) => task.title?.trim() && task.description?.trim())
            .map((task) => ({
              title: task.title.trim(),
              description: task.description.trim(),
              acceptanceCriteria: Array.isArray(task.acceptanceCriteria)
                ? task.acceptanceCriteria.map((ac) => ac.trim()).filter(Boolean)
                : [],
            })),
        };
      }
    } catch (err: any) {
      this.logger.warn(`AI task prompt generation failed, using fallback: ${err.message}`);
    }

    const fallbackPrompt = [
      `You are implementing roadmap item "${item.title}" for project "${project.name}" (${project.slug}).`,
      '',
      'Problem:',
      item.problem,
      '',
      'Outcome:',
      item.outcome || 'Define measurable improvement tied to user feedback.',
      '',
      'Constraints:',
      dto.extraContext || 'Keep backward compatibility and include tests for API and UI.',
      '',
      'Execution requirements:',
      '- Propose data model updates (if needed).',
      '- Implement API endpoints and validation.',
      '- Implement frontend flow.',
      '- Add tests and include edge cases.',
      '- Provide rollout notes.',
    ].join('\n');

    const fallbackTasks = [
      {
        title: 'Define implementation scope',
        description: 'Translate roadmap outcome into concrete API + frontend deliverables.',
        acceptanceCriteria: [
          'Scope includes backend, frontend, and tests',
          'Out-of-scope items are explicitly documented',
        ],
      },
      {
        title: 'Implement backend changes',
        description: 'Add or update entities, services, controllers, and queue jobs as required.',
        acceptanceCriteria: [
          'Endpoints validate request payloads',
          'Authorization rules match project roles',
          'Background jobs are idempotent',
        ],
      },
      {
        title: 'Implement frontend flow',
        description: 'Expose the roadmap capability in project UI with usable defaults.',
        acceptanceCriteria: [
          'Users can trigger the flow without manual API calls',
          'Loading and error states are handled',
          'Generated outputs are visible and copyable',
        ],
      },
      {
        title: 'Quality checks',
        description: 'Add or update tests and run build/type checks before shipping.',
        acceptanceCriteria: [
          'TypeScript build passes',
          'Critical happy-path tests are added',
          'Regression risk is documented',
        ],
      },
    ];

    return {
      prompt: fallbackPrompt,
      tasks: fallbackTasks,
    };
  }

  // ───────────────────── Utilities ─────────────────────

  private async resolveProject(idOrSlug: string): Promise<Project> {
    const where = UUID_REGEX.test(idOrSlug)
      ? [{ id: idOrSlug }, { slug: idOrSlug }]
      : [{ slug: idOrSlug }];

    const project = await this.projectRepo.findOne({ where });
    if (!project) {
      throw new NotFoundException(`Project "${idOrSlug}" not found`);
    }

    return project;
  }

  private async requireProjectRole(
    projectId: string,
    userId: string,
    roles: ProjectRole[],
  ): Promise<ProjectRole> {
    const membership = await this.projectMemberRepo.findOne({
      where: { projectId, userId },
      select: ['id', 'role'],
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this project');
    }

    if (!roles.includes(membership.role)) {
      throw new ForbiddenException(
        `Requires one of roles: ${roles.join(', ')}`,
      );
    }

    return membership.role;
  }

  private sanitizeFeedbackIds(ids?: string[]): string[] {
    if (!ids || ids.length === 0) return [];
    return [...new Set(ids.filter((id) => UUID_REGEX.test(id)))];
  }

  private async ensureFeedbackBelongsToProject(
    projectId: string,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) return;
    const count = await this.projectFeedbackRepo.count({
      where: {
        projectId,
        id: In(ids),
      },
    });

    if (count !== ids.length) {
      throw new BadRequestException(
        'One or more sourceFeedbackIds do not belong to this project',
      );
    }
  }

  private async filterFeedbackIdsForProject(
    projectId: string,
    ids: string[],
  ): Promise<string[]> {
    if (ids.length === 0) return [];

    const rows = await this.projectFeedbackRepo.find({
      where: { projectId, id: In(ids) },
      select: ['id'],
    });
    const valid = new Set(rows.map((row) => row.id));
    const invalid = ids.filter((id) => !valid.has(id));

    if (invalid.length > 0) {
      this.logger.warn(
        `Dropping ${invalid.length} invalid feedbackIds for project ${projectId}: ${invalid.join(', ')}`,
      );
    }

    return ids.filter((id) => valid.has(id));
  }

  private async enforceFeedbackDedupe(
    projectId: string,
    content: string,
    opts: { ip?: string; submitterEmail?: string },
  ) {
    const since = new Date(Date.now() - FEEDBACK_DEDUPE_WINDOW_MS);
    const qb = this.projectFeedbackRepo
      .createQueryBuilder('feedback')
      .where('feedback.projectId = :projectId', { projectId })
      .andWhere('feedback.createdAt >= :since', { since })
      .andWhere('LOWER(TRIM(feedback.content)) = LOWER(TRIM(:content))', {
        content,
      });

    if (opts.ip) {
      qb.andWhere(`feedback.metadata->>'ip' = :ip`, { ip: opts.ip });
    } else if (opts.submitterEmail) {
      qb.andWhere('LOWER(feedback.submitterEmail) = :email', {
        email: opts.submitterEmail.toLowerCase(),
      });
    } else {
      return;
    }

    const dupCount = await qb.getCount();
    if (dupCount > 0) {
      throw new BadRequestException(
        'Duplicate feedback detected. Please wait before submitting the same feedback again.',
      );
    }
  }

  private normalizePriority(priority?: string): RoadmapPriority {
    return ROADMAP_PRIORITIES.includes(priority as RoadmapPriority)
      ? (priority as RoadmapPriority)
      : 'medium';
  }

  private normalizeEffort(effort?: string): RoadmapEffort {
    return ROADMAP_EFFORTS.includes(effort as RoadmapEffort)
      ? (effort as RoadmapEffort)
      : 'm';
  }

  private normalizeStatus(status?: string): RoadmapStatus {
    return ROADMAP_STATUSES.includes(status as RoadmapStatus)
      ? (status as RoadmapStatus)
      : 'proposed';
  }

  private normalizeConfidence(confidence?: number): number | undefined {
    if (typeof confidence !== 'number' || Number.isNaN(confidence)) {
      return undefined;
    }
    return Math.max(0, Math.min(1, confidence));
  }

  private parseJson<T>(raw: string): T | null {
    const trimmed = raw.trim();

    try {
      return JSON.parse(trimmed) as T;
    } catch {
      // Continue to fenced JSON fallback.
    }

    const match = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
    if (match?.[1]) {
      try {
        return JSON.parse(match[1]) as T;
      } catch {
        return null;
      }
    }

    return null;
  }

  private normalizeTitle(title: string): string {
    return title.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private serializeFeedback(
    feedback: ProjectFeedback,
    opts?: { redactSensitive?: boolean },
  ) {
    const redactSensitive = opts?.redactSensitive ?? false;

    return {
      id: feedback.id,
      projectId: feedback.projectId,
      category: feedback.category,
      status: feedback.status,
      title: feedback.title,
      content: feedback.content,
      painLevel: feedback.painLevel,
      persona: feedback.persona,
      submitterName: feedback.submitterName,
      submitterEmail: redactSensitive ? undefined : feedback.submitterEmail,
      sourceType: feedback.sourceType,
      sourceUrl: feedback.sourceUrl,
      votes: feedback.votes,
      moderatorNote: feedback.moderatorNote,
      metadata: redactSensitive ? {} : feedback.metadata,
      createdAt: feedback.createdAt.toISOString(),
      updatedAt: feedback.updatedAt.toISOString(),
    };
  }

  private serializePublicFeedback(feedback: ProjectFeedback) {
    return {
      id: feedback.id,
      projectId: feedback.projectId,
      category: feedback.category,
      status: feedback.status,
      title: feedback.title,
      content: feedback.content,
      painLevel: feedback.painLevel,
      persona: feedback.persona,
      submitterName: feedback.submitterName,
      sourceType: feedback.sourceType,
      sourceUrl: feedback.sourceUrl,
      votes: feedback.votes,
      createdAt: feedback.createdAt.toISOString(),
      updatedAt: feedback.updatedAt.toISOString(),
    };
  }

  private createPublicVoteTracker(
    projectId: string,
    meta?: { ip?: string; userAgent?: string },
  ): string {
    const ip = (meta?.ip || 'unknown').toLowerCase();
    const userAgent = (meta?.userAgent || 'unknown').slice(0, 120).toLowerCase();
    return createHash('sha256')
      .update(`${projectId}:${ip}:${userAgent}`)
      .digest('hex');
  }

  private readPublicVoteTrackers(metadata: Record<string, unknown>): string[] {
    const raw = metadata?.publicVoters;
    if (!Array.isArray(raw)) return [];
    return raw.filter((item): item is string => typeof item === 'string');
  }

  private serializeRoadmapItem(item: RoadmapItem) {
    return {
      id: item.id,
      projectId: item.projectId,
      title: item.title,
      problem: item.problem,
      outcome: item.outcome,
      priority: item.priority,
      effort: item.effort,
      status: item.status,
      targetQuarter: item.targetQuarter,
      aiConfidence: item.aiConfidence,
      aiRationale: item.aiRationale,
      sourceFeedbackIds: item.sourceFeedbackIds,
      autoGenerated: item.autoGenerated,
      latestTaskPrompt: item.latestTaskPrompt,
      latestTaskChecklist: item.latestTaskChecklist,
      ownerId: item.ownerId,
      createdById: item.createdById,
      metadata: item.metadata,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  private serializeTaskPrompt(prompt: RoadmapTaskPrompt) {
    return {
      id: prompt.id,
      projectId: prompt.projectId,
      roadmapItemId: prompt.roadmapItemId,
      prompt: prompt.prompt,
      tasks: prompt.tasks,
      provider: prompt.provider,
      model: prompt.model,
      createdById: prompt.createdById,
      createdAt: prompt.createdAt.toISOString(),
    };
  }
}
