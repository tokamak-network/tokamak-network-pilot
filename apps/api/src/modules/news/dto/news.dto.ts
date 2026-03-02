import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsNotEmpty,
  IsIn,
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
