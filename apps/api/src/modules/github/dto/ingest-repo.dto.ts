import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IngestRepoDto {
  @ApiProperty({
    description: 'GitHub repository owner (user or org)',
    example: 'tokamak-network',
  })
  @IsString()
  @IsNotEmpty()
  owner!: string;

  @ApiProperty({
    description: 'GitHub repository name',
    example: 'tokamak-network.github.io',
  })
  @IsString()
  @IsNotEmpty()
  repo!: string;

  @ApiPropertyOptional({
    description: 'Branch to index (defaults to default branch)',
    example: 'main',
  })
  @IsOptional()
  @IsString()
  branch?: string;

  @ApiPropertyOptional({
    description: 'Glob patterns of file paths to include',
    example: ['docs/', 'README.md'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includePaths?: string[];

  @ApiPropertyOptional({
    description: 'Glob patterns of file paths to exclude',
    example: ['test/', 'scripts/'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePaths?: string[];

  @ApiPropertyOptional({
    description: 'Whether to index GitHub issues (default: true)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  indexIssues?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to index pull requests (default: false)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  indexPullRequests?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to index code files (default: true)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  indexCode?: boolean;
}
