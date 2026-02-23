import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateSnippetDto {
  @ApiProperty({
    description: 'Natural-language description of what you want the code to do',
    example: 'Write a script that stakes 100 TON tokens using the Tokamak SDK',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  prompt!: string;

  @ApiPropertyOptional({
    description: 'Preferred programming language',
    example: 'typescript',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;

  @ApiPropertyOptional({ description: 'Scope to a specific project', example: 'titan' })
  @IsOptional()
  @IsString()
  projectSlug?: string;
}
