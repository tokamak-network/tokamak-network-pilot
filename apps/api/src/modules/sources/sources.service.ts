import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { Source, SourceType, SourceStatus } from '@tokamak-pilot/shared';
import { GitHubIngestionService } from '../github/github-ingestion.service';
import { VectorStoreService } from '../vector-store/vector-store.service';

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);

  /**
   * In-memory source registry.
   * TODO: Replace with PostgreSQL persistence.
   */
  private sources = new Map<string, Source>();

  constructor(
    private readonly githubIngestionService: GitHubIngestionService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  async findAll() {
    const sources = Array.from(this.sources.values()).sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return { sources, total: sources.length };
  }

  async findOne(id: string) {
    const source = this.sources.get(id);
    if (!source) {
      return { error: 'Source not found', id };
    }
    return source;
  }

  async create(data: {
    name: string;
    type: SourceType;
    config: Record<string, unknown>;
  }) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const source: Source = {
      id,
      name: data.name,
      type: data.type,
      status: 'active',
      config: data.config,
      createdAt: now,
      updatedAt: now,
    };

    this.sources.set(id, source);
    this.logger.log(`Created source "${data.name}" (${id})`);

    // Auto-trigger ingestion for GitHub repos
    if (data.type === 'github_repo' && data.config.owner && data.config.repo) {
      this.logger.log(`Auto-triggering ingestion for ${data.config.owner}/${data.config.repo}`);
      this.updateSourceStatus(id, 'syncing');

      this.githubIngestionService
        .ingestRepo(
          {
            owner: data.config.owner as string,
            repo: data.config.repo as string,
            branch: data.config.branch as string | undefined,
            includePaths: data.config.includePaths as string[] | undefined,
            excludePaths: data.config.excludePaths as string[] | undefined,
            indexIssues: data.config.indexIssues as boolean | undefined,
            indexPullRequests: data.config.indexPullRequests as boolean | undefined,
            indexCode: data.config.indexCode as boolean | undefined,
          },
          id,
        )
        .then((job) => {
          // Watch for completion
          const interval = setInterval(() => {
            const currentJob = this.githubIngestionService.getJob(job.id);
            if (!currentJob) {
              clearInterval(interval);
              return;
            }
            if (currentJob.status === 'completed') {
              this.updateSourceStatus(id, 'active');
              this.updateSourceLastSync(id);
              clearInterval(interval);
            } else if (currentJob.status === 'failed') {
              this.updateSourceStatus(id, 'error');
              clearInterval(interval);
            }
          }, 2000);
        })
        .catch(() => {
          this.updateSourceStatus(id, 'error');
        });
    }

    return source;
  }

  async update(id: string, data: Partial<Source>) {
    const source = this.sources.get(id);
    if (!source) {
      return { error: 'Source not found', id };
    }

    const updated: Source = {
      ...source,
      ...data,
      id, // preserve ID
      updatedAt: new Date().toISOString(),
    };
    this.sources.set(id, updated);
    this.logger.log(`Updated source ${id}`);
    return updated;
  }

  async remove(id: string) {
    const source = this.sources.get(id);
    if (!source) {
      return { error: 'Source not found', id };
    }

    // Delete vectors from Qdrant
    await this.vectorStoreService.deleteBySource(id);
    this.sources.delete(id);

    this.logger.log(`Removed source ${id} and its vectors`);
    return { message: 'Source removed successfully', id };
  }

  async sync(id: string) {
    const source = this.sources.get(id);
    if (!source) {
      return { error: 'Source not found', id };
    }

    if (source.type === 'github_repo') {
      this.updateSourceStatus(id, 'syncing');

      const job = await this.githubIngestionService.ingestRepo(
        {
          owner: source.config.owner as string,
          repo: source.config.repo as string,
          branch: source.config.branch as string | undefined,
          includePaths: source.config.includePaths as string[] | undefined,
          excludePaths: source.config.excludePaths as string[] | undefined,
          indexIssues: source.config.indexIssues as boolean | undefined,
          indexPullRequests: source.config.indexPullRequests as boolean | undefined,
          indexCode: source.config.indexCode as boolean | undefined,
        },
        id,
      );

      return {
        message: `Re-indexing started for ${source.name}`,
        jobId: job.id,
        status: job.status,
      };
    }

    return { message: `Sync not yet implemented for source type: ${source.type}`, id };
  }

  private updateSourceStatus(id: string, status: SourceStatus): void {
    const source = this.sources.get(id);
    if (source) {
      source.status = status;
      source.updatedAt = new Date().toISOString();
    }
  }

  private updateSourceLastSync(id: string): void {
    const source = this.sources.get(id);
    if (source) {
      source.lastSyncedAt = new Date().toISOString();
      source.updatedAt = new Date().toISOString();
    }
  }
}
