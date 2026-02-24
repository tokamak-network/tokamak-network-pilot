import { IsString, IsNotEmpty, IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AskQuestionDto {
  @ApiProperty({
    description: 'The question to ask about Tokamak Network',
    example: 'What is the TON staking mechanism?',
  })
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ApiPropertyOptional({
    description: 'Optional context filters (e.g., specific repos or doc categories)',
    example: ['tokamak-network/contracts-v2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filters?: string[];

  @ApiPropertyOptional({
    description: 'Scope the question to a specific project (by ID). Only sources assigned to this project will be searched.',
  })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Scope the question to a specific project by slug (alternative to projectId).',
  })
  @IsOptional()
  @IsString()
  projectSlug?: string;

  @ApiPropertyOptional({
    description: 'Conversation history for follow-up questions',
  })
  @IsOptional()
  @IsArray()
  conversationHistory?: Array<{ role: string; content: string }>;
}
