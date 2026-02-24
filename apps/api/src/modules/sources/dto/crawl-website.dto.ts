import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsUrl,
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
}
