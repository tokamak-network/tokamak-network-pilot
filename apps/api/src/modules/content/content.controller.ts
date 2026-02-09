import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ContentService } from './content.service';

@ApiTags('content')
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
  async findAll(
    @Query('project') project?: string,
    @Query('category') category?: string,
  ) {
    return this.contentService.findAll({ project, category });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific content entry' })
  async findOne(@Param('id') id: string) {
    return this.contentService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new content entry',
    description:
      'Project leads and team members can add curated knowledge entries.',
  })
  async create(@Body() body: any) {
    return this.contentService.create(body);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a content entry',
    description: 'Mark content as outdated, update answers, add notes, etc.',
  })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.contentService.update(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a content entry' })
  async remove(@Param('id') id: string) {
    return this.contentService.remove(id);
  }
}
