import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../../entities/project.entity';
import { ProjectMember } from '../../entities/project-member.entity';
import { ProjectSource } from '../../entities/project-source.entity';
import { Source } from '../../entities/source.entity';
import { User } from '../../entities/user.entity';
import { Document } from '../../entities/document.entity';
import { LlmService } from '../llm/llm.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  AddProjectMemberDto,
  UpdateProjectMemberDto,
  AddProjectSourceDto,
} from './dto/project.dto';

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
    @InjectRepository(Source)
    private readonly sourceRepo: Repository<Source>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Document)
    private readonly documentRepo: Repository<Document>,
    private readonly llm: LlmService,
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

  async update(id: string, dto: UpdateProjectDto) {
    const project = await this.projectRepo.findOneBy({ id });
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

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
    if (dto.summary !== undefined) {
      project.summary = dto.summary;
      project.summaryUpdatedAt = new Date();
    }

    await this.projectRepo.save(project);
    this.logger.log(`Project ${id} updated`);

    return this.findOne(id);
  }

  async remove(id: string) {
    const project = await this.projectRepo.findOneBy({ id });
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    await this.projectRepo.remove(project);
    this.logger.log(`Project "${project.name}" removed`);
    return { message: `Project "${project.name}" removed successfully` };
  }

  // ─── Source Mapping ───────────────────────────────────────

  async addSource(projectId: string, dto: AddProjectSourceDto) {
    const project = await this.projectRepo.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

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

  async removeSource(projectId: string, sourceId: string) {
    const ps = await this.projectSourceRepo.findOneBy({ projectId, sourceId });
    if (!ps) throw new NotFoundException('Source is not assigned to this project');

    await this.projectSourceRepo.remove(ps);
    this.logger.log(`Source ${sourceId} removed from project ${projectId}`);
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

  async addMember(projectId: string, dto: AddProjectMemberDto) {
    const project = await this.projectRepo.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

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
  ) {
    const member = await this.memberRepo.findOne({
      where: { projectId, userId },
      relations: ['user'],
    });
    if (!member) {
      throw new NotFoundException('Member not found in this project');
    }

    member.role = dto.role;
    await this.memberRepo.save(member);

    this.logger.log(`Member ${userId} role updated to ${dto.role} in project ${projectId}`);
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

  async removeMember(projectId: string, userId: string) {
    const member = await this.memberRepo.findOneBy({ projectId, userId });
    if (!member) {
      throw new NotFoundException('Member not found in this project');
    }

    await this.memberRepo.remove(member);
    this.logger.log(`Member ${userId} removed from project ${projectId}`);
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

  async generateSummary(projectId: string) {
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

    const [members, projectSources] = await Promise.all([
      this.memberRepo.find({
        where: { projectId: project.id },
        relations: ['user'],
        order: { role: 'ASC', joinedAt: 'ASC' },
      }),
      this.projectSourceRepo.find({
        where: { projectId: project.id },
        relations: ['source'],
      }),
    ]);

    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      logoUrl: project.logoUrl,
      links: project.links,
      summary: project.summary,
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

  // ─── Helpers ──────────────────────────────────────────────

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
