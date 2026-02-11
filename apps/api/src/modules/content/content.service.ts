import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentEntry } from '../../entities/content-entry.entity';
import { CreateContentDto, UpdateContentDto } from './dto/content.dto';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    @InjectRepository(ContentEntry)
    private readonly entryRepo: Repository<ContentEntry>,
  ) {}

  async findAll(filters: {
    project?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const { project, category, page = 1, limit = 20 } = filters;

    const qb = this.entryRepo
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.author', 'author')
      .orderBy('entry.updatedAt', 'DESC');

    if (project) {
      qb.andWhere('entry.project = :project', { project });
    }
    if (category) {
      qb.andWhere('entry.category = :category', { category });
    }

    qb.skip((page - 1) * limit).take(limit);

    const [entries, total] = await qb.getManyAndCount();

    return {
      data: entries.map((e) => this.serialize(e)),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  async findOne(id: string) {
    const entry = await this.entryRepo.findOne({
      where: { id },
      relations: ['author'],
    });
    if (!entry) {
      throw new NotFoundException(`Content entry ${id} not found`);
    }
    return this.serialize(entry);
  }

  async create(dto: CreateContentDto, authorId: string) {
    const entry = this.entryRepo.create({
      ...dto,
      tags: dto.tags || [],
      authorId,
    });
    const saved = await this.entryRepo.save(entry);
    this.logger.log(`Content created: "${saved.title}" by ${authorId}`);
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateContentDto) {
    const entry = await this.entryRepo.findOneBy({ id });
    if (!entry) {
      throw new NotFoundException(`Content entry ${id} not found`);
    }

    Object.assign(entry, dto);
    if (dto.tags !== undefined) {
      entry.tags = dto.tags;
    }

    await this.entryRepo.save(entry);
    this.logger.log(`Content updated: "${entry.title}" (${id})`);
    return this.findOne(id);
  }

  async remove(id: string) {
    const entry = await this.entryRepo.findOneBy({ id });
    if (!entry) {
      throw new NotFoundException(`Content entry ${id} not found`);
    }

    await this.entryRepo.remove(entry);
    this.logger.log(`Content removed: "${entry.title}" (${id})`);
    return { message: `Content entry "${entry.title}" deleted` };
  }

  // ─── Helpers ─────────────────────────────────────────────

  private serialize(entry: ContentEntry) {
    return {
      id: entry.id,
      title: entry.title,
      body: entry.body,
      project: entry.project,
      category: entry.category,
      tags: entry.tags,
      isOutdated: entry.isOutdated,
      authorId: entry.authorId,
      author: entry.author
        ? {
            id: entry.author.id,
            email: entry.author.email,
            name: entry.author.name,
            role: entry.author.role,
          }
        : undefined,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}
