import { LlmsTxtController } from './llms-txt.controller';

describe('LlmsTxtController', () => {
  const service = {
    generateBrief: jest.fn(),
    generateFull: jest.fn(),
  };

  let controller: LlmsTxtController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new LlmsTxtController(service as any);
  });

  it('returns brief llms text', async () => {
    service.generateBrief.mockResolvedValue('brief');
    await expect(controller.getLlmsTxt()).resolves.toBe('brief');
    expect(service.generateBrief).toHaveBeenCalledTimes(1);
  });

  it('returns full llms text', async () => {
    service.generateFull.mockResolvedValue('full');
    await expect(controller.getLlmsFullTxt()).resolves.toBe('full');
    expect(service.generateFull).toHaveBeenCalledTimes(1);
  });
});
