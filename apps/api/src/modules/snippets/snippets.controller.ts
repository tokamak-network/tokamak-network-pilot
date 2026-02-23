import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { SnippetsService } from './snippets.service';
import { CreateSnippetDto } from './dto/create-snippet.dto';
import { GenerateSnippetDto } from './dto/generate-snippet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('snippets')
@Controller('snippets')
export class SnippetsController {
  constructor(private readonly service: SnippetsService) {}

  @Get()
  @ApiOperation({
    summary: 'List code snippets',
    description:
      'Browse the snippet library with optional filters for language, category, project, and full-text search.',
  })
  @ApiQuery({ name: 'language', required: false, example: 'typescript' })
  @ApiQuery({ name: 'category', required: false, example: 'staking' })
  @ApiQuery({ name: 'projectSlug', required: false, example: 'titan' })
  @ApiQuery({ name: 'search', required: false, example: 'deploy rollup' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @Query('language') language?: string,
    @Query('category') category?: string,
    @Query('projectSlug') projectSlug?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findAll({
      language,
      category,
      projectSlug,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('languages')
  @ApiOperation({
    summary: 'List available languages',
    description: 'Returns distinct languages with snippet counts.',
  })
  async languages() {
    return this.service.getLanguages();
  }

  @Get('categories')
  @ApiOperation({
    summary: 'List available categories',
    description: 'Returns distinct categories with snippet counts.',
  })
  async categories() {
    return this.service.getCategories();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a snippet by ID',
  })
  @ApiParam({ name: 'id', description: 'Snippet ID' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create a code snippet',
    description: 'Add a new snippet to the library. Requires authentication.',
  })
  @ApiBody({ type: CreateSnippetDto })
  async create(@Body() dto: CreateSnippetDto, @Req() req: any) {
    return this.service.create(dto, req.user?.id);
  }

  @Post('generate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'AI-generate a code snippet',
    description:
      'Describe what you need in plain English and the AI will generate a working snippet using real Tokamak APIs from the indexed knowledge base.',
  })
  @ApiBody({ type: GenerateSnippetDto })
  async generate(@Body() dto: GenerateSnippetDto, @Req() req: any) {
    return this.service.generate(dto);
  }

  @Post(':id/copy')
  @ApiOperation({
    summary: 'Track a snippet copy',
    description: 'Increment the copy count for analytics. No auth required.',
  })
  @ApiParam({ name: 'id', description: 'Snippet ID' })
  async trackCopy(@Param('id') id: string) {
    return this.service.trackCopy(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update a snippet',
  })
  @ApiParam({ name: 'id', description: 'Snippet ID' })
  @ApiBody({ type: CreateSnippetDto })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateSnippetDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Delete a snippet',
  })
  @ApiParam({ name: 'id', description: 'Snippet ID' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
