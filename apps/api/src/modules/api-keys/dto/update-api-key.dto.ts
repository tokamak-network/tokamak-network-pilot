import {
  IsString,
  IsOptional,
  IsArray,
  IsIn,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { API_KEY_SCOPES, ApiKeyScope } from '../../../entities/api-key.entity';

export class UpdateApiKeyDto {
  @ApiPropertyOptional({
    description: 'Updated human-readable label',
    example: 'Production Integration',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated scopes',
    example: ['ask', 'search'],
    enum: API_KEY_SCOPES,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsIn(API_KEY_SCOPES as unknown as string[], { each: true })
  scopes?: ApiKeyScope[];

  @ApiPropertyOptional({
    description: 'Enable or disable the key',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Optional metadata (project name, website, notes, etc.)',
    example: { project: 'My DApp v2' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
