import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsIn,
  IsDateString,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { API_KEY_SCOPES, ApiKeyScope } from '../../../entities/api-key.entity';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Human-readable label for this API key',
    example: 'My DApp Integration',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description:
      'Permitted scopes. Defaults to all scopes if omitted.',
    example: ['ask', 'search', 'sources:read', 'content:read'],
    enum: API_KEY_SCOPES,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsIn(API_KEY_SCOPES as unknown as string[], { each: true })
  scopes?: ApiKeyScope[];

  @ApiPropertyOptional({
    description: 'Expiration date (ISO 8601). Null means no expiry.',
    example: '2027-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Optional metadata (project name, website, notes, etc.)',
    example: { project: 'My DApp', website: 'https://mydapp.xyz' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
