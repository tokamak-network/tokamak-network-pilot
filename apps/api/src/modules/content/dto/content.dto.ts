import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
} from 'class-validator';

export class CreateContentDto {
  @ApiProperty({ example: 'How TON staking works' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'TON staking allows holders to delegate...' })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({ example: 'tokamak-network' })
  @IsString()
  @IsOptional()
  project?: string;

  @ApiPropertyOptional({ example: 'guide' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: ['staking', 'TON', 'DeFi'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class UpdateContentDto extends PartialType(CreateContentDto) {
  @ApiPropertyOptional({ example: true, description: 'Mark content as outdated' })
  @IsBoolean()
  @IsOptional()
  isOutdated?: boolean;
}
