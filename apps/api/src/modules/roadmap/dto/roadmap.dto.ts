import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import type {
  RoadmapEffort,
  RoadmapPriority,
  RoadmapStatus,
} from '../../../entities/roadmap-item.entity';

const ROADMAP_PRIORITIES: RoadmapPriority[] = ['low', 'medium', 'high', 'critical'];
const ROADMAP_EFFORT: RoadmapEffort[] = ['xs', 's', 'm', 'l', 'xl'];
const ROADMAP_STATUS: RoadmapStatus[] = [
  'proposed',
  'approved',
  'planned',
  'in_progress',
  'completed',
  'rejected',
];

export class CreateRoadmapItemDto {
  @ApiProperty({ example: 'Improve staking onboarding flow' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(220)
  title!: string;

  @ApiProperty({
    example: 'New users struggle to find a clear sequence for staking setup.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  problem!: string;

  @ApiPropertyOptional({
    example: 'Increase staking conversion by reducing onboarding drop-off.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  outcome?: string;

  @ApiPropertyOptional({ enum: ROADMAP_PRIORITIES, example: 'high' })
  @IsOptional()
  @IsIn(ROADMAP_PRIORITIES)
  priority?: RoadmapPriority;

  @ApiPropertyOptional({ enum: ROADMAP_EFFORT, example: 'm' })
  @IsOptional()
  @IsIn(ROADMAP_EFFORT)
  effort?: RoadmapEffort;

  @ApiPropertyOptional({ enum: ROADMAP_STATUS, example: 'proposed' })
  @IsOptional()
  @IsIn(ROADMAP_STATUS)
  status?: RoadmapStatus;

  @ApiPropertyOptional({ example: '2026-Q2' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  targetQuarter?: string;

  @ApiPropertyOptional({ type: [String], description: 'Linked project feedback IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sourceFeedbackIds?: string[];

  @ApiPropertyOptional({
    description: 'Optional owner user ID for this roadmap item',
  })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

export class UpdateRoadmapItemDto {
  @ApiPropertyOptional({ maxLength: 220 })
  @IsOptional()
  @IsString()
  @MaxLength(220)
  title?: string;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  problem?: string;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  outcome?: string;

  @ApiPropertyOptional({ enum: ROADMAP_PRIORITIES })
  @IsOptional()
  @IsIn(ROADMAP_PRIORITIES)
  priority?: RoadmapPriority;

  @ApiPropertyOptional({ enum: ROADMAP_EFFORT })
  @IsOptional()
  @IsIn(ROADMAP_EFFORT)
  effort?: RoadmapEffort;

  @ApiPropertyOptional({ enum: ROADMAP_STATUS })
  @IsOptional()
  @IsIn(ROADMAP_STATUS)
  status?: RoadmapStatus;

  @ApiPropertyOptional({ maxLength: 16 })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  targetQuarter?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  sourceFeedbackIds?: string[];

  @ApiPropertyOptional({
    description: 'Optional owner user ID for this roadmap item',
  })
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

export class QueueRoadmapDraftDto {
  @ApiPropertyOptional({
    description: 'Maximum number of roadmap items to produce',
    minimum: 1,
    maximum: 10,
    example: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxItems?: number;
}

export class TaskChecklistItemDto {
  @ApiProperty({ example: 'Add feedback model and endpoint tests' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(220)
  title!: string;

  @ApiProperty({ example: 'Implement backend endpoint and validate payload schema.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description!: string;

  @ApiProperty({ type: [String], example: ['Endpoint returns 201', 'Invalid payload returns 400'] })
  @IsArray()
  @IsString({ each: true })
  acceptanceCriteria!: string[];
}

export class GenerateTaskPromptDto {
  @ApiPropertyOptional({
    description: 'Additional implementation constraints/instructions for prompt generation',
    example: 'Use NestJS controllers and keep API backward compatible.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  extraContext?: string;

  @ApiPropertyOptional({
    description: 'Optional manually provided checklist seeds',
    type: [TaskChecklistItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskChecklistItemDto)
  taskSeeds?: TaskChecklistItemDto[];
}

export class ListRoadmapItemsDto {
  @ApiPropertyOptional({ enum: ROADMAP_STATUS })
  @IsOptional()
  @IsIn(ROADMAP_STATUS)
  status?: RoadmapStatus;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Page size', minimum: 1, maximum: 100, example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ListTaskPromptsDto {
  @ApiPropertyOptional({ description: 'Maximum prompts to return', minimum: 1, maximum: 50, example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export interface AiRoadmapCandidate {
  title: string;
  problem: string;
  outcome?: string;
  priority?: RoadmapPriority;
  effort?: RoadmapEffort;
  confidence?: number;
  rationale?: string;
  feedbackIds?: string[];
}

export interface AiRoadmapDraft {
  items: AiRoadmapCandidate[];
}

export interface AiTaskPromptPayload {
  prompt: string;
  tasks: Array<{
    title: string;
    description: string;
    acceptanceCriteria: string[];
  }>;
}
