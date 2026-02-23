import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Submit feedback on an assistant message',
    description:
      'Rate an assistant message with thumbs up/down. One rating per user per message; re-submitting updates the existing rating.',
  })
  @ApiBody({ type: SubmitFeedbackDto })
  async submit(@Body() dto: SubmitFeedbackDto, @Req() req: any) {
    return this.service.submit(dto, req.user.id);
  }

  @Get('message/:messageId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get your feedback for a specific message',
    description: 'Returns your feedback for the given message, or null if not yet rated.',
  })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  async getForMessage(@Param('messageId') messageId: string, @Req() req: any) {
    return this.service.getForMessage(messageId, req.user.id);
  }

  @Get('stats')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get feedback statistics',
    description:
      'Returns overall feedback stats: total, up/down counts, satisfaction rate, and recent negative feedback.',
  })
  async stats() {
    return this.service.stats();
  }

  @Get('suggested-questions')
  @ApiOperation({
    summary: 'Get suggested questions',
    description:
      'Returns popular and curated questions to help users get started. Does not require authentication.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 6 })
  async suggestedQuestions(@Query('limit') limit?: number) {
    return this.service.suggestedQuestions(limit ? Number(limit) : undefined);
  }
}
