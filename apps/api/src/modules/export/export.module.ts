import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentEntry } from '../../entities/content-entry.entity';
import { Project } from '../../entities/project.entity';
import { ProjectMember } from '../../entities/project-member.entity';
import { ProjectSource } from '../../entities/project-source.entity';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContentEntry,
      Project,
      ProjectMember,
      ProjectSource,
    ]),
  ],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
