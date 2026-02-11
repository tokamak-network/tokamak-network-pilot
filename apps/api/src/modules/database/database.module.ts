import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Source } from '../../entities/source.entity';
import { Document } from '../../entities/document.entity';
import { User } from '../../entities/user.entity';
import { OtpCode } from '../../entities/otp-code.entity';
import { ContentEntry } from '../../entities/content-entry.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.get<string>(
          'DATABASE_URL',
          'postgresql://postgres:postgres@localhost:5432/tokamak_pilot',
        ),
        entities: [Source, Document, User, OtpCode, ContentEntry],
        synchronize: true, // Auto-sync schema in dev — disable in production
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}
