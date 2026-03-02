import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NewsService } from './news.service';
import { FetchNewsQueryDto, GenerateSocialPostDto } from './dto/news.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProjectsService } from '../projects/projects.service';

@ApiTags('project-news')
@Controller('projects/:idOrSlug/news')
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List news articles for a project' })
  @ApiParam({ name: 'idOrSlug', description: 'Project UUID or slug' })
  async getNews(
    @Param('idOrSlug') idOrSlug: string,
    @Query() query: FetchNewsQueryDto,
  ) {
    const project = await this.projectsService.findOne(idOrSlug);
    if (!project) throw new NotFoundException('Project not found');
    if (!project.isNewsEnabled) {
      return { data: [], total: 0, page: 1, limit: 20, hasMore: false };
    }
    return this.newsService.getProjectNews(
      project.id,
      query.page,
      query.limit,
      query.search,
    );
  }

  @Post('sync')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Manually trigger news sync for a project' })
  @ApiParam({ name: 'idOrSlug', description: 'Project UUID or slug' })
  async triggerSync(@Param('idOrSlug') idOrSlug: string) {
    const project = await this.projectsService.findOne(idOrSlug);
    if (!project) throw new NotFoundException('Project not found');
    if (!project.isNewsEnabled) {
      throw new ForbiddenException('News is not enabled for this project');
    }
    return this.newsService.triggerSync(project.id);
  }

  @Post(':articleId/generate-post')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Generate a social media post from a news article using AI',
  })
  @ApiParam({ name: 'idOrSlug', description: 'Project UUID or slug' })
  @ApiParam({ name: 'articleId', description: 'News article ID' })
  async generateSocialPost(
    @Param('idOrSlug') idOrSlug: string,
    @Param('articleId') articleId: string,
    @Body() dto: GenerateSocialPostDto,
  ) {
    const project = await this.projectsService.findOne(idOrSlug);
    if (!project) throw new NotFoundException('Project not found');
    return this.newsService.generateSocialPost(
      articleId,
      project.id,
      dto.platform,
      dto.customPrompt,
    );
  }

  @Delete(':articleId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a news article from a project' })
  @ApiParam({ name: 'idOrSlug', description: 'Project UUID or slug' })
  @ApiParam({ name: 'articleId', description: 'News article ID' })
  async deleteArticle(
    @Param('idOrSlug') idOrSlug: string,
    @Param('articleId') articleId: string,
  ) {
    const project = await this.projectsService.findOne(idOrSlug);
    if (!project) throw new NotFoundException('Project not found');
    return this.newsService.deleteNewsArticle(articleId, project.id);
  }
}
