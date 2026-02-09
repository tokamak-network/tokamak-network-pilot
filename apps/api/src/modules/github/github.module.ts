import { Module } from '@nestjs/common';
import { GitHubService } from './github.service';
import { GitHubIngestionService } from './github-ingestion.service';
import { GitHubController } from './github.controller';

@Module({
  controllers: [GitHubController],
  providers: [GitHubService, GitHubIngestionService],
  exports: [GitHubService, GitHubIngestionService],
})
export class GitHubModule {}
