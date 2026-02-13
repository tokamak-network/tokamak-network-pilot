import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AskInConversationDto {
  @ApiProperty({
    description: 'The question to ask',
    example: 'What is the TON staking mechanism?',
  })
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ApiPropertyOptional({
    description: 'Optional context filters (e.g., specific repos)',
    example: ['tokamak-network/contracts-v2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filters?: string[];
}
