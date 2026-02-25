import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from '../../entities/project.entity';
import { ProjectMember } from '../../entities/project-member.entity';
import { ProjectSource } from '../../entities/project-source.entity';
import { ProjectInvitation } from '../../entities/project-invitation.entity';
import { Source } from '../../entities/source.entity';
import { User } from '../../entities/user.entity';
import { Document } from '../../entities/document.entity';
import { RoadmapItem } from '../../entities/roadmap-item.entity';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { AuthModule } from '../auth/auth.module';
import { LlmModule } from '../llm/llm.module';
import { GitHubModule } from '../github/github.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectMember,
      ProjectSource,
      ProjectInvitation,
      Source,
      User,
      Document,
      RoadmapItem,
    ]),
    AuthModule,
    LlmModule,
    GitHubModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
