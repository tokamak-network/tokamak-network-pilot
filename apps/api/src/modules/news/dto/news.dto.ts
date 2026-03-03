import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsNotEmpty,
  IsIn,
  IsArray,
  IsUUID,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FetchNewsQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search within news titles/descriptions' })
  @IsOptional()
  @IsString()
  search?: string;
}

export type SocialPlatform = 'twitter' | 'linkedin' | 'instagram';

export class GenerateSocialPostDto {
  @ApiProperty({
    description: 'Target social media platform',
    enum: ['twitter', 'linkedin', 'instagram'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['twitter', 'linkedin', 'instagram'])
  platform!: SocialPlatform;

  @ApiPropertyOptional({ description: 'Custom tone or instructions for the AI' })
  @IsOptional()
  @IsString()
  customPrompt?: string;
}

export class BulkGeneratePostsDto {
  @ApiProperty({
    description: 'News article IDs to generate posts for',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  articleIds!: string[];

  @ApiProperty({
    description: 'Platforms to generate for',
    enum: ['twitter', 'linkedin', 'instagram'],
    isArray: true,
  })
  @IsArray()
  @IsIn(['twitter', 'linkedin', 'instagram'], { each: true })
  @ArrayMinSize(1)
  platforms!: SocialPlatform[];

  @ApiPropertyOptional({ description: 'Custom tone or instructions for the AI' })
  @IsOptional()
  @IsString()
  customPrompt?: string;
}

export class FetchGeneratedPostsQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by platform',
    enum: ['twitter', 'linkedin', 'instagram'],
  })
  @IsOptional()
  @IsIn(['twitter', 'linkedin', 'instagram'])
  platform?: SocialPlatform;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['draft', 'published', 'archived'],
  })
  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: string;

  @ApiPropertyOptional({ description: 'Search in post content or article title' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class UpdateGeneratedPostDto {
  @ApiPropertyOptional({ description: 'Updated post content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Post status',
    enum: ['draft', 'published', 'archived'],
  })
  @IsOptional()
  @IsIn(['draft', 'published', 'archived'])
  status?: string;
}
