import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { ContentService } from './content.service';
import { CreateContentDto, UpdateContentDto } from './dto/content.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  @ApiOperation({
    summary: 'List content entries',
    description:
      'Browse team-curated content entries (project overviews, FAQs, guides, etc.)',
  })
  @ApiQuery({ name: 'project', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('project') project?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.contentService.findAll({ project, category, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific content entry' })
  async findOne(@Param('id') id: string) {
    return this.contentService.findOne(id);
  }

  // ─── Write operations ──────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: 'Create a new content entry',
    description:
      'Authenticated team members can add curated knowledge entries.',
  })
  @ApiResponse({ status: 201, description: 'Content entry created' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async create(@Body() dto: CreateContentDto, @Request() req: any) {
    return this.contentService.create(dto, req.user.sub);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a content entry',
    description: 'Mark content as outdated, update answers, add notes, etc.',
  })
  @ApiResponse({ status: 200, description: 'Content entry updated' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async update(@Param('id') id: string, @Body() dto: UpdateContentDto) {
    return this.contentService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a content entry' })
  @ApiResponse({ status: 200, description: 'Content entry deleted' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async remove(@Param('id') id: string) {
    return this.contentService.remove(id);
  }
}
