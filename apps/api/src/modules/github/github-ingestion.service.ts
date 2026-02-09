import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type {
  DocumentChunk,
  IngestionJob,
  GitHubRepoConfig,
  IngestionStatus,
} from '@tokamak-pilot/shared';
import { GitHubService } from './github.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { VectorStoreService } from '../vector-store/vector-store.service';
import { chunkFiles, chunkIssues, chunkPullRequests } from './chunker.util';

@Injectable()
export class GitHubIngestionService {
  private readonly logger = new Logger(GitHubIngestionService.name);

  /** In-memory job tracker (replace with DB persistence later). */
  private jobs = new Map<string, IngestionJob>();

  constructor(
    private readonly githubService: GitHubService,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  /**
   * Ingest a single GitHub repository into the vector store.
   *
   * Pipeline:
   *  1. Fetch files, issues, PRs from GitHub
   *  2. Chunk the content
   *  3. Generate embeddings
   *  4. Store in Qdrant
   */
  async ingestRepo(
    config: GitHubRepoConfig,
    sourceId?: string,
  ): Promise<IngestionJob> {
    const jobId = uuidv4();
    const effectiveSourceId = sourceId ?? `github:${config.owner}/${config.repo}`;
    const job: IngestionJob = {
      id: jobId,
      sourceId: effectiveSourceId,
      status: 'pending',
      totalChunks: 0,
      processedChunks: 0,
      startedAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);

    // Run ingestion asynchronously
    this.runIngestion(job, config, effectiveSourceId).catch((error) => {
      this.logger.error(
        `Ingestion job ${jobId} failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
      this.updateJob(jobId, {
        status: 'failed',
        error: (error as Error).message,
        completedAt: new Date().toISOString(),
      });
    });

    return job;
  }

  /**
   * The actual ingestion pipeline, run asynchronously.
   */
  private async runIngestion(
    job: IngestionJob,
    config: GitHubRepoConfig,
    sourceId: string,
  ): Promise<void> {
    const { owner, repo } = config;
    const indexCode = config.indexCode !== false;
    const indexIssues = config.indexIssues !== false;
    const indexPRs = config.indexPullRequests ?? false;

    // -- Step 1: Fetch from GitHub --
    this.updateJob(job.id, { status: 'fetching' });
    this.logger.log(`[${job.id}] Fetching ${owner}/${repo}...`);

    const chunkOptions = {
      sourceId,
      sourceType: 'github_repo' as const,
      owner,
      repo,
    };

    const allChunks: DocumentChunk[] = [];

    // Fetch files
    if (indexCode) {
      const files = await this.githubService.fetchRepoFiles(
        owner,
        repo,
        config.branch,
        config.includePaths,
        config.excludePaths,
      );
      const fileChunks = chunkFiles(files, chunkOptions);
      allChunks.push(...fileChunks);
      this.logger.log(
        `[${job.id}] ${files.length} files -> ${fileChunks.length} chunks`,
      );
    }

    // Fetch issues
    if (indexIssues) {
      const issues = await this.githubService.fetchIssues(owner, repo);
      const issueChunks = chunkIssues(issues, chunkOptions);
      allChunks.push(...issueChunks);
      this.logger.log(
        `[${job.id}] ${issues.length} issues -> ${issueChunks.length} chunks`,
      );
    }

    // Fetch PRs
    if (indexPRs) {
      const prs = await this.githubService.fetchPullRequests(owner, repo);
      const prChunks = chunkPullRequests(prs, chunkOptions);
      allChunks.push(...prChunks);
      this.logger.log(
        `[${job.id}] ${prs.length} PRs -> ${prChunks.length} chunks`,
      );
    }

    this.updateJob(job.id, {
      status: 'chunking',
      totalChunks: allChunks.length,
    });

    if (allChunks.length === 0) {
      this.logger.warn(`[${job.id}] No chunks produced for ${owner}/${repo}`);
      this.updateJob(job.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      return;
    }

    // -- Step 2: Delete old vectors for this source (re-index) --
    this.logger.log(
      `[${job.id}] Cleaning up old vectors for source ${sourceId}`,
    );
    await this.vectorStoreService.deleteBySource(sourceId);

    // -- Step 3: Generate embeddings --
    this.updateJob(job.id, { status: 'embedding' });
    this.logger.log(
      `[${job.id}] Generating embeddings for ${allChunks.length} chunks...`,
    );

    const batchSize = 100;
    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize);
      const texts = batch.map((c) => c.content);
      const embeddings = await this.embeddingService.embedBatch(texts);

      for (let j = 0; j < batch.length; j++) {
        batch[j].embedding = embeddings[j];
      }

      this.updateJob(job.id, {
        processedChunks: Math.min(i + batchSize, allChunks.length),
      });
    }

    // -- Step 4: Store in Qdrant --
    this.updateJob(job.id, { status: 'storing' });
    this.logger.log(
      `[${job.id}] Storing ${allChunks.length} chunks in Qdrant...`,
    );

    await this.vectorStoreService.upsertChunks(allChunks);

    // -- Done --
    this.updateJob(job.id, {
      status: 'completed',
      processedChunks: allChunks.length,
      completedAt: new Date().toISOString(),
    });

    this.logger.log(
      `[${job.id}] Ingestion complete: ${allChunks.length} chunks indexed for ${owner}/${repo}`,
    );
  }

  /** Get the current status of an ingestion job. */
  getJob(jobId: string): IngestionJob | undefined {
    return this.jobs.get(jobId);
  }

  /** List all jobs (most recent first). */
  listJobs(): IngestionJob[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
  }

  private updateJob(
    jobId: string,
    update: Partial<Omit<IngestionJob, 'id'>>,
  ): void {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, update);
    }
  }
}
