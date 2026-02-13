import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConversationDto {
  @ApiProperty({
    description: 'New title for the conversation',
    example: 'TON Staking Deep Dive',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;
}
