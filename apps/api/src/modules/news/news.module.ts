import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Project } from '../../entities/project.entity';
import { ProjectNews } from '../../entities/project-news.entity';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { ProjectsModule } from '../projects/projects.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Project, ProjectNews]),
    ProjectsModule,
    LlmModule,
  ],
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}
