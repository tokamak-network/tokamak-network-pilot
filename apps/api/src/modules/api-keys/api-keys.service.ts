import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import {
  ApiKey,
  ApiKeyScope,
  API_KEY_SCOPES,
  TIER_RATE_LIMITS,
} from '../../entities/api-key.entity';
import { ApiKeyUsageLog } from '../../entities/api-key-usage.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

/** Prefix for all Tokamak Pilot API keys */
const KEY_PREFIX = 'tkp_';
/** Length of random hex string appended to the prefix */
const KEY_RANDOM_LENGTH = 40;

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
    @InjectRepository(ApiKeyUsageLog)
    private readonly usageRepo: Repository<ApiKeyUsageLog>,
  ) {}

  // ───────────────────── Key Generation ─────────────────────

  /** Generate a new plaintext key with the `tkp_` prefix */
  private generateKey(): string {
    const random = randomBytes(KEY_RANDOM_LENGTH / 2).toString('hex');
    return `${KEY_PREFIX}${random}`;
  }

  /** SHA-256 hash of a plaintext key */
  private hashKey(plaintext: string): string {
    return createHash('sha256').update(plaintext).digest('hex');
  }

  /** Extract display prefix from a plaintext key (e.g. "tkp_a1b2c3d4") */
  private extractPrefix(plaintext: string): string {
    return plaintext.slice(0, 12);
  }

  // ───────────────────── CRUD ─────────────────────

  /**
   * Create a new API key for the given user.
   * Returns the plaintext key **once** — it is never stored.
   */
  async create(dto: CreateApiKeyDto, ownerId: string) {
    const plaintext = this.generateKey();
    const keyHash = this.hashKey(plaintext);
    const keyPrefix = this.extractPrefix(plaintext);

    const scopes: ApiKeyScope[] =
      dto.scopes && dto.scopes.length > 0
        ? dto.scopes
        : ([...API_KEY_SCOPES] as ApiKeyScope[]);

    const tier = 'premium' as const;
    const rateLimit = TIER_RATE_LIMITS[tier];

    const apiKey = this.apiKeyRepo.create({
      name: dto.name,
      keyHash,
      keyPrefix,
      scopes,
      tier,
      rateLimit,
      ownerId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      metadata: dto.metadata,
    });

    const saved = await this.apiKeyRepo.save(apiKey);
    this.logger.log(
      `API key created: "${saved.name}" (${keyPrefix}...) for user ${ownerId}`,
    );

    return {
      ...this.serialize(saved),
      /** The plaintext key — shown only once */
      key: plaintext,
    };
  }

  /** List all API keys owned by a user */
  async findAllByOwner(ownerId: string) {
    const keys = await this.apiKeyRepo.find({
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
    return keys.map((k) => this.serialize(k));
  }

  /** Get a single key by ID (must belong to the requesting user) */
  async findOne(id: string, ownerId: string) {
    const key = await this.apiKeyRepo.findOneBy({ id });
    if (!key) throw new NotFoundException(`API key ${id} not found`);
    if (key.ownerId !== ownerId) {
      throw new ForbiddenException('You can only access your own API keys');
    }
    return this.serialize(key);
  }

  /** Update a key's mutable fields */
  async update(id: string, dto: UpdateApiKeyDto, ownerId: string) {
    const key = await this.apiKeyRepo.findOneBy({ id });
    if (!key) throw new NotFoundException(`API key ${id} not found`);
    if (key.ownerId !== ownerId) {
      throw new ForbiddenException('You can only update your own API keys');
    }

    if (dto.name !== undefined) key.name = dto.name;
    if (dto.scopes !== undefined) key.scopes = dto.scopes;
    if (dto.isActive !== undefined) key.isActive = dto.isActive;
    if (dto.metadata !== undefined) key.metadata = dto.metadata;

    const updated = await this.apiKeyRepo.save(key);
    this.logger.log(`API key ${id} updated by user ${ownerId}`);
    return this.serialize(updated);
  }

  /** Delete/revoke an API key */
  async remove(id: string, ownerId: string) {
    const key = await this.apiKeyRepo.findOneBy({ id });
    if (!key) throw new NotFoundException(`API key ${id} not found`);
    if (key.ownerId !== ownerId) {
      throw new ForbiddenException('You can only delete your own API keys');
    }

    await this.apiKeyRepo.remove(key);
    this.logger.log(`API key ${id} revoked by user ${ownerId}`);
    return { message: `API key "${key.name}" revoked successfully` };
  }

  /**
   * Rotate a key — generates a new secret, invalidates the old one.
   * Returns the new plaintext key (shown once).
   */
  async rotate(id: string, ownerId: string) {
    const key = await this.apiKeyRepo.findOneBy({ id });
    if (!key) throw new NotFoundException(`API key ${id} not found`);
    if (key.ownerId !== ownerId) {
      throw new ForbiddenException('You can only rotate your own API keys');
    }

    const plaintext = this.generateKey();
    key.keyHash = this.hashKey(plaintext);
    key.keyPrefix = this.extractPrefix(plaintext);

    const saved = await this.apiKeyRepo.save(key);
    this.logger.log(`API key ${id} rotated by user ${ownerId}`);

    return {
      ...this.serialize(saved),
      key: plaintext,
    };
  }

  // ───────────────────── Validation (used by guard) ─────────

  /**
   * Validate a plaintext API key.
   * Returns the ApiKey entity if valid, or null.
   */
  async validateKey(plaintext: string): Promise<ApiKey | null> {
    const hash = this.hashKey(plaintext);
    const key = await this.apiKeyRepo.findOneBy({ keyHash: hash });

    if (!key) return null;
    if (!key.isActive) return null;
    if (key.expiresAt && key.expiresAt < new Date()) return null;

    return key;
  }

  /** Check if an API key has a specific scope */
  hasScope(key: ApiKey, scope: ApiKeyScope): boolean {
    return key.scopes.includes(scope);
  }

  // ───────────────────── Usage Tracking ─────────────────────

  /** Increment totalRequests and update lastUsedAt (fire-and-forget) */
  async recordUsage(keyId: string): Promise<void> {
    await this.apiKeyRepo
      .createQueryBuilder()
      .update(ApiKey)
      .set({
        totalRequests: () => '"totalRequests" + 1',
        lastUsedAt: new Date(),
      })
      .where('id = :id', { id: keyId })
      .execute();
  }

  /** Log a detailed usage entry */
  async logUsage(entry: {
    apiKeyId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTimeMs?: number;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    const log = this.usageRepo.create(entry);
    await this.usageRepo.save(log);
  }

  /** Get usage history for a key (paginated) */
  async getUsage(
    keyId: string,
    ownerId: string,
    page = 1,
    limit = 50,
  ) {
    // Verify ownership
    const key = await this.apiKeyRepo.findOneBy({ id: keyId });
    if (!key) throw new NotFoundException(`API key ${keyId} not found`);
    if (key.ownerId !== ownerId) {
      throw new ForbiddenException('You can only view usage of your own API keys');
    }

    const [logs, total] = await this.usageRepo.findAndCount({
      where: { apiKeyId: keyId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: logs,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  }

  // ───────────────────── Helpers ─────────────────────

  /** Strip sensitive fields from the entity for API responses */
  private serialize(key: ApiKey) {
    return {
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      tier: key.tier,
      rateLimit: key.rateLimit,
      isActive: key.isActive,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      totalRequests: Number(key.totalRequests),
      metadata: key.metadata,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    };
  }
}
