import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { SourcesService } from './sources.service';
import { CreateSourceDto, UpdateSourceDto } from './dto/create-source.dto';

@ApiTags('sources')
@Controller('sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  @ApiOperation({ summary: 'List all registered knowledge sources' })
  async findAll() {
    return this.sourcesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific source' })
  async findOne(@Param('id') id: string) {
    return this.sourcesService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register a new knowledge source',
    description:
      'Add a GitHub repo, documentation URL, file upload, or other source type to the indexing pipeline. Automatically triggers ingestion.',
  })
  @ApiBody({ type: CreateSourceDto })
  async create(@Body() dto: CreateSourceDto) {
    return this.sourcesService.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a knowledge source configuration' })
  @ApiBody({ type: UpdateSourceDto })
  async update(@Param('id') id: string, @Body() dto: UpdateSourceDto) {
    return this.sourcesService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a knowledge source and its indexed data' })
  async remove(@Param('id') id: string) {
    return this.sourcesService.remove(id);
  }

  @Post(':id/sync')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger re-indexing of a specific source' })
  async sync(@Param('id') id: string) {
    return this.sourcesService.sync(id);
  }
}
