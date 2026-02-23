import { IsUUID, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitFeedbackDto {
  @ApiProperty({ description: 'Message ID to rate', example: 'uuid' })
  @IsUUID()
  messageId!: string;

  @ApiProperty({ description: 'Rating', enum: ['up', 'down'], example: 'up' })
  @IsIn(['up', 'down'])
  rating!: 'up' | 'down';

  @ApiPropertyOptional({ description: 'Optional comment', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
