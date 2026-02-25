import { BadRequestException } from '@nestjs/common';

jest.mock('@octokit/rest', () => {
  class MockOctokit {
    static plugin = jest.fn(() => MockOctokit);
  }
  return { Octokit: MockOctokit };
});

jest.mock('@octokit/plugin-throttling', () => ({
  throttling: jest.fn(() => ({})),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000000'),
}));

const { FileUploadController } = require('./file-upload.controller');

describe('FileUploadController', () => {
  const sourceRepo = {
    create: jest.fn((v) => v),
    save: jest.fn(),
  };
  const parser = {
    parseFilesToRawDocuments: jest.fn(),
    getSupportedFormats: jest.fn(),
  };
  const ingestion = {
    ingestRawDocuments: jest.fn(),
  };

  let controller: any;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new FileUploadController(sourceRepo as any, parser as any, ingestion as any);
  });

  it('rejects empty upload list', async () => {
    await expect(controller.uploadFiles([] as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when no readable documents are parsed', async () => {
    parser.parseFilesToRawDocuments.mockResolvedValue([]);

    await expect(
      controller.uploadFiles([{ originalname: 'x.txt', size: 1, mimetype: 'text/plain' }] as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates source and starts background ingestion for single file', async () => {
    const files = [
      { originalname: 'guide.txt', size: 10, mimetype: 'text/plain' },
    ] as any;

    const rawDocs = [{ title: 'guide', content: 'hello', metadata: {} }];
    parser.parseFilesToRawDocuments.mockResolvedValue(rawDocs);
    sourceRepo.save.mockResolvedValue({
      id: 'source-1',
      name: 'guide.txt',
      type: 'file_upload',
      status: 'syncing',
    });
    ingestion.ingestRawDocuments.mockResolvedValue(undefined);

    const immediateSpy = jest
      .spyOn(global, 'setImmediate')
      .mockImplementation(((cb: (...args: any[]) => void) => {
        cb();
        return 0 as any;
      }) as any);

    const result = await controller.uploadFiles(files);

    expect(sourceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'guide.txt',
        type: 'file_upload',
        status: 'syncing',
      }),
    );
    expect(ingestion.ingestRawDocuments).toHaveBeenCalledWith('source-1', rawDocs);
    expect(result.message).toContain('uploaded and ingestion started');
    expect(result.source.fileCount).toBe(1);

    immediateSpy.mockRestore();
  });

  it('names source by file count for multi-file uploads', async () => {
    const files = [
      { originalname: 'a.txt', size: 10, mimetype: 'text/plain' },
      { originalname: 'b.txt', size: 12, mimetype: 'text/plain' },
    ] as any;

    parser.parseFilesToRawDocuments.mockResolvedValue([
      { title: 'a', content: 'a', metadata: {} },
      { title: 'b', content: 'b', metadata: {} },
    ]);
    sourceRepo.save.mockResolvedValue({ id: 'source-2', name: '2 uploaded files', type: 'file_upload', status: 'syncing' });

    const immediateSpy = jest
      .spyOn(global, 'setImmediate')
      .mockImplementation(((cb: (...args: any[]) => void) => {
        cb();
        return 0 as any;
      }) as any);

    await controller.uploadFiles(files);

    expect(sourceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: '2 uploaded files' }),
    );

    immediateSpy.mockRestore();
  });

  it('returns supported formats and limits', () => {
    parser.getSupportedFormats.mockReturnValue(['.txt', '.pdf']);
    expect(controller.getSupportedFormats()).toEqual({
      formats: ['.txt', '.pdf'],
      maxFileSize: 20 * 1024 * 1024,
      maxFileSizeHuman: '20 MB',
      maxFiles: 10,
    });
  });
});
