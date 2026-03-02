import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Project } from '../../entities/project.entity';
import { ProjectMember, ProjectRole } from '../../entities/project-member.entity';
import { ProjectSource } from '../../entities/project-source.entity';
import { ProjectInvitation } from '../../entities/project-invitation.entity';
import { RoadmapItem } from '../../entities/roadmap-item.entity';
import { Source } from '../../entities/source.entity';
import { User } from '../../entities/user.entity';
import { Document } from '../../entities/document.entity';
import { LlmService } from '../llm/llm.service';
import { EmailService } from '../auth/email.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  AddProjectMemberDto,
  UpdateProjectMemberDto,
  AddProjectSourceDto,
  CreateProjectFromSourceDto,
  InviteProjectMemberDto,
} from './dto/project.dto';
import { GitHubService } from '../github/github.service';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly memberRepo: Repository<ProjectMember>,
    @InjectRepository(ProjectSource)
    private readonly projectSourceRepo: Repository<ProjectSource>,
    @InjectRepository(ProjectInvitation)
    private readonly invitationRepo: Repository<ProjectInvitation>,
    @InjectRepository(Source)
    private readonly sourceRepo: Repository<Source>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    @InjectRepository(RoadmapItem)
    private readonly roadmapItemRepo: Repository<RoadmapItem>,
    private readonly llm: LlmService,
    private readonly github: GitHubService,
    private readonly emailService: EmailService,
  ) {}

  // ─── Project CRUD ─────────────────────────────────────────

  async findAll() {
    const projects = await this.projectRepo.find({
      order: { createdAt: 'DESC' },
    });

    // Get member + source counts
    const enriched = await Promise.all(
      projects.map(async (p) => {
        const [memberCount, sourceCount] = await Promise.all([
          this.memberRepo.count({ where: { projectId: p.id } }),
          this.projectSourceRepo.count({ where: { projectId: p.id } }),
        ]);
        return { ...p, memberCount, sourceCount };
      }),
    );

    return { projects: enriched, total: enriched.length };
  }

  /**
   * List projects for the public API with optional pagination and filters.
   * Only returns projects where isPublic is true.
   */
  async findAllPublic(options?: {
    page?: number;
    limit?: number;
    slug?: string;
    search?: string;
  }) {
    const page = Math.max(1, options?.page ?? 1);
    const limit = Math.min(100, Math.max(1, options?.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.projectRepo
      .createQueryBuilder('project')
      .where('project.isPublic = :isPublic', { isPublic: true })
      .orderBy('project.createdAt', 'DESC');

    if (options?.slug) {
      qb.andWhere('project.slug = :slug', { slug: options.slug });
    }
    if (options?.search?.trim()) {
      const term = `%${options.search.trim()}%`;
      qb.andWhere(
        '(project.name ILIKE :term OR project.slug ILIKE :term OR project.description ILIKE :term)',
        { term },
      );
    }

    const [projects, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const enriched = await Promise.all(
      projects.map(async (p) => {
        const [memberCount, sourceCount] = await Promise.all([
          this.memberRepo.count({ where: { projectId: p.id } }),
          this.projectSourceRepo.count({ where: { projectId: p.id } }),
        ]);
        return { ...p, memberCount, sourceCount };
      }),
    );

    return {
      data: enriched,
      total,
      page,
      limit,
      hasMore: skip + enriched.length < total,
    };
  }

  /** Resolve project ID from slug or id (for project-scoped ask/search). */
  async resolveProjectId(idOrSlug: string): Promise<string | null> {
    try {
      const project = await this.findOne(idOrSlug);
      return project.id;
    } catch {
      return null;
    }
  }

  async findOne(idOrSlug: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );
    const where = isUuid
      ? [{ id: idOrSlug }, { slug: idOrSlug }]
      : [{ slug: idOrSlug }];
    const project = await this.projectRepo.findOne({ where });
    if (!project) {
      throw new NotFoundException(`Project "${idOrSlug}" not found`);
    }

    const [members, projectSources] = await Promise.all([
      this.memberRepo.find({
        where: { projectId: project.id },
        relations: ['user'],
        order: { role: 'ASC', joinedAt: 'ASC' },
      }),
      this.projectSourceRepo.find({
        where: { projectId: project.id },
        relations: ['source'],
        order: { assignedAt: 'DESC' },
      }),
    ]);

    return {
      ...project,
      memberCount: members.length,
      sourceCount: projectSources.length,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: {
          id: m.user.id,
          email: m.user.email,
          name: m.user.name,
          role: m.user.role,
        },
      })),
      sources: projectSources.map((ps) => ({
        id: ps.id,
        sourceId: ps.sourceId,
        assignedAt: ps.assignedAt,
        source: {
          id: ps.source.id,
          name: ps.source.name,
          type: ps.source.type,
          status: ps.source.status,
          documentCount: ps.source.documentCount,
          lastSyncedAt: ps.source.lastSyncedAt,
        },
      })),
    };
  }

  async create(dto: CreateProjectDto, userId: string) {
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check slug uniqueness
    const existing = await this.projectRepo.findOneBy({ slug });
    if (existing) {
      throw new ConflictException(`A project with slug "${slug}" already exists`);
    }

    const project = this.projectRepo.create({
      name: dto.name,
      slug,
      description: dto.description,
      logoUrl: dto.logoUrl,
      links: dto.links || [],
      isPublic: dto.isPublic ?? true,
      showOnLandingPage: dto.showOnLandingPage ?? false,
      isRoadmapPublic: dto.isRoadmapPublic ?? false,
      publicTheme: dto.publicTheme ?? 'forest',
      publicBorderRadius: dto.publicBorderRadius ?? 'rounded',
    });

    const saved = await this.projectRepo.save(project);

    // Add the creator as a project lead
    const member = this.memberRepo.create({
      projectId: saved.id,
      userId,
      role: 'lead',
    });
    await this.memberRepo.save(member);

    this.logger.log(`Project "${saved.name}" created (id=${saved.id}) by user ${userId}`);

    return this.findOne(saved.id);
  }

  async createFromSource(dto: CreateProjectFromSourceDto, userId: string) {
    const source = await this.sourceRepo.findOneBy({ id: dto.sourceId });
    if (!source) throw new NotFoundException(`Source ${dto.sourceId} not found`);

    if (source.type !== 'github_repo') {
      throw new ConflictException('Only GitHub repository sources are supported for quick project creation');
    }

    const config = source.config as { owner?: string; repo?: string; description?: string; language?: string; stars?: number };
    const owner = config.owner;
    const repo = config.repo;

    if (!owner || !repo) {
      throw new NotFoundException('Source is missing owner/repo configuration');
    }

    let repoDescription = config.description || null;
    let repoLanguage = config.language || null;
    let readmeContent = '';

    try {
      const meta = await this.github.getRepoMeta(owner, repo);
      repoDescription = meta.description;
      repoLanguage = meta.language;
    } catch {
      this.logger.warn(`Could not fetch fresh metadata for ${owner}/${repo}, using stored config`);
    }

    try {
      const readmeDocs = await this.github.fetchRepoReadme(owner, repo);
      if (readmeDocs.length > 0) {
        readmeContent = readmeDocs[0].content.slice(0, 3000);
      }
    } catch {
      this.logger.debug(`Could not fetch README for ${owner}/${repo}`);
    }

    const projectName = this.formatRepoName(repo);

    let description: string;
    try {
      const completion = await this.llm.chatCompletion({
        messages: [
          {
            role: 'system',
            content: `You are writing a concise project description (2-3 sentences) for a software project. Based on the repository information provided, write a clear, informative description that explains what the project does, its purpose, and key technologies. Do NOT use markdown formatting. Keep it under 200 characters if possible, maximum 300 characters.`,
          },
          {
            role: 'user',
            content: [
              `Repository: ${owner}/${repo}`,
              repoDescription ? `GitHub Description: ${repoDescription}` : '',
              repoLanguage ? `Primary Language: ${repoLanguage}` : '',
              readmeContent ? `README (excerpt):\n${readmeContent}` : '',
            ].filter(Boolean).join('\n'),
          },
        ],
        temperature: 0.3,
        maxTokens: 200,
      });
      description = completion.content.trim();
    } catch {
      description = repoDescription || `Project created from ${owner}/${repo}`;
      this.logger.warn(`AI description generation failed for ${owner}/${repo}, using fallback`);
    }

    const slug = this.generateSlug(repo);
    let finalSlug = slug;
    const existing = await this.projectRepo.findOneBy({ slug });
    if (existing) {
      finalSlug = `${slug}-${Date.now().toString(36)}`;
    }

    const project = this.projectRepo.create({
      name: projectName,
      slug: finalSlug,
      description,
      links: [{ label: 'GitHub', url: `https://github.com/${owner}/${repo}` }],
      isPublic: true,
      showOnLandingPage: false,
      isRoadmapPublic: false,
    });

    const saved = await this.projectRepo.save(project);

    const member = this.memberRepo.create({
      projectId: saved.id,
      userId,
      role: 'lead',
    });
    await this.memberRepo.save(member);

    const ps = this.projectSourceRepo.create({
      projectId: saved.id,
      sourceId: dto.sourceId,
    });
    await this.projectSourceRepo.save(ps);

    this.logger.log(
      `Project "${saved.name}" created from source "${source.name}" (id=${saved.id}) by user ${userId}`,
    );

    return this.findOne(saved.id);
  }

  private formatRepoName(repo: string): string {
    return repo
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  async update(id: string, dto: UpdateProjectDto, userId: string) {
    const project = await this.projectRepo.findOneBy({ id });
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    await this.requireRole(id, userId, ['lead']);

    if (dto.slug && dto.slug !== project.slug) {
      const existing = await this.projectRepo.findOneBy({ slug: dto.slug });
      if (existing) {
        throw new ConflictException(`A project with slug "${dto.slug}" already exists`);
      }
    }

    if (dto.name !== undefined) project.name = dto.name;
    if (dto.slug !== undefined) project.slug = dto.slug;
    if (dto.description !== undefined) project.description = dto.description;
    if (dto.logoUrl !== undefined) project.logoUrl = dto.logoUrl;
    if (dto.links !== undefined) project.links = dto.links;
    if (dto.isPublic !== undefined) project.isPublic = dto.isPublic;
    if (dto.showOnLandingPage !== undefined) project.showOnLandingPage = dto.showOnLandingPage;
    if (dto.isRoadmapPublic !== undefined) project.isRoadmapPublic = dto.isRoadmapPublic;
    if (dto.publicTheme !== undefined) project.publicTheme = dto.publicTheme;
    if (dto.publicBorderRadius !== undefined) project.publicBorderRadius = dto.publicBorderRadius;
    if (dto.isNewsEnabled !== undefined) project.isNewsEnabled = dto.isNewsEnabled;
    if (dto.newsKeywords !== undefined) project.newsKeywords = dto.newsKeywords;
    if (dto.summary !== undefined) {
      project.summary = dto.summary;
      project.summaryUpdatedAt = new Date();
    }

    await this.projectRepo.save(project);
    this.logger.log(`Project ${id} updated by user ${userId}`);

    return this.findOne(id);
  }

  async remove(id: string, userId: string) {
    const project = await this.projectRepo.findOneBy({ id });
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    await this.requireRole(id, userId, ['lead']);

    await this.projectRepo.remove(project);
    this.logger.log(`Project "${project.name}" removed by user ${userId}`);
    return { message: `Project "${project.name}" removed successfully` };
  }

  // ─── Source Mapping ───────────────────────────────────────

  async addSource(projectId: string, dto: AddProjectSourceDto, userId: string) {
    const project = await this.projectRepo.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    await this.requireRole(projectId, userId, ['lead', 'contributor']);

    const source = await this.sourceRepo.findOneBy({ id: dto.sourceId });
    if (!source) throw new NotFoundException(`Source ${dto.sourceId} not found`);

    const existing = await this.projectSourceRepo.findOneBy({
      projectId,
      sourceId: dto.sourceId,
    });
    if (existing) {
      throw new ConflictException('Source is already assigned to this project');
    }

    const ps = this.projectSourceRepo.create({
      projectId,
      sourceId: dto.sourceId,
    });
    await this.projectSourceRepo.save(ps);

    this.logger.log(`Source "${source.name}" added to project "${project.name}"`);
    return {
      id: ps.id,
      sourceId: ps.sourceId,
      assignedAt: ps.assignedAt,
      source: {
        id: source.id,
        name: source.name,
        type: source.type,
        status: source.status,
        documentCount: source.documentCount,
        lastSyncedAt: source.lastSyncedAt,
      },
    };
  }

  async removeSource(projectId: string, sourceId: string, userId: string) {
    await this.requireRole(projectId, userId, ['lead', 'contributor']);

    const ps = await this.projectSourceRepo.findOneBy({ projectId, sourceId });
    if (!ps) throw new NotFoundException('Source is not assigned to this project');

    await this.projectSourceRepo.remove(ps);
    this.logger.log(`Source ${sourceId} removed from project ${projectId} by user ${userId}`);
    return { message: 'Source removed from project' };
  }

  async listSources(projectId: string) {
    const project = await this.projectRepo.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const projectSources = await this.projectSourceRepo.find({
      where: { projectId },
      relations: ['source'],
      order: { assignedAt: 'DESC' },
    });

    return projectSources.map((ps) => ({
      id: ps.id,
      sourceId: ps.sourceId,
      assignedAt: ps.assignedAt,
      source: {
        id: ps.source.id,
        name: ps.source.name,
        type: ps.source.type,
        status: ps.source.status,
        documentCount: ps.source.documentCount,
        lastSyncedAt: ps.source.lastSyncedAt,
      },
    }));
  }

  /**
   * Get all source IDs assigned to a project — used for project-scoped chat.
   */
  async getProjectSourceIds(projectId: string): Promise<string[]> {
    const projectSources = await this.projectSourceRepo.find({
      where: { projectId },
      select: ['sourceId'],
    });
    return projectSources.map((ps) => ps.sourceId);
  }

  // ─── Team Members ─────────────────────────────────────────

  async addMember(projectId: string, dto: AddProjectMemberDto, requesterId: string) {
    const project = await this.projectRepo.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    await this.requireRole(projectId, requesterId, ['lead']);

    const user = await this.userRepo.findOneBy({ email: dto.email });
    if (!user) {
      throw new NotFoundException(`User with email "${dto.email}" not found. They must sign in at least once first.`);
    }

    const existing = await this.memberRepo.findOneBy({
      projectId,
      userId: user.id,
    });
    if (existing) {
      throw new ConflictException('User is already a member of this project');
    }

    const member = this.memberRepo.create({
      projectId,
      userId: user.id,
      role: dto.role || 'contributor',
    });
    await this.memberRepo.save(member);

    this.logger.log(`User "${user.email}" added to project "${project.name}" as ${member.role}`);
    return {
      id: member.id,
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async updateMember(
    projectId: string,
    userId: string,
    dto: UpdateProjectMemberDto,
    requesterId: string,
  ) {
    await this.requireRole(projectId, requesterId, ['lead']);

    const member = await this.memberRepo.findOne({
      where: { projectId, userId },
      relations: ['user'],
    });
    if (!member) {
      throw new NotFoundException('Member not found in this project');
    }

    member.role = dto.role;
    await this.memberRepo.save(member);

    this.logger.log(`Member ${userId} role updated to ${dto.role} in project ${projectId} by user ${requesterId}`);
    return {
      id: member.id,
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
      user: {
        id: member.user.id,
        email: member.user.email,
        name: member.user.name,
        role: member.user.role,
      },
    };
  }

  async removeMember(projectId: string, userId: string, requesterId: string) {
    await this.requireRole(projectId, requesterId, ['lead']);

    if (userId === requesterId) {
      throw new ForbiddenException('You cannot remove yourself. Transfer ownership first.');
    }

    const member = await this.memberRepo.findOneBy({ projectId, userId });
    if (!member) {
      throw new NotFoundException('Member not found in this project');
    }

    await this.memberRepo.remove(member);
    this.logger.log(`Member ${userId} removed from project ${projectId} by user ${requesterId}`);
    return { message: 'Member removed from project' };
  }

  async listMembers(projectId: string) {
    const project = await this.projectRepo.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const members = await this.memberRepo.find({
      where: { projectId },
      relations: ['user'],
      order: { role: 'ASC', joinedAt: 'ASC' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      user: {
        id: m.user.id,
        email: m.user.email,
        name: m.user.name,
        role: m.user.role,
      },
    }));
  }

  // ─── AI Summary ───────────────────────────────────────────

  async generateSummary(projectId: string, userId: string) {
    await this.requireRole(projectId, userId, ['lead', 'contributor']);

    const project = await this.projectRepo.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const projectSources = await this.projectSourceRepo.find({
      where: { projectId },
      relations: ['source'],
    });

    if (projectSources.length === 0) {
      throw new NotFoundException(
        'No sources assigned to this project. Add sources before generating a summary.',
      );
    }

    // Gather sample documents from all project sources
    const sourceIds = projectSources.map((ps) => ps.sourceId);

    const sampleDocs = await this.documentRepo
      .createQueryBuilder('doc')
      .where('doc.sourceId IN (:...sourceIds)', { sourceIds })
      .andWhere('doc.chunkIndex = 0')
      .orderBy('doc.contentType', 'ASC')
      .take(30)
      .getMany();

    const sampleContent = sampleDocs
      .map(
        (d) =>
          `[${d.contentType}] ${d.title}\n${d.content.slice(0, 400)}`,
      )
      .join('\n\n---\n\n');

    const sourceList = projectSources
      .map((ps) => `- ${ps.source.name} (${ps.source.type}, ${ps.source.documentCount} docs)`)
      .join('\n');

    const completion = await this.llm.chatCompletion({
      messages: [
        {
          role: 'system',
          content: `You are generating a comprehensive project summary for a Tokamak Network project. Based on the assigned knowledge sources and their documents, create a well-structured introduction that covers:

1. **What it is**: A clear description of the project
2. **Key Features**: Main capabilities and components
3. **Technology**: Languages, frameworks, and tools used
4. **Status**: Current development status and maturity
5. **How it fits**: Role within the broader Tokamak Network ecosystem

Write in a professional, informative tone. Use Markdown formatting. Keep it concise but thorough (3-5 paragraphs).`,
        },
        {
          role: 'user',
          content: `Project: "${project.name}"
Description: ${project.description || 'No description provided'}

Assigned sources:
${sourceList}

Sample documents from these sources:

${sampleContent}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 2000,
    });

    // Save the generated summary
    project.summary = completion.content;
    project.summaryUpdatedAt = new Date();
    await this.projectRepo.save(project);

    this.logger.log(`AI summary generated for project "${project.name}"`);

    return {
      projectId,
      projectName: project.name,
      summary: completion.content,
      provider: completion.provider,
      model: completion.model,
      generatedAt: project.summaryUpdatedAt.toISOString(),
    };
  }

  // ─── Public Project View ──────────────────────────────────

  async findPublic(slug: string) {
    const project = await this.projectRepo.findOneBy({ slug });
    if (!project || !project.isPublic) {
      throw new NotFoundException(`Project "${slug}" not found`);
    }

    const [members, projectSources, roadmapItems] = await Promise.all([
      this.memberRepo.find({
        where: { projectId: project.id },
        relations: ['user'],
        order: { role: 'ASC', joinedAt: 'ASC' },
      }),
      this.projectSourceRepo.find({
        where: { projectId: project.id },
        relations: ['source'],
      }),
      project.isRoadmapPublic
        ? this.roadmapItemRepo.find({
            where: {
              projectId: project.id,
              status: In(['proposed', 'approved', 'planned', 'in_progress', 'completed']),
            },
          })
        : Promise.resolve([]),
    ]);

    const statusRank = {
      in_progress: 0,
      planned: 1,
      approved: 2,
      proposed: 3,
      completed: 4,
      rejected: 5,
    } as const;
    const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 } as const;

    const sortedRoadmap = roadmapItems
      .slice()
      .sort((a, b) => {
        const statusDelta = statusRank[a.status] - statusRank[b.status];
        if (statusDelta !== 0) return statusDelta;
        const priorityDelta = priorityRank[a.priority] - priorityRank[b.priority];
        if (priorityDelta !== 0) return priorityDelta;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      })
      .slice(0, 20);

    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      logoUrl: project.logoUrl,
      links: project.links,
      summary: project.summary,
      publicTheme: project.publicTheme,
      publicBorderRadius: project.publicBorderRadius,
      isRoadmapPublic: project.isRoadmapPublic,
      roadmap: project.isRoadmapPublic
        ? sortedRoadmap.map((item) => ({
            id: item.id,
            title: item.title,
            problem: item.problem,
            outcome: item.outcome,
            priority: item.priority,
            effort: item.effort,
            status: item.status,
            targetQuarter: item.targetQuarter,
            updatedAt: item.updatedAt.toISOString(),
          }))
        : [],
      members: members.map((m) => ({
        role: m.role,
        user: { name: m.user.name, email: m.user.email },
      })),
      sources: projectSources.map((ps) => ({
        name: ps.source.name,
        type: ps.source.type,
        documentCount: ps.source.documentCount,
      })),
    };
  }

  // ─── Landing Page Projects ──────────────────────────────

  async findFeatured() {
    const projects = await this.projectRepo.find({
      where: { isPublic: true, showOnLandingPage: true },
      order: { createdAt: 'DESC' },
    });

    const enriched = await Promise.all(
      projects.map(async (p) => {
        const [memberCount, sourceCount] = await Promise.all([
          this.memberRepo.count({ where: { projectId: p.id } }),
          this.projectSourceRepo.count({ where: { projectId: p.id } }),
        ]);
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          logoUrl: p.logoUrl,
          summary: p.summary,
          memberCount,
          sourceCount,
        };
      }),
    );

    return { projects: enriched, total: enriched.length };
  }

  // ─── Project Dashboard Stats ──────────────────────────────

  async getDashboard(projectId: string) {
    const project = await this.findOne(projectId);

    const sourceIds = project.sources.map((s) => s.sourceId);

    // Get content entries for this project
    // (content entries can have a `project` field matching the project name/slug)
    const contentCount = await this.documentRepo.manager
      .getRepository('ContentEntry')
      .createQueryBuilder('ce')
      .where('ce.project = :slug', { slug: project.slug })
      .getCount();

    // Get document stats from project sources
    let docStats: Record<string, number> = {};
    let totalDocs = 0;
    let totalChunks = 0;

    if (sourceIds.length > 0) {
      const rows = await this.documentRepo
        .createQueryBuilder('doc')
        .select('doc.contentType', 'contentType')
        .addSelect('COUNT(*)', 'count')
        .where('doc.sourceId IN (:...sourceIds)', { sourceIds })
        .groupBy('doc.contentType')
        .getRawMany<{ contentType: string; count: string }>();

      for (const row of rows) {
        docStats[row.contentType] = parseInt(row.count, 10);
        totalChunks += parseInt(row.count, 10);
      }

      totalDocs = project.sources.reduce(
        (sum, s) => sum + (s.source.documentCount || 0),
        0,
      );
    }

    return {
      project,
      stats: {
        memberCount: project.members.length,
        sourceCount: project.sources.length,
        contentEntries: contentCount,
        totalDocuments: totalDocs,
        totalChunks,
        chunkBreakdown: docStats,
      },
    };
  }

  // ─── Ownership Transfer ──────────────────────────────────

  async transferOwnership(projectId: string, newOwnerId: string, requesterId: string) {
    await this.requireRole(projectId, requesterId, ['lead']);

    const newOwnerMember = await this.memberRepo.findOne({
      where: { projectId, userId: newOwnerId },
      relations: ['user'],
    });
    if (!newOwnerMember) {
      throw new NotFoundException('Target user is not a member of this project. Add them first.');
    }

    const requesterMember = await this.memberRepo.findOneBy({
      projectId,
      userId: requesterId,
    });
    if (!requesterMember) {
      throw new NotFoundException('You are not a member of this project');
    }

    newOwnerMember.role = 'lead';
    requesterMember.role = 'contributor';
    await this.memberRepo.save([newOwnerMember, requesterMember]);

    this.logger.log(
      `Project ${projectId} ownership transferred from ${requesterId} to ${newOwnerId}`,
    );

    return {
      message: `Ownership transferred to ${newOwnerMember.user.email}`,
      newOwner: {
        userId: newOwnerMember.userId,
        email: newOwnerMember.user.email,
        name: newOwnerMember.user.name,
        role: newOwnerMember.role,
      },
    };
  }

  // ─── Invitations ─────────────────────────────────────────

  async inviteMember(projectId: string, dto: InviteProjectMemberDto, requesterId: string) {
    const project = await this.projectRepo.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    await this.requireRole(projectId, requesterId, ['lead']);

    const inviter = await this.userRepo.findOneBy({ id: requesterId });
    if (!inviter) throw new NotFoundException('Inviter not found');

    const existingUser = await this.userRepo.findOneBy({ email: dto.email });
    if (existingUser) {
      const existingMember = await this.memberRepo.findOneBy({
        projectId,
        userId: existingUser.id,
      });
      if (existingMember) {
        throw new ConflictException('This user is already a member of this project');
      }
    }

    const existingInvitation = await this.invitationRepo.findOne({
      where: { projectId, email: dto.email, status: 'pending' },
    });
    if (existingInvitation) {
      throw new ConflictException('An invitation is already pending for this email');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = this.invitationRepo.create({
      projectId,
      email: dto.email,
      role: dto.role || 'contributor',
      token,
      status: 'pending',
      invitedById: requesterId,
      expiresAt,
    });
    await this.invitationRepo.save(invitation);

    await this.emailService.sendProjectInvitation({
      email: dto.email,
      projectName: project.name,
      inviterName: inviter.name || inviter.email,
      role: invitation.role,
      token,
      expiresAt,
    });

    this.logger.log(
      `Invitation sent to ${dto.email} for project "${project.name}" by ${inviter.email}`,
    );

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      invitedBy: {
        id: inviter.id,
        email: inviter.email,
        name: inviter.name,
      },
    };
  }

  async listInvitations(projectId: string) {
    const project = await this.projectRepo.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const invitations = await this.invitationRepo.find({
      where: { projectId },
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      invitedBy: {
        id: inv.invitedBy.id,
        email: inv.invitedBy.email,
        name: inv.invitedBy.name,
      },
    }));
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.invitationRepo.findOne({
      where: { token },
      relations: ['project'],
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException(`This invitation has already been ${invitation.status}`);
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'expired';
      await this.invitationRepo.save(invitation);
      throw new BadRequestException('This invitation has expired');
    }

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const existingMember = await this.memberRepo.findOneBy({
      projectId: invitation.projectId,
      userId,
    });
    if (existingMember) {
      invitation.status = 'accepted';
      await this.invitationRepo.save(invitation);
      return {
        message: 'You are already a member of this project',
        projectId: invitation.projectId,
        projectSlug: invitation.project.slug,
        projectName: invitation.project.name,
      };
    }

    const member = this.memberRepo.create({
      projectId: invitation.projectId,
      userId,
      role: invitation.role,
    });
    await this.memberRepo.save(member);

    invitation.status = 'accepted';
    await this.invitationRepo.save(invitation);

    this.logger.log(
      `User "${user.email}" accepted invitation to project "${invitation.project.name}" as ${invitation.role}`,
    );

    return {
      message: `You have joined "${invitation.project.name}" as a ${invitation.role}`,
      projectId: invitation.projectId,
      projectSlug: invitation.project.slug,
      projectName: invitation.project.name,
      role: invitation.role,
    };
  }

  async getInvitationByToken(token: string) {
    const invitation = await this.invitationRepo.findOne({
      where: { token },
      relations: ['project', 'invitedBy'],
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      project: {
        id: invitation.project.id,
        name: invitation.project.name,
        slug: invitation.project.slug,
        description: invitation.project.description,
        logoUrl: invitation.project.logoUrl,
      },
      invitedBy: {
        id: invitation.invitedBy.id,
        email: invitation.invitedBy.email,
        name: invitation.invitedBy.name,
      },
    };
  }

  async cancelInvitation(projectId: string, invitationId: string, requesterId: string) {
    await this.requireRole(projectId, requesterId, ['lead']);

    const invitation = await this.invitationRepo.findOneBy({
      id: invitationId,
      projectId,
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException(`Cannot cancel an invitation that is already ${invitation.status}`);
    }

    await this.invitationRepo.remove(invitation);

    this.logger.log(
      `Invitation ${invitationId} cancelled for project ${projectId} by user ${requesterId}`,
    );

    return { message: 'Invitation cancelled' };
  }

  async resendInvitation(projectId: string, invitationId: string, requesterId: string) {
    await this.requireRole(projectId, requesterId, ['lead']);

    const invitation = await this.invitationRepo.findOne({
      where: { id: invitationId, projectId },
      relations: ['project'],
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException(`Cannot resend an invitation that is ${invitation.status}`);
    }

    const inviter = await this.userRepo.findOneBy({ id: requesterId });
    if (!inviter) throw new NotFoundException('User not found');

    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.invitationRepo.save(invitation);

    await this.emailService.sendProjectInvitation({
      email: invitation.email,
      projectName: invitation.project.name,
      inviterName: inviter.name || inviter.email,
      role: invitation.role,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
    });

    this.logger.log(
      `Invitation resent to ${invitation.email} for project "${invitation.project.name}"`,
    );

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      message: 'Invitation resent successfully',
    };
  }

  // ─── Authorization Helpers ──────────────────────────────

  async getUserRole(projectId: string, userId: string): Promise<ProjectRole | null> {
    const member = await this.memberRepo.findOneBy({ projectId, userId });
    return member?.role ?? null;
  }

  private async requireRole(
    projectId: string,
    userId: string,
    allowedRoles: ProjectRole[],
  ): Promise<ProjectMember> {
    const member = await this.memberRepo.findOneBy({ projectId, userId });
    if (!member) {
      throw new ForbiddenException('You are not a member of this project');
    }
    if (!allowedRoles.includes(member.role)) {
      throw new ForbiddenException(
        `This action requires one of these roles: ${allowedRoles.join(', ')}. You are a "${member.role}".`,
      );
    }
    return member;
  }

  // ─── Helpers ──────────────────────────────────────────────

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
