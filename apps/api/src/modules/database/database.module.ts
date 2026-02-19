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

        return {
          type: 'postgres' as const,
          url: dbUrl,
          entities: [Source, Document, User, OtpCode, ContentEntry, ApiKey, ApiKeyUsageLog, Conversation, Message, Project, ProjectMember, ProjectSource],
          synchronize: !isProduction,
          logging: !isProduction,
          ssl: isProduction ? { rejectUnauthorized: false } : false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
