import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSnippetDto {
  @ApiProperty({ description: 'Snippet title', example: 'Deploy a Tokamak rollup' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({ description: 'What this snippet does' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'The code', example: 'const sdk = new TokamakSDK();' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ description: 'Programming language', example: 'typescript' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  language!: string;

  @ApiPropertyOptional({ description: 'Category', example: 'staking' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'Tags', example: ['ton', 'staking'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Associated project slug', example: 'titan' })
  @IsOptional()
  @IsString()
  projectSlug?: string;
}
