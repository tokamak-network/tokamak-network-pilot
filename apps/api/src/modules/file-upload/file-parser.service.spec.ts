import { BadRequestException } from '@nestjs/common';
import { FileParserService } from './file-parser.service';

const mockGetText = jest.fn();
const mockDestroy = jest.fn();

jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: mockGetText,
    destroy: mockDestroy,
  })),
}));

const mockExtractRawText = jest.fn();
jest.mock('mammoth', () => ({
  extractRawText: (...args: any[]) => mockExtractRawText(...args),
}));

describe('FileParserService', () => {
  let service: FileParserService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FileParserService();
  });

  it('lists supported extensions', () => {
    const formats = service.getSupportedFormats();
    expect(formats).toEqual(expect.arrayContaining(['.pdf', '.md', '.txt', '.csv', '.docx']));
  });

  it('rejects unsupported extensions', () => {
    expect(() =>
      service.validateFile({ originalname: 'archive.zip' } as any),
    ).toThrow(BadRequestException);
  });

  it('parses plain text files and normalizes title', async () => {
    const result = await service.parseFile({
      originalname: 'my_notes-file.txt',
      mimetype: 'text/plain',
      size: 6,
      buffer: Buffer.from('hello\n'),
    } as any);

    expect(result.title).toBe('my notes file');
    expect(result.content).toBe('hello');
    expect(result.contentType).toBe('documentation');
  });

  it('parses csv files into readable rows', async () => {
    const result = await service.parseFile({
      originalname: 'table.csv',
      mimetype: 'text/csv',
      size: 24,
      buffer: Buffer.from('name,age\nAlice,30\nBob,40\n'),
    } as any);

    expect(result.content).toContain('Table with 2 rows and 2 columns.');
    expect(result.content).toContain('name: Alice, age: 30');
  });

  it('parses pdf and docx via parser integrations', async () => {
    mockGetText.mockResolvedValue({ text: 'PDF CONTENT' });
    mockExtractRawText.mockResolvedValue({ value: 'DOCX CONTENT', messages: [{ message: 'note' }] });

    const pdf = await service.parseFile({
      originalname: 'guide.pdf',
      mimetype: 'application/pdf',
      size: 100,
      buffer: Buffer.from('pdf-bytes'),
    } as any);

    const docx = await service.parseFile({
      originalname: 'guide.docx',
      mimetype:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 100,
      buffer: Buffer.from('docx-bytes'),
    } as any);

    expect(pdf.content).toBe('PDF CONTENT');
    expect(docx.content).toBe('DOCX CONTENT');
    expect(mockDestroy).toHaveBeenCalled();
  });

  it('throws when parsed content is empty', async () => {
    await expect(
      service.parseFile({
        originalname: 'empty.txt',
        mimetype: 'text/plain',
        size: 0,
        buffer: Buffer.from('   '),
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('parses multiple files and skips failed ones', async () => {
    const files = [
      {
        originalname: 'ok.txt',
        mimetype: 'text/plain',
        size: 5,
        buffer: Buffer.from('hello'),
      },
      {
        originalname: 'bad.zip',
        mimetype: 'application/zip',
        size: 5,
        buffer: Buffer.from('zip'),
      },
    ] as any;

    const docs = await service.parseFilesToRawDocuments(files);

    expect(docs).toHaveLength(1);
    expect(docs[0].title).toBe('ok');
    expect(docs[0].metadata.originalName).toBe('ok.txt');
    expect(new Date(docs[0].metadata.uploadedAt as string).toISOString()).toBe(
      docs[0].metadata.uploadedAt,
    );
  });
});
