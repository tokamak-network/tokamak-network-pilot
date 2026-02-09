import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { GitHubIngestionService } from './github-ingestion.service';
import { GitHubService } from './github.service';
import { IngestRepoDto } from './dto/ingest-repo.dto';

@ApiTags('sources')
@Controller('sources/github')
export class GitHubController {
  constructor(
    private readonly ingestionService: GitHubIngestionService,
    private readonly githubService: GitHubService,
  ) {}

  @Post('ingest')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Ingest a GitHub repository into the knowledge base',
    description:
      'Fetches files, issues, and PRs from a GitHub repository, chunks the content, generates embeddings, and stores them in the vector database. Returns immediately with a job ID; ingestion runs in the background.',
  })
  @ApiBody({ type: IngestRepoDto })
  async ingestRepo(@Body() dto: IngestRepoDto) {
    const job = await this.ingestionService.ingestRepo(dto);
    return {
      message: `Ingestion started for ${dto.owner}/${dto.repo}`,
      jobId: job.id,
      status: job.status,
    };
  }

  @Get('jobs')
  @ApiOperation({ summary: 'List all ingestion jobs' })
  async listJobs() {
    return { jobs: this.ingestionService.listJobs() };
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get the status of an ingestion job' })
  async getJob(@Param('jobId') jobId: string) {
    const job = this.ingestionService.getJob(jobId);
    if (!job) {
      return { error: 'Job not found', jobId };
    }
    return job;
  }

  @Get('repos/:owner')
  @ApiOperation({
    summary: 'List repos for a GitHub org or user',
    description:
      'Lists public repos in the given GitHub org. Useful for selecting which repos to ingest.',
  })
  async listOrgRepos(@Param('owner') owner: string) {
    const repos = await this.githubService.listOrgRepos(owner);
    return { owner, repos, total: repos.length };
  }
}
