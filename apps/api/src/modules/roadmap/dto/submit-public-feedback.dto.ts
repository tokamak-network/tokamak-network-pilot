import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
  MaxLength,
  IsEmail,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ProjectFeedbackCategory } from '../../../entities/project-feedback.entity';

const FEEDBACK_CATEGORIES: ProjectFeedbackCategory[] = [
  'feature',
  'bug',
  'ux',
  'performance',
  'integration',
  'pricing',
  'other',
];

export class SubmitPublicFeedbackDto {
  @ApiPropertyOptional({
    description: 'Short title for the feedback',
    maxLength: 160,
    example: 'Need clearer staking onboarding',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @ApiProperty({
    description: 'Detailed feedback from a user',
    example:
      'I tried staking TON but could not find a clear checklist for first-time users.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content!: string;

  @ApiPropertyOptional({
    description: 'Feedback category',
    enum: FEEDBACK_CATEGORIES,
    example: 'ux',
  })
  @IsOptional()
  @IsIn(FEEDBACK_CATEGORIES)
  category?: ProjectFeedbackCategory;

  @ApiPropertyOptional({
    description: 'Pain level from 1 (low) to 5 (critical)',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  painLevel?: number;

  @ApiPropertyOptional({
    description: 'Persona of the submitter',
    example: 'Validator operator',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  persona?: string;

  @ApiPropertyOptional({
    description: 'Submitter display name',
    example: 'Alice',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  submitterName?: string;

  @ApiPropertyOptional({
    description: 'Submitter email for follow-up',
    example: 'alice@example.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  submitterEmail?: string;

  @ApiPropertyOptional({
    description: 'Optional URL with supporting context (tweet, issue, thread, etc.)',
    example: 'https://x.com/example/status/123',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(1024)
  sourceUrl?: string;
}

export class ListProjectFeedbackDto {
  @ApiPropertyOptional({ enum: ['new', 'reviewed', 'planned', 'rejected'] })
  @IsOptional()
  @IsIn(['new', 'reviewed', 'planned', 'rejected'])
  status?: 'new' | 'reviewed' | 'planned' | 'rejected';

  @ApiPropertyOptional({ enum: FEEDBACK_CATEGORIES })
  @IsOptional()
  @IsIn(FEEDBACK_CATEGORIES)
  category?: ProjectFeedbackCategory;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', minimum: 1, maximum: 100, example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UpdateProjectFeedbackDto {
  @ApiPropertyOptional({ enum: ['new', 'reviewed', 'planned', 'rejected'] })
  @IsOptional()
  @IsIn(['new', 'reviewed', 'planned', 'rejected'])
  status?: 'new' | 'reviewed' | 'planned' | 'rejected';

  @ApiPropertyOptional({
    description: 'Internal moderator note',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  moderatorNote?: string;
}
