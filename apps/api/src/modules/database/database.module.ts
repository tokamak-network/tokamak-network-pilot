import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Source } from '../../entities/source.entity';
import { Document } from '../../entities/document.entity';
import { User } from '../../entities/user.entity';
import { OtpCode } from '../../entities/otp-code.entity';
import { ContentEntry } from '../../entities/content-entry.entity';
import { ApiKey } from '../../entities/api-key.entity';
import { ApiKeyUsageLog } from '../../entities/api-key-usage.entity';
import { Conversation } from '../../entities/conversation.entity';
import { Message } from '../../entities/message.entity';
import { Project } from '../../entities/project.entity';
import { ProjectMember } from '../../entities/project-member.entity';
import { ProjectSource } from '../../entities/project-source.entity';
import { Feedback } from '../../entities/feedback.entity';
import { Snippet } from '../../entities/snippet.entity';
import { ProjectInvitation } from '../../entities/project-invitation.entity';
import { ProjectFeedback } from '../../entities/project-feedback.entity';
import { ProjectNews } from '../../entities/project-news.entity';
import { GeneratedPost } from '../../entities/generated-post.entity';
import { RoadmapItem } from '../../entities/roadmap-item.entity';
import { RoadmapTaskPrompt } from '../../entities/roadmap-task-prompt.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbUrl = config.get<string>(
          'DATABASE_URL',
          'postgresql://postgres:postgres@localhost:5432/tokamak_pilot',
        );
        const isProduction = config.get<string>('NODE_ENV') === 'production';

        const dbSync = config.get<string>('DB_SYNC');

        return {
          type: 'postgres' as const,
          url: dbUrl,
          entities: [
            Source,
            Document,
            User,
            OtpCode,
            ContentEntry,
            ApiKey,
            ApiKeyUsageLog,
            Conversation,
            Message,
            Project,
            ProjectMember,
            ProjectSource,
            Feedback,
            Snippet,
            ProjectInvitation,
            ProjectFeedback,
            ProjectNews,
            GeneratedPost,
            RoadmapItem,
            RoadmapTaskPrompt,
          ],
          synchronize: dbSync !== undefined ? dbSync === 'true' : !isProduction,
          logging: !isProduction,
          ssl: isProduction ? { rejectUnauthorized: false } : false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
