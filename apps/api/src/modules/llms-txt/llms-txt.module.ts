import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../../entities/project.entity';
import { Source } from '../../entities/source.entity';
import { ContentEntry } from '../../entities/content-entry.entity';
import { LlmsTxtController } from './llms-txt.controller';
import { LlmsTxtService } from './llms-txt.service';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Source, ContentEntry])],
  controllers: [LlmsTxtController],
  providers: [LlmsTxtService],
})
export class LlmsTxtModule {}
