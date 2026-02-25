import { FeedbackController } from './feedback.controller';

describe('FeedbackController', () => {
  const service = {
    submit: jest.fn(),
    getForMessage: jest.fn(),
    stats: jest.fn(),
    suggestedQuestions: jest.fn(),
  };

  let controller: FeedbackController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new FeedbackController(service as any);
  });

  it('delegates submit to service with authenticated user id', async () => {
    const dto = { messageId: 'm1', rating: 'up' } as any;
    const req = { user: { id: 'u1' } };

    service.submit.mockResolvedValue({ id: 'f1' });
    await expect(controller.submit(dto, req)).resolves.toEqual({ id: 'f1' });
    expect(service.submit).toHaveBeenCalledWith(dto, 'u1');
  });

  it('delegates getForMessage and stats', async () => {
    const req = { user: { id: 'u1' } };

    await controller.getForMessage('m1', req);
    await controller.stats();

    expect(service.getForMessage).toHaveBeenCalledWith('m1', 'u1');
    expect(service.stats).toHaveBeenCalledTimes(1);
  });

  it('normalizes suggested question limit query', async () => {
    await controller.suggestedQuestions('7' as any);
    expect(service.suggestedQuestions).toHaveBeenCalledWith(7);

    await controller.suggestedQuestions(undefined as any);
    expect(service.suggestedQuestions).toHaveBeenCalledWith(undefined);
  });
});
