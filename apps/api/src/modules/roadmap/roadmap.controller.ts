import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoadmapService } from './roadmap.service';
import { PublicFeedbackThrottlerGuard } from './guards/public-feedback-throttler.guard';
import {
  ListProjectFeedbackDto,
  SubmitPublicFeedbackDto,
  UpdateProjectFeedbackDto,
} from './dto/submit-public-feedback.dto';
import {
  CreateRoadmapItemDto,
  GenerateTaskPromptDto,
  ListRoadmapItemsDto,
  ListTaskPromptsDto,
  QueueRoadmapDraftDto,
  UpdateRoadmapItemDto,
} from './dto/roadmap.dto';

@ApiTags('roadmap')
@Controller('projects')
export class RoadmapController {
  constructor(private readonly roadmapService: RoadmapService) {}

  // ───────────────────── Phase 1: Public Feedback ─────────────────────

  @Post(':slug/public-feedback')
  @ApiOperation({
    summary: 'Submit public feedback for a project',
    description:
      'Anyone can submit project feedback from the public project page. This feeds the roadmap pipeline.',
  })
  @UseGuards(PublicFeedbackThrottlerGuard)
  @ApiParam({ name: 'slug', description: 'Project slug' })
  @ApiBody({ type: SubmitPublicFeedbackDto })
  async submitPublicFeedback(
    @Param('slug') slug: string,
    @Body() dto: SubmitPublicFeedbackDto,
    @Req() req: Request,
  ) {
    return this.roadmapService.submitPublicFeedback(slug, dto, {
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get(':idOrSlug/feedback')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List project feedback inbox',
    description: 'Returns public and internal feedback entries for roadmap triage.',
  })
  async listFeedback(
    @Param('idOrSlug') idOrSlug: string,
    @Query() query: ListProjectFeedbackDto,
    @Req() req: any,
  ) {
    return this.roadmapService.listFeedback(
      idOrSlug,
      this.getUserId(req),
      query,
    );
  }

  @Put(':idOrSlug/feedback/:feedbackId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update feedback status or note',
    description: 'Used by project maintainers to triage feedback in the inbox.',
  })
  async updateFeedback(
    @Param('idOrSlug') idOrSlug: string,
    @Param('feedbackId') feedbackId: string,
    @Body() dto: UpdateProjectFeedbackDto,
    @Req() req: any,
  ) {
    return this.roadmapService.updateFeedback(
      idOrSlug,
      feedbackId,
      dto,
      this.getUserId(req),
    );
  }

  // ───────────────────── Phase 2: AI Draft Pipeline ─────────────────────

  @Post(':idOrSlug/roadmap/ai-draft')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Queue AI roadmap draft generation',
    description:
      'Runs the feedback-to-roadmap AI pipeline in the background and creates proposed roadmap items.',
  })
  async queueRoadmapDraft(
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: QueueRoadmapDraftDto,
    @Req() req: any,
  ) {
    return this.roadmapService.queueRoadmapDraft(
      idOrSlug,
      this.getUserId(req),
      dto.maxItems,
    );
  }

  @Get(':idOrSlug/roadmap/pipeline')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get feedback-to-roadmap pipeline summary',
    description: 'Returns aggregate counts for feedback and roadmap statuses.',
  })
  async getPipelineSummary(
    @Param('idOrSlug') idOrSlug: string,
    @Req() req: any,
  ) {
    return this.roadmapService.getPipelineSummary(
      idOrSlug,
      this.getUserId(req),
    );
  }

  // ───────────────────── Phase 3: Roadmap CRUD ─────────────────────

  @Get(':idOrSlug/roadmap')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List roadmap items for a project',
  })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listRoadmapItems(
    @Param('idOrSlug') idOrSlug: string,
    @Query() query: ListRoadmapItemsDto,
    @Req() req: any,
  ) {
    return this.roadmapService.listRoadmapItems(
      idOrSlug,
      this.getUserId(req),
      query,
    );
  }

  @Post(':idOrSlug/roadmap')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create roadmap item',
  })
  async createRoadmapItem(
    @Param('idOrSlug') idOrSlug: string,
    @Body() dto: CreateRoadmapItemDto,
    @Req() req: any,
  ) {
    return this.roadmapService.createRoadmapItem(
      idOrSlug,
      dto,
      this.getUserId(req),
    );
  }

  @Put(':idOrSlug/roadmap/:itemId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update roadmap item',
  })
  async updateRoadmapItem(
    @Param('idOrSlug') idOrSlug: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateRoadmapItemDto,
    @Req() req: any,
  ) {
    return this.roadmapService.updateRoadmapItem(
      idOrSlug,
      itemId,
      dto,
      this.getUserId(req),
    );
  }

  // ───────────────────── Phase 4: Task Prompt Generation ─────────────────────

  @Post(':idOrSlug/roadmap/:itemId/task-prompts')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Generate AI task prompt from roadmap item',
    description:
      'Converts a roadmap item into an implementation-ready AI prompt and structured task checklist.',
  })
  async generateTaskPrompt(
    @Param('idOrSlug') idOrSlug: string,
    @Param('itemId') itemId: string,
    @Body() dto: GenerateTaskPromptDto,
    @Req() req: any,
  ) {
    return this.roadmapService.generateTaskPrompt(
      idOrSlug,
      itemId,
      dto,
      this.getUserId(req),
    );
  }

  @Get(':idOrSlug/roadmap/:itemId/task-prompts')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'List generated task prompts for a roadmap item',
  })
  async listTaskPrompts(
    @Param('idOrSlug') idOrSlug: string,
    @Param('itemId') itemId: string,
    @Query() query: ListTaskPromptsDto,
    @Req() req: any,
  ) {
    return this.roadmapService.listTaskPrompts(
      idOrSlug,
      itemId,
      query,
      this.getUserId(req),
    );
  }

  private getUserId(req: any): string {
    const userId = req?.user?.id || req?.user?.sub;
    if (!userId) {
      throw new ForbiddenException('Authenticated user id is missing');
    }
    return userId;
  }
}
