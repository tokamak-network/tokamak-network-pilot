import { ApiKeysController } from './api-keys.controller';

describe('ApiKeysController', () => {
  const service = {
    create: jest.fn(),
    findAllByOwner: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    rotate: jest.fn(),
    getUsage: jest.fn(),
  };

  const req = { user: { sub: 'user-1' } };

  let controller: ApiKeysController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ApiKeysController(service as any);
  });

  it('delegates create', async () => {
    const dto = { name: 'K' } as any;
    service.create.mockResolvedValue({ id: 'k1' });

    await expect(controller.create(dto, req)).resolves.toEqual({ id: 'k1' });
    expect(service.create).toHaveBeenCalledWith(dto, 'user-1');
  });

  it('delegates findAll', async () => {
    service.findAllByOwner.mockResolvedValue([{ id: 'k1' }]);
    await expect(controller.findAll(req)).resolves.toEqual([{ id: 'k1' }]);
    expect(service.findAllByOwner).toHaveBeenCalledWith('user-1');
  });

  it('delegates findOne/update/remove/rotate', async () => {
    const dto = { name: 'N' } as any;
    await controller.findOne('k1', req);
    await controller.update('k1', dto, req);
    await controller.remove('k1', req);
    await controller.rotate('k1', req);

    expect(service.findOne).toHaveBeenCalledWith('k1', 'user-1');
    expect(service.update).toHaveBeenCalledWith('k1', dto, 'user-1');
    expect(service.remove).toHaveBeenCalledWith('k1', 'user-1');
    expect(service.rotate).toHaveBeenCalledWith('k1', 'user-1');
  });

  it('normalizes page/limit query params in getUsage', async () => {
    await controller.getUsage('k1', '2' as any, '10' as any, req);
    expect(service.getUsage).toHaveBeenCalledWith('k1', 'user-1', 2, 10);

    await controller.getUsage('k1', undefined as any, undefined as any, req);
    expect(service.getUsage).toHaveBeenCalledWith('k1', 'user-1', 1, 50);
  });
});
