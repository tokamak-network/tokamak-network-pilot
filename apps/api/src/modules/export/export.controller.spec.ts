import { BadRequestException } from '@nestjs/common';
import { ExportController } from './export.controller';

describe('ExportController', () => {
  const exportService = {
    exportContent: jest.fn(),
    exportProject: jest.fn(),
    exportAnswer: jest.fn(),
    formatAsAiPrompt: jest.fn(),
  };

  const makeRes = () => ({
    setHeader: jest.fn(),
    send: jest.fn(),
  });

  let controller: ExportController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ExportController(exportService as any);
  });

  it('exports content and writes response headers', async () => {
    const res = makeRes();
    exportService.exportContent.mockResolvedValue({
      data: 'hello',
      contentType: 'application/json; charset=utf-8',
      filename: 'x.json',
    });

    await controller.exportContent('c1', 'json', res as any);

    expect(exportService.exportContent).toHaveBeenCalledWith('c1', 'json');
    expect(res.setHeader).toHaveBeenNthCalledWith(1, 'Content-Type', 'application/json; charset=utf-8');
    expect(res.setHeader).toHaveBeenNthCalledWith(2, 'Content-Disposition', 'attachment; filename="x.json"');
    expect(res.send).toHaveBeenCalledWith('hello');
  });

  it('accepts md alias and rejects invalid formats', async () => {
    const res = makeRes();
    exportService.exportProject.mockResolvedValue({
      data: '# p',
      contentType: 'text/markdown; charset=utf-8',
      filename: 'p.md',
    });

    await controller.exportProject('p1', 'md', res as any);
    expect(exportService.exportProject).toHaveBeenCalledWith('p1', 'markdown');

    await expect(controller.exportProject('p1', 'xml', res as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('exports answer and formats prompt', () => {
    const res = makeRes();
    exportService.exportAnswer.mockReturnValue({
      data: 'x',
      contentType: 'application/json; charset=utf-8',
      filename: 'a.json',
    });
    exportService.formatAsAiPrompt.mockReturnValue('PROMPT');

    controller.exportAnswer(
      { question: 'q', answer: 'a', sources: [], confidence: 0.7 },
      'json',
      res as any,
    );
    expect(exportService.exportAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ question: 'q' }),
      'json',
    );

    expect(controller.formatAsPrompt({ type: 'answer', body: 'x' } as any)).toEqual({
      prompt: 'PROMPT',
    });
  });
});
