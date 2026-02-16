import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProduces } from '@nestjs/swagger';
import { LlmsTxtService } from './llms-txt.service';

@ApiTags('llms-txt')
@Controller()
export class LlmsTxtController {
  constructor(private readonly llmsTxtService: LlmsTxtService) {}

  @Get('llms.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({
    summary: 'llms.txt — Brief knowledge overview for LLMs',
    description:
      'Serves a standardized llms.txt file following the llms.txt spec (https://llmstxt.org/). ' +
      'Provides a brief overview of Tokamak Network knowledge for LLMs and AI agents.',
  })
  @ApiProduces('text/plain')
  async getLlmsTxt(): Promise<string> {
    return this.llmsTxtService.generateBrief();
  }

  @Get('llms-full.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({
    summary: 'llms-full.txt — Detailed knowledge base for LLMs',
    description:
      'Serves a full-detail llms.txt file with complete project summaries, content entries, ' +
      'and knowledge source details. Designed for comprehensive LLM consumption.',
  })
  @ApiProduces('text/plain')
  async getLlmsFullTxt(): Promise<string> {
    return this.llmsTxtService.generateFull();
  }
}
