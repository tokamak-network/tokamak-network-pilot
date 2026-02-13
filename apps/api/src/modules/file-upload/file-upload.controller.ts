import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Source, SourceType } from '../../entities/source.entity';
import { FileParserService } from './file-parser.service';
import { IngestionService } from '../ingestion/ingestion.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/** Max file size: 20 MB */
const MAX_FILE_SIZE = 20 * 1024 * 1024;
/** Max files per upload: 10 */
const MAX_FILES = 10;

@ApiTags('sources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sources')
export class FileUploadController {
  private readonly logger = new Logger(FileUploadController.name);

  constructor(
    @InjectRepository(Source)
    private readonly sourceRepo: Repository<Source>,
    private readonly parser: FileParserService,
    private readonly ingestion: IngestionService,
  ) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Upload files to create a knowledge source',
    description:
      'Upload one or more files (PDF, Markdown, TXT, DOCX, CSV). ' +
      'Each upload creates a new source of type "file_upload" and triggers ingestion. ' +
      'Max 10 files per request, 20 MB each.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Files to upload (PDF, MD, TXT, DOCX, CSV)',
        },
        name: {
          type: 'string',
          description: 'Optional name for the source (defaults to filename)',
        },
      },
      required: ['files'],
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', MAX_FILES, {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'text/markdown',
          'text/plain',
          'text/csv',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          // Some browsers send these for .md files
          'application/octet-stream',
          'text/x-markdown',
        ];
        const allowedExts = ['.pdf', '.md', '.mdx', '.txt', '.csv', '.docx'];
        const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();

        if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `File type "${file.mimetype}" (${ext}) is not supported. Allowed: PDF, Markdown, TXT, DOCX, CSV`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    this.logger.log(
      `Received ${files.length} file(s): ${files.map((f) => f.originalname).join(', ')}`,
    );

    // 1. Parse all files to text
    const rawDocs = await this.parser.parseFilesToRawDocuments(files);

    if (rawDocs.length === 0) {
      throw new BadRequestException(
        'None of the uploaded files produced readable content',
      );
    }

    // 2. Build a descriptive source name
    const sourceName =
      files.length === 1
        ? files[0].originalname
        : `${files.length} uploaded files`;

    // 3. Create a source record
    const source = this.sourceRepo.create({
      name: sourceName,
      type: 'file_upload' as SourceType,
      status: 'syncing',
      config: {
        files: files.map((f) => ({
          name: f.originalname,
          size: f.size,
          mime: f.mimetype,
        })),
        uploadedAt: new Date().toISOString(),
      },
    });
    const saved = await this.sourceRepo.save(source);

    this.logger.log(
      `Created file_upload source "${saved.name}" (id=${saved.id}), starting ingestion...`,
    );

    // 4. Ingest asynchronously (don't block the response)
    //    We use setImmediate so the HTTP response returns immediately.
    setImmediate(() => {
      this.ingestion.ingestRawDocuments(saved.id, rawDocs).catch((err) => {
        this.logger.error(
          `Background ingestion failed for source ${saved.id}: ${err.message}`,
        );
      });
    });

    return {
      message: `${rawDocs.length} file(s) uploaded and ingestion started`,
      source: {
        id: saved.id,
        name: saved.name,
        type: saved.type,
        status: saved.status,
        fileCount: files.length,
        parsedDocuments: rawDocs.length,
        files: files.map((f) => ({
          name: f.originalname,
          size: f.size,
        })),
      },
    };
  }

  @Get('upload/supported-formats')
  @ApiOperation({
    summary: 'List supported file formats for upload',
  })
  getSupportedFormats() {
    return {
      formats: this.parser.getSupportedFormats(),
      maxFileSize: MAX_FILE_SIZE,
      maxFileSizeHuman: '20 MB',
      maxFiles: MAX_FILES,
    };
  }
}
