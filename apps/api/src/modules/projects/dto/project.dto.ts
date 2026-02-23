import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsUrl,
  ValidateNested,
  IsIn,
  IsEmail,
  IsUUID,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectLinkDto {
  @ApiProperty({ example: 'GitHub' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({ example: 'https://github.com/tokamak-network/tokamak-dao' })
  @IsString()
  @IsNotEmpty()
  url!: string;
}

export class CreateProjectDto {
  @ApiProperty({
    description: 'Project name',
    example: 'Tokamak DAO',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug (auto-generated from name if omitted)',
    example: 'tokamak-dao',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'External links',
    type: [ProjectLinkDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectLinkDto)
  links?: ProjectLinkDto[];

  @ApiPropertyOptional({
    description: 'Whether the project is publicly visible',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the project is featured on the landing page',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  showOnLandingPage?: boolean;
}

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: 'Project name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ description: 'URL-friendly slug' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  })
  slug?: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'External links',
    type: [ProjectLinkDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectLinkDto)
  links?: ProjectLinkDto[];

  @ApiPropertyOptional({
    description: 'Editable project summary / introduction',
  })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({
    description: 'Whether the project is publicly visible',
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the project is featured on the landing page',
  })
  @IsOptional()
  @IsBoolean()
  showOnLandingPage?: boolean;
}

export class AddProjectMemberDto {
  @ApiProperty({
    description: 'Email of the user to add',
    example: 'alice@tokamak.network',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({
    description: 'Role in the project',
    enum: ['lead', 'contributor', 'viewer'],
    default: 'contributor',
  })
  @IsOptional()
  @IsIn(['lead', 'contributor', 'viewer'])
  role?: 'lead' | 'contributor' | 'viewer';
}

export class UpdateProjectMemberDto {
  @ApiProperty({
    description: 'New role for the member',
    enum: ['lead', 'contributor', 'viewer'],
  })
  @IsIn(['lead', 'contributor', 'viewer'])
  role!: 'lead' | 'contributor' | 'viewer';
}

export class AddProjectSourceDto {
  @ApiProperty({
    description: 'ID of the source to assign to this project',
  })
  @IsUUID()
  @IsNotEmpty()
  sourceId!: string;
}

export class CreateProjectFromSourceDto {
  @ApiProperty({
    description: 'ID of the source (GitHub repo) to create a project from',
  })
  @IsUUID()
  @IsNotEmpty()
  sourceId!: string;
}
