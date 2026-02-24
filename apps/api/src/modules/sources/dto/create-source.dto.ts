import { IsString, IsNotEmpty, IsOptional, IsIn, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSourceDto {
  @ApiProperty({
    description: 'Human-readable name for the source',
    example: 'Tokamak Contracts v2',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Type of the knowledge source',
    enum: ['github_repo', 'github_org', 'documentation', 'file_upload', 'website', 'notion', 'custom'],
    example: 'github_repo',
  })
  @IsString()
  @IsIn(['github_repo', 'github_org', 'documentation', 'file_upload', 'website', 'notion', 'custom'])
  type!: string;

  @ApiProperty({
    description:
      'Configuration object. For github_repo: { owner, repo }. For github_org: { org }. For website: { url, crawlOptions? }.',
    example: { owner: 'tokamak-network', repo: 'tokamak-network-pilot' },
  })
  @IsObject()
  config!: Record<string, unknown>;
}

export class UpdateSourceDto {
  @ApiPropertyOptional({ description: 'Updated name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Updated configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
