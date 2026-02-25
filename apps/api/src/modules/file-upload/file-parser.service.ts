import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import type { RawDocument } from '../ingestion/ingestion.types';
import type { ContentType } from '../../entities/document.entity';

/** Supported MIME types and their extensions */
const SUPPORTED_TYPES: Record<string, { extensions: string[]; contentType: ContentType }> = {
  'application/pdf': { extensions: ['.pdf'], contentType: 'documentation' },
  'text/markdown': { extensions: ['.md', '.mdx'], contentType: 'documentation' },
  'text/plain': { extensions: ['.txt'], contentType: 'documentation' },
  'text/csv': { extensions: ['.csv'], contentType: 'other' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extensions: ['.docx'],
    contentType: 'documentation',
  },
};

/** Flat set of all supported extensions */
const ALL_EXTENSIONS = Object.values(SUPPORTED_TYPES).flatMap((t) => t.extensions);

export interface ParsedFile {
  title: string;
  content: string;
  contentType: ContentType;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

@Injectable()
export class FileParserService {
  private readonly logger = new Logger(FileParserService.name);

  /** Get human-readable list of supported formats */
  getSupportedFormats(): string[] {
    return ALL_EXTENSIONS;
  }

  /** Validate that a file is supported */
  validateFile(file: Express.Multer.File): void {
    const ext = this.getExtension(file.originalname);
    if (!ALL_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `Unsupported file type "${ext}". Supported: ${ALL_EXTENSIONS.join(', ')}`,
      );
    }
  }

  /**
   * Parse a single uploaded file into text content.
   */
  async parseFile(file: Express.Multer.File): Promise<ParsedFile> {
    this.validateFile(file);

    const ext = this.getExtension(file.originalname);
    const title = this.getBaseName(file.originalname);

    this.logger.log(`Parsing file: "${file.originalname}" (${ext}, ${this.formatBytes(file.size)})`);

    let content: string;

    switch (ext) {
      case '.pdf':
        content = await this.parsePdf(file.buffer);
        break;
      case '.docx':
        content = await this.parseDocx(file.buffer);
        break;
      case '.md':
      case '.mdx':
        content = this.parseText(file.buffer);
        break;
      case '.txt':
        content = this.parseText(file.buffer);
        break;
      case '.csv':
        content = this.parseCsv(file.buffer);
        break;
      default:
        throw new BadRequestException(`Unsupported file extension: ${ext}`);
    }

    // Determine content type from extension
    const typeInfo = Object.values(SUPPORTED_TYPES).find((t) => t.extensions.includes(ext));
    const contentType = typeInfo?.contentType ?? 'other';

    if (!content || content.trim().length === 0) {
      throw new BadRequestException(
        `File "${file.originalname}" produced no readable text content`,
      );
    }

    this.logger.log(
      `Parsed "${file.originalname}": ${content.length} chars extracted`,
    );

    return {
      title,
      content: content.trim(),
      contentType,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }

  /**
   * Parse multiple files and convert to RawDocument format for the ingestion pipeline.
   */
  async parseFilesToRawDocuments(files: Express.Multer.File[]): Promise<RawDocument[]> {
    const rawDocs: RawDocument[] = [];

    for (const file of files) {
      try {
        const parsed = await this.parseFile(file);
        rawDocs.push({
          title: parsed.title,
          content: parsed.content,
          contentType: parsed.contentType,
          url: '', // uploaded files have no URL
          metadata: {
            originalName: parsed.originalName,
            mimeType: parsed.mimeType,
            sizeBytes: parsed.sizeBytes,
            uploadedAt: new Date().toISOString(),
          },
        });
      } catch (error: any) {
        this.logger.warn(
          `Skipping file "${file.originalname}": ${error.message}`,
        );
        // Continue processing other files even if one fails
      }
    }

    return rawDocs;
  }

  // ── Private parsers ──────────────────────────────────────

  private async parsePdf(buffer: Buffer): Promise<string> {
    try {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      await parser.destroy();
      return result.text;
    } catch (error: any) {
      throw new BadRequestException(`Failed to parse PDF: ${error.message}`);
    }
  }

  private async parseDocx(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      if (result.messages.length > 0) {
        this.logger.debug(
          `DOCX parsing messages: ${result.messages.map((m) => m.message).join(', ')}`,
        );
      }
      return result.value;
    } catch (error: any) {
      throw new BadRequestException(`Failed to parse DOCX: ${error.message}`);
    }
  }

  private parseText(buffer: Buffer): string {
    return buffer.toString('utf-8');
  }

  private parseCsv(buffer: Buffer): string {
    // Convert CSV to a readable text format for the LLM
    const raw = buffer.toString('utf-8');
    const lines = raw.split('\n').filter((line) => line.trim());

    if (lines.length === 0) return '';

    // Parse header and create a structured text representation
    const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1);

    // Build a readable text representation
    const parts: string[] = [`Table with ${rows.length} rows and ${header.length} columns.`, `Columns: ${header.join(', ')}`, ''];

    for (const row of rows) {
      const values = row.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const entries = header
        .map((col, i) => `${col}: ${values[i] || ''}`)
        .join(', ');
      parts.push(entries);
    }

    return parts.join('\n');
  }

  // ── Utilities ────────────────────────────────────────────

  private getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : '';
  }

  private getBaseName(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    const name = lastDot >= 0 ? filename.slice(0, lastDot) : filename;
    // Clean up underscores and hyphens for a nicer title
    return name.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
