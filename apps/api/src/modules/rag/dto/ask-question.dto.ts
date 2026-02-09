import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
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
    description: 'Conversation history for follow-up questions',
  })
  @IsOptional()
  @IsArray()
  conversationHistory?: Array<{ role: string; content: string }>;
}
