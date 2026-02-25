import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { API_KEY_SCOPES, TIER_RATE_LIMITS } from '../../entities/api-key.entity';
import { ApiKeysService } from './api-keys.service';

type MockRepo = {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  findOneBy: jest.Mock;
  remove: jest.Mock;
  findAndCount: jest.Mock;
  createQueryBuilder: jest.Mock;
};

function createRepo(): MockRepo {
  return {
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => v),
    find: jest.fn(),
    findOneBy: jest.fn(),
    remove: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

describe('ApiKeysService', () => {
  let apiKeyRepo: MockRepo;
  let usageRepo: MockRepo;
  let service: ApiKeysService;

  beforeEach(() => {
    apiKeyRepo = createRepo();
    usageRepo = createRepo();
    service = new ApiKeysService(apiKeyRepo as any, usageRepo as any);
  });

  it('creates key with defaults when scopes omitted', async () => {
    jest.spyOn(service as any, 'generateKey').mockReturnValue('tkp_abcdef1234567890abcdef1234567890abcdef12');

    apiKeyRepo.save.mockResolvedValue({
      id: 'key-1',
      name: 'Primary',
      keyPrefix: 'tkp_abcdef12',
      scopes: [...API_KEY_SCOPES],
      tier: 'premium',
      rateLimit: TIER_RATE_LIMITS.premium,
      isActive: true,
      totalRequests: 0,
      ownerId: 'owner-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.create({ name: 'Primary' } as any, 'owner-1');

    expect(apiKeyRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Primary',
        scopes: [...API_KEY_SCOPES],
        tier: 'premium',
        rateLimit: TIER_RATE_LIMITS.premium,
        ownerId: 'owner-1',
      }),
    );
    expect(result.key).toBe('tkp_abcdef1234567890abcdef1234567890abcdef12');
    expect(result.keyPrefix).toBe('tkp_abcdef12');
    expect(result.totalRequests).toBe(0);
  });

  it('creates key with explicit scopes and expiry', async () => {
    jest.spyOn(service as any, 'generateKey').mockReturnValue('tkp_0123456789abcdef0123456789abcdef01234567');
    apiKeyRepo.save.mockResolvedValue({
      id: 'key-2',
      name: 'Scoped',
      keyPrefix: 'tkp_01234567',
      scopes: ['ask'],
      tier: 'premium',
      rateLimit: TIER_RATE_LIMITS.premium,
      isActive: true,
      totalRequests: 0,
      ownerId: 'owner-1',
      expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      metadata: { app: 'portal' },
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await service.create(
      {
        name: 'Scoped',
        scopes: ['ask'],
        expiresAt: '2027-01-01T00:00:00.000Z',
        metadata: { app: 'portal' },
      } as any,
      'owner-1',
    );

    expect(apiKeyRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: ['ask'],
        expiresAt: new Date('2027-01-01T00:00:00.000Z'),
      }),
    );
  });

  it('lists keys by owner and serializes totals', async () => {
    apiKeyRepo.find.mockResolvedValue([
      {
        id: 'k1',
        name: 'K1',
        keyPrefix: 'tkp_k1',
        scopes: ['ask'],
        tier: 'premium',
        rateLimit: 600,
        isActive: true,
        totalRequests: '12',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await service.findAllByOwner('owner-1');

    expect(apiKeyRepo.find).toHaveBeenCalledWith({
      where: { ownerId: 'owner-1' },
      order: { createdAt: 'DESC' },
    });
    expect(result[0].totalRequests).toBe(12);
  });

  it('findOne throws when missing', async () => {
    apiKeyRepo.findOneBy.mockResolvedValue(null);
    await expect(service.findOne('k1', 'owner-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findOne throws when owner mismatches', async () => {
    apiKeyRepo.findOneBy.mockResolvedValue({ id: 'k1', ownerId: 'owner-2' });
    await expect(service.findOne('k1', 'owner-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('updates mutable fields', async () => {
    apiKeyRepo.findOneBy.mockResolvedValue({
      id: 'k1',
      ownerId: 'owner-1',
      name: 'Old',
      scopes: ['ask'],
      isActive: true,
      totalRequests: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    apiKeyRepo.save.mockResolvedValue({
      id: 'k1',
      ownerId: 'owner-1',
      name: 'New',
      scopes: ['search'],
      isActive: false,
      metadata: { p: 1 },
      tier: 'premium',
      rateLimit: 600,
      totalRequests: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.update(
      'k1',
      { name: 'New', scopes: ['search'], isActive: false, metadata: { p: 1 } } as any,
      'owner-1',
    );

    expect(result.name).toBe('New');
    expect(result.scopes).toEqual(['search']);
    expect(result.isActive).toBe(false);
  });

  it('removes own key', async () => {
    apiKeyRepo.findOneBy.mockResolvedValue({ id: 'k1', ownerId: 'owner-1', name: 'My Key' });
    const result = await service.remove('k1', 'owner-1');

    expect(apiKeyRepo.remove).toHaveBeenCalled();
    expect(result.message).toContain('revoked successfully');
  });

  it('rotates key and returns plaintext once', async () => {
    jest.spyOn(service as any, 'generateKey').mockReturnValue('tkp_rotated1234567890abcdef1234567890abcdef');
    apiKeyRepo.findOneBy.mockResolvedValue({
      id: 'k1',
      ownerId: 'owner-1',
      name: 'Key',
      scopes: ['ask'],
      tier: 'premium',
      rateLimit: 600,
      isActive: true,
      totalRequests: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    apiKeyRepo.save.mockImplementation(async (v) => ({ ...v }));

    const result = await service.rotate('k1', 'owner-1');

    expect(result.key).toBe('tkp_rotated1234567890abcdef1234567890abcdef');
    expect(result.keyPrefix).toBe('tkp_rotated1');
  });

  it('validateKey returns null for missing/inactive/expired keys', async () => {
    apiKeyRepo.findOneBy.mockResolvedValueOnce(null);
    expect(await service.validateKey('plain')).toBeNull();

    apiKeyRepo.findOneBy.mockResolvedValueOnce({ isActive: false });
    expect(await service.validateKey('plain')).toBeNull();

    apiKeyRepo.findOneBy.mockResolvedValueOnce({
      isActive: true,
      expiresAt: new Date(Date.now() - 60_000),
    });
    expect(await service.validateKey('plain')).toBeNull();
  });

  it('validateKey returns entity when valid', async () => {
    const key = { id: 'k1', isActive: true, expiresAt: new Date(Date.now() + 60_000) };
    apiKeyRepo.findOneBy.mockResolvedValue(key);
    expect(await service.validateKey('plain')).toBe(key);
  });

  it('checks scope membership', () => {
    expect(service.hasScope({ scopes: ['ask', 'search'] } as any, 'ask')).toBe(true);
    expect(service.hasScope({ scopes: ['ask'] } as any, 'content:read')).toBe(false);
  });

  it('records usage via query builder update expression', async () => {
    const execute = jest.fn();
    const where = jest.fn().mockReturnValue({ execute });
    const set = jest.fn().mockReturnValue({ where });
    const update = jest.fn().mockReturnValue({ set });
    apiKeyRepo.createQueryBuilder.mockReturnValue({ update });

    await service.recordUsage('k1');

    expect(update).toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        totalRequests: expect.any(Function),
        lastUsedAt: expect.any(Date),
      }),
    );
    expect(where).toHaveBeenCalledWith('id = :id', { id: 'k1' });
    expect(execute).toHaveBeenCalled();
  });

  it('logs usage rows', async () => {
    usageRepo.create.mockReturnValue({ id: 'log-1' });

    await service.logUsage({
      apiKeyId: 'k1',
      endpoint: '/ask',
      method: 'POST',
      statusCode: 200,
    });

    expect(usageRepo.create).toHaveBeenCalled();
    expect(usageRepo.save).toHaveBeenCalledWith({ id: 'log-1' });
  });

  it('returns paginated usage history and hasMore flag', async () => {
    apiKeyRepo.findOneBy.mockResolvedValue({ id: 'k1', ownerId: 'owner-1' });
    usageRepo.findAndCount.mockResolvedValue([[{ id: 'u1' }], 3]);

    const result = await service.getUsage('k1', 'owner-1', 1, 2);

    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(2);
    expect(result.hasMore).toBe(true);
  });

  it('getUsage enforces ownership', async () => {
    apiKeyRepo.findOneBy.mockResolvedValue({ id: 'k1', ownerId: 'owner-2' });
    await expect(service.getUsage('k1', 'owner-1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
