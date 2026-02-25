import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsUrl,
  IsBoolean,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CrawlWebsiteDto {
  @ApiProperty({
    description: 'Website URL to crawl (e.g. https://docs.example.com)',
    example: 'https://docs.tokamak.network',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: true })
  url!: string;

  @ApiPropertyOptional({
    description: 'Display name for the source (defaults to hostname of URL)',
    example: 'Tokamak Docs',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of pages to crawl',
    minimum: 1,
    maximum: 500,
    default: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxPages?: number;

  @ApiPropertyOptional({
    description: 'Maximum depth from seed URL (0 = single page only)',
    minimum: 0,
    maximum: 5,
    default: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  maxDepth?: number;

  @ApiPropertyOptional({
    description: 'Request timeout in milliseconds',
    minimum: 5000,
    maximum: 60000,
    default: 15000,
  })
  @IsOptional()
  @IsInt()
  @Min(5000)
  @Max(60000)
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Delay between requests in ms (politeness)',
    minimum: 200,
    maximum: 5000,
    default: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(200)
  @Max(5000)
  delayBetweenRequests?: number;

  @ApiPropertyOptional({
    description: 'Respect robots.txt disallow rules (default false)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  respectRobotsTxt?: boolean;

  @ApiPropertyOptional({
    description: 'Path prefixes to exclude when discovering links (e.g. /login, /api/)',
    type: [String],
    example: ['/login', '/api/'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePathPatterns?: string[];

  @ApiPropertyOptional({
    description: 'If true, create a new source even when one for this URL already exists',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

/** Response when crawl is queued successfully */
export class CrawlWebsiteResponseDto {
  @ApiProperty({ description: 'The created website source' })
  source!: {
    id: string;
    name: string;
    type: string;
    status: string;
    config: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  };

  @ApiProperty({ description: 'Bull job ID for the ingestion job' })
  jobId!: string;

  @ApiProperty({ description: 'Human-readable message' })
  message!: string;
}

/** Response when duplicate website source exists (409)' */
export class CrawlWebsiteConflictResponseDto {
  @ApiProperty({ example: 409 })
  statusCode!: number;

  @ApiProperty({ description: 'ID of the existing source for this URL' })
  existingSourceId!: string;

  @ApiProperty({ description: 'Error message' })
  message!: string;
}
