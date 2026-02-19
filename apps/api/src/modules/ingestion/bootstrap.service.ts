import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Source } from '../../entities/source.entity';
import { GitHubService } from '../github/github.service';
import { INGESTION_QUEUE } from './ingestion.processor';
import type { IngestionJobData } from './ingestion.processor';

/**
 * Auto-seeds sources from GITHUB_ORGS and GITHUB_REPOS env vars on startup.
 *
 * - Reads GITHUB_ORGS (comma-separated org names)
 * - Reads GITHUB_REPOS (comma-separated "owner/repo" entries)
 * - For each org, fetches all repos and creates individual sources
 * - Skips sources that already exist in the database
 * - Enqueues ingestion jobs for newly created sources
 */
@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Source)
    private readonly sourceRepo: Repository<Source>,
    @InjectQueue(INGESTION_QUEUE)
    private readonly ingestionQueue: Queue<IngestionJobData>,
    private readonly github: GitHubService,
  ) {}

  async onApplicationBootstrap() {
    const autoSeed = this.config.get<string>('AUTO_SEED_ON_STARTUP', 'true');
    if (autoSeed === 'false' || autoSeed === '0') {
      this.logger.log('Auto-seed disabled (AUTO_SEED_ON_STARTUP=false)');
      return;
    }

    // Small delay to let other services initialize (Qdrant, DB, etc.)
    setTimeout(
      () => this.seed().catch((e) => this.logger.error(`Bootstrap failed: ${e.message}`, e.stack)),
      3000,
    );
  }

  private async seed() {
    const orgs = this.parseList(this.config.get<string>('GITHUB_ORGS', ''));
    const repos = this.parseList(this.config.get<string>('GITHUB_REPOS', ''));

    if (orgs.length === 0 && repos.length === 0) {
      this.logger.log('No GITHUB_ORGS or GITHUB_REPOS configured — skipping auto-seed');
      return;
    }

    // Pre-flight rate limit check — pause if nearly exhausted
    try {
      const { remaining, limit } = await this.github.checkRateLimit();
      this.logger.log(`GitHub API budget: ${remaining}/${limit} requests remaining`);
    } catch (error: any) {
      this.logger.warn(`Could not check GitHub rate limit: ${error.message}`);
    }

    this.logger.log(
      `Auto-seed: ${orgs.length} org(s), ${repos.length} explicit repo(s)`,
    );

    // 1. Resolve orgs into individual repos (with metadata for sorting)
    const repoList: Array<{ owner: string; repo: string; pushedAt: string | null; stars: number }> = [];

    for (const org of orgs) {
      try {
        await this.github.guardRateLimit();
        const orgRepos = await this.github.listOrgRepos(org);
        for (const r of orgRepos) {
          repoList.push({ owner: r.owner, repo: r.repo, pushedAt: r.pushedAt, stars: r.stars });
        }
      } catch (error: any) {
        this.logger.warn(`Could not list repos for org "${org}": ${error.message}`);
      }
    }

    // 2. Add explicitly configured repos
    for (const entry of repos) {
      const match = entry.match(/^([^\/]+)\/([^\/]+)$/);
      if (match) {
        repoList.push({ owner: match[1], repo: match[2], pushedAt: null, stars: 0 });
      } else {
        this.logger.warn(`Invalid GITHUB_REPOS entry: "${entry}" — expected "owner/repo"`);
      }
    }

    if (repoList.length === 0) {
      this.logger.log('No repos resolved — nothing to seed');
      return;
    }

    this.logger.log(`Resolved ${repoList.length} repos to check`);

    // 3. Create sources that don't already exist
    let created = 0;
    for (const { owner, repo, pushedAt, stars } of repoList) {
      const name = `${owner}/${repo}`;

      // Check if a source with this name already exists
      const existing = await this.sourceRepo.findOneBy({ name });
      if (existing) {
        // Update pushedAt if we now have newer data from GitHub
        if (pushedAt && (existing.config as any)?.pushedAt !== pushedAt) {
          await this.sourceRepo.update(existing.id, {
            config: { ...existing.config, pushedAt, stars },
          });
        }
        continue; // Already seeded
      }

      // Create the source with light fetch mode and GitHub metadata
      const source = this.sourceRepo.create({
        name,
        type: 'github_repo',
        status: 'active',
        config: { owner, repo, fetchMode: 'light', pushedAt, stars },
      });

      const saved = await this.sourceRepo.save(source);

      // Enqueue light ingestion (markdown/docs only)
      await this.ingestionQueue.add(
        'ingest',
        { sourceId: saved.id, action: 'ingest', fetchMode: 'light' },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );

      created++;
      this.logger.log(`Seeded source: ${name} (id=${saved.id})`);
    }

    if (created > 0) {
      this.logger.log(
        `Auto-seed complete: ${created} new source(s) created and queued for ingestion`,
      );
    } else {
      this.logger.log('Auto-seed: all sources already exist — nothing new to ingest');
    }
  }

  private parseList(value: string): string[] {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
