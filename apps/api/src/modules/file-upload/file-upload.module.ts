import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Source } from '../../entities/source.entity';
import { FileUploadController } from './file-upload.controller';
import { FileParserService } from './file-parser.service';
import { IngestionModule } from '../ingestion/ingestion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Source]),
    IngestionModule,
  ],
  controllers: [FileUploadController],
  providers: [FileParserService],
  exports: [FileParserService],
})
export class FileUploadModule {}
