import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiPropertyOptional({
    description: 'Title for the conversation (auto-generated from first question if omitted)',
    example: 'TON Staking Questions',
  })
  @IsOptional()
  @IsString()
  title?: string;
}
