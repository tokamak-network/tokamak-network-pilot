import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { throttling } from '@octokit/plugin-throttling';

/** A raw document fetched from GitHub before chunking. */
export interface RawDocument {
  title: string;
  content: string;
  contentType: string;
  url: string;
  metadata: Record<string, unknown>;
}

/** Repo metadata from the GitHub API. */
export interface RepoMeta {
  owner: string;
  repo: string;
  url: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  defaultBranch: string;
  isArchived: boolean;
  isFork: boolean;
  pushedAt: string | null;
}

// ── File types worth indexing ───────────────────────────────

/** Code / config extensions to fetch — covers most languages in crypto/web3 ecosystems */
const CODE_EXTENSIONS = [
  // Smart contracts & blockchain
  '.sol', '.vy', '.cairo', '.move',
  // Web / JS / TS
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  // Systems
  '.go', '.rs', '.c', '.cpp', '.h', '.hpp',
  // Scripting / data science
  '.py', '.rb', '.sh', '.bash',
  // JVM
  '.java', '.kt', '.scala',
  // Config & infra
  '.yaml', '.yml', '.toml', '.ini', '.env.example',
  // Build / CI
  '.dockerfile', '.graphql', '.proto',
];

/** Important standalone config files (matched by exact name) */
const CONFIG_FILES = [
  'package.json', 'tsconfig.json', 'hardhat.config.ts', 'hardhat.config.js',
  'foundry.toml', 'truffle-config.js', 'Cargo.toml', 'go.mod', 'go.sum',
  'Makefile', 'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
  '.github/workflows', 'turbo.json', 'nx.json', 'lerna.json',
  'pyproject.toml', 'requirements.txt', 'Gemfile',
];

/** Directories to skip entirely */
const SKIP_DIRS = [
  'node_modules', 'dist', 'build', '.next', '__pycache__',
  'target', 'vendor', '.git', 'coverage', '.nyc_output',
  'artifacts', 'cache', 'typechain-types', 'out',
];

const ThrottledOctokit = Octokit.plugin(throttling);

/** Default ms to wait between consecutive GitHub API requests */
const DEFAULT_REQUEST_DELAY_MS = 100;

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);
  private readonly octokit: InstanceType<typeof ThrottledOctokit>;
  private readonly requestDelayMs: number;
  private lastRequestTime = 0;

  constructor(private readonly config: ConfigService) {
    const token = this.config.get<string>('GITHUB_TOKEN');
    const logger = this.logger;

    this.requestDelayMs = parseInt(
      this.config.get<string>('GITHUB_REQUEST_DELAY_MS', String(DEFAULT_REQUEST_DELAY_MS)),
      10,
    );

    this.octokit = new ThrottledOctokit({
      auth: token || undefined,
      throttle: {
        onRateLimit: (retryAfter: number, options: any, _octokit: any, retryCount: number) => {
          const route = `${options.method} ${options.url}`;
          const waitMin = Math.ceil(retryAfter / 60);
          logger.warn(
            `GitHub rate limit hit on ${route} — attempt ${retryCount + 1}/5, ` +
            `waiting ${retryAfter}s (~${waitMin} min) before retry...`,
          );
          return retryCount < 5;
        },
        onSecondaryRateLimit: (retryAfter: number, options: any, _octokit: any, retryCount: number) => {
          const route = `${options.method} ${options.url}`;
          const waitMin = Math.ceil(retryAfter / 60);
          logger.warn(
            `GitHub secondary rate limit (abuse) on ${route} — attempt ${retryCount + 1}/3, ` +
            `waiting ${retryAfter}s (~${waitMin} min) before retry...`,
          );
          return retryCount < 3;
        },
      },
    });

    logger.log(
      `GitHub client initialized (authenticated: ${!!token}, inter-request delay: ${this.requestDelayMs}ms)`,
    );
  }

  /**
   * Enforce a minimum delay between consecutive GitHub API requests
   * to spread load and avoid bursting into rate limits.
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.requestDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, this.requestDelayMs - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Check remaining rate limit. If nearly exhausted, sleep until reset
   * and re-verify before returning. Guaranteed to return only when
   * there is usable quota available.
   */
  async checkRateLimit(): Promise<{ remaining: number; limit: number; resetAt: Date }> {
    const MAX_WAIT_CHECKS = 5;

    for (let attempt = 0; attempt < MAX_WAIT_CHECKS; attempt++) {
      const { data } = await this.octokit.rateLimit.get();
      const { remaining, limit, reset } = data.rate;
      const resetAt = new Date(reset * 1000);

      if (remaining >= 50) {
        if (remaining < 200) {
          this.logger.warn(`GitHub API: ${remaining}/${limit} requests remaining — running low`);
        } else {
          this.logger.debug(`GitHub API rate limit: ${remaining}/${limit} remaining`);
        }
        return { remaining, limit, resetAt };
      }

      // Quota is critically low — must wait for reset
      const waitMs = Math.max(0, resetAt.getTime() - Date.now()) + 5_000; // +5s buffer
      const waitMin = Math.ceil(waitMs / 60_000);
      this.logger.warn(
        `GitHub API: only ${remaining}/${limit} requests remaining. ` +
        `Pausing ~${waitMin} minute(s) until reset at ${resetAt.toISOString()}...`,
      );
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      this.logger.log('Rate limit wait complete — re-checking quota...');
    }

    // Fallback: return whatever the current state is
    const { data } = await this.octokit.rateLimit.get();
    const { remaining, limit, reset } = data.rate;
    this.logger.warn(`Rate limit after ${MAX_WAIT_CHECKS} wait cycles: ${remaining}/${limit}`);
    return { remaining, limit, resetAt: new Date(reset * 1000) };
  }

  /**
   * Lightweight guard to call between batches of work.
   * Only pauses if quota is critically low (< 50 remaining).
   */
  async guardRateLimit(): Promise<void> {
    try {
      await this.checkRateLimit();
    } catch {
      this.logger.debug('Rate limit guard check skipped (non-critical)');
    }
  }

  // ───────────────────── Org-level helpers ─────────────────────

  /**
   * List all public repos in an organization (with metadata).
   */
  async listOrgRepos(org: string): Promise<RepoMeta[]> {
    const repos: RepoMeta[] = [];
    let page = 1;

    while (true) {
      await this.throttle();
      const { data } = await this.octokit.repos.listForOrg({
        org,
        type: 'public',
        per_page: 100,
        page,
      });

      if (data.length === 0) break;

      for (const r of data) {
        repos.push({
          owner: r.owner.login,
          repo: r.name,
          url: r.html_url,
          description: r.description,
          language: r.language ?? null,
          topics: r.topics ?? [],
          stars: r.stargazers_count ?? 0,
          forks: r.forks_count ?? 0,
          defaultBranch: r.default_branch ?? 'main',
          isArchived: r.archived ?? false,
          isFork: r.fork ?? false,
          pushedAt: r.pushed_at ?? null,
        });
      }
      page++;
    }

    this.logger.log(`Found ${repos.length} repos in org "${org}"`);
    return repos;
  }

  /**
   * Get metadata for a single repo.
   */
  async getRepoMeta(owner: string, repo: string): Promise<RepoMeta> {
    await this.throttle();
    const { data: r } = await this.octokit.repos.get({ owner, repo });
    return {
      owner: r.owner.login,
      repo: r.name,
      url: r.html_url,
      description: r.description,
      language: r.language,
      topics: r.topics ?? [],
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      defaultBranch: r.default_branch ?? 'main',
      isArchived: r.archived ?? false,
      isFork: r.fork ?? false,
      pushedAt: r.pushed_at ?? null,
    };
  }

  // ───────────────────── Repo-level fetchers ─────────────────────

  /**
   * Fetch repo metadata as a document (description, topics, stats).
   */
  async fetchRepoMetadata(owner: string, repo: string): Promise<RawDocument[]> {
    try {
      const meta = await this.getRepoMeta(owner, repo);
      const content = [
        `# ${owner}/${repo}`,
        '',
        meta.description ? `**Description:** ${meta.description}` : '',
        meta.language ? `**Primary Language:** ${meta.language}` : '',
        meta.topics.length > 0 ? `**Topics:** ${meta.topics.join(', ')}` : '',
        `**Stars:** ${meta.stars} | **Forks:** ${meta.forks}`,
        `**Default Branch:** ${meta.defaultBranch}`,
        meta.isArchived ? '**Status:** Archived' : '',
        meta.isFork ? '**Note:** This is a fork' : '',
        meta.pushedAt ? `**Last Push:** ${meta.pushedAt}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      return [
        {
          title: `${owner}/${repo} — Repository Info`,
          content,
          contentType: 'readme',
          url: `https://github.com/${owner}/${repo}`,
          metadata: { ...meta },
        },
      ];
    } catch {
      return [];
    }
  }

  /**
   * Fetch the README of a repo.
   */
  async fetchRepoReadme(owner: string, repo: string): Promise<RawDocument[]> {
    try {
      await this.throttle();
      const { data } = await this.octokit.repos.getReadme({ owner, repo });
      const content = Buffer.from(data.content, 'base64').toString('utf-8');

      return [
        {
          title: `${owner}/${repo} — README`,
          content,
          contentType: 'readme',
          url: data.html_url ?? `https://github.com/${owner}/${repo}`,
          metadata: { owner, repo, path: data.path },
        },
      ];
    } catch (error: any) {
      if (error.status === 404) {
        this.logger.debug(`No README found for ${owner}/${repo}`);
        return [];
      }
      throw error;
    }
  }

  /**
   * Fetch ALL markdown files across all branches of the repo.
   * The default branch is fetched first; other branches contribute
   * only files whose path doesn't already exist in the default branch,
   * or whose content differs (tracked by SHA to avoid duplicate fetches).
   */
  async fetchAllMarkdown(owner: string, repo: string, maxFiles = 500): Promise<RawDocument[]> {
    const docs: RawDocument[] = [];
    // Track (path -> sha) so we don't re-fetch identical blobs across branches
    const seenBlobShas = new Map<string, Set<string>>();

    let meta: RepoMeta | null = null;
    try {
      meta = await this.getRepoMeta(owner, repo);
    } catch {
      // proceed without metadata
    }
    const defaultBranch = meta?.defaultBranch ?? 'main';

    let branches: string[] = [defaultBranch];
    try {
      const allBranches = await this.listBranches(owner, repo);
      // Put the default branch first, then add the rest
      branches = [
        defaultBranch,
        ...allBranches.filter((b) => b !== defaultBranch),
      ];
    } catch {
      this.logger.warn(`Could not list branches for ${owner}/${repo}, falling back to default branch only`);
    }

    this.logger.log(`Scanning ${branches.length} branch(es) for markdown in ${owner}/${repo}`);

    for (const branch of branches) {
      if (docs.length >= maxFiles) break;

      try {
        const { tree, truncated } = await this.getRepoTreeForRef(owner, repo, branch);

        if (truncated) {
          this.logger.warn(
            `Repository ${owner}/${repo} tree (branch: ${branch}) was truncated by GitHub — some deeply nested .md files may be missed`,
          );
        }

        const mdFiles = tree.filter(
          (f) =>
            f.type === 'blob' &&
            f.path &&
            /\.(md|mdx|rst)$/i.test(f.path) &&
            !SKIP_DIRS.some((d) => f.path!.includes(`${d}/`)) &&
            (f.size ?? 0) < 500_000,
        );

        let branchDocsCount = 0;
        for (const file of mdFiles) {
          if (docs.length >= maxFiles) break;

          const fileSha = file.sha ?? '';
          const pathShas = seenBlobShas.get(file.path!);
          if (pathShas?.has(fileSha)) continue;

          if (!pathShas) {
            seenBlobShas.set(file.path!, new Set([fileSha]));
          } else {
            pathShas.add(fileSha);
          }

          try {
            const content = await this.fetchFileContent(owner, repo, file.path!, branch);
            if (content.trim().length < 20) continue;

            const isDefault = branch === defaultBranch;
            const branchLabel = isDefault ? '' : ` [${branch}]`;

            docs.push({
              title: `${owner}/${repo}: ${file.path}${branchLabel}`,
              content,
              contentType: 'documentation',
              url: `https://github.com/${owner}/${repo}/blob/${branch}/${file.path}`,
              metadata: {
                owner,
                repo,
                path: file.path,
                branch,
                isDefaultBranch: isDefault,
                size: file.size,
              },
            });
            branchDocsCount++;
          } catch {
            // skip unreadable
          }
        }

        if (branchDocsCount > 0) {
          this.logger.log(
            `Branch "${branch}": found ${branchDocsCount} new markdown files in ${owner}/${repo}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Could not fetch markdown tree for ${owner}/${repo} branch "${branch}": ${error}`,
        );
      }
    }

    this.logger.log(
      `Fetched ${docs.length} total markdown files from ${owner}/${repo} across ${branches.length} branch(es)`,
    );
    return docs;
  }

  /**
   * Fetch issues (open and closed, most recent first).
   */
  async fetchIssues(owner: string, repo: string, maxIssues = 100): Promise<RawDocument[]> {
    const docs: RawDocument[] = [];
    let page = 1;

    while (docs.length < maxIssues) {
      await this.throttle();
      const { data } = await this.octokit.issues.listForRepo({
        owner,
        repo,
        state: 'all',
        sort: 'updated',
        direction: 'desc',
        per_page: Math.min(100, maxIssues - docs.length),
        page,
      });

      if (data.length === 0) break;

      for (const issue of data) {
        if (issue.pull_request) continue;

        await this.throttle();
        const comments = await this.fetchIssueComments(owner, repo, issue.number);
        const body = [
          `# ${issue.title}`,
          '',
          `State: ${issue.state} | Labels: ${issue.labels.map((l) => (typeof l === 'string' ? l : l.name)).join(', ')}`,
          '',
          issue.body || '(no description)',
          '',
          ...comments.map((c, i) => `--- Comment ${i + 1} ---\n${c}`),
        ].join('\n');

        docs.push({
          title: `Issue #${issue.number}: ${issue.title}`,
          content: body,
          contentType: 'issue',
          url: issue.html_url,
          metadata: {
            owner,
            repo,
            number: issue.number,
            state: issue.state,
            labels: issue.labels.map((l) => (typeof l === 'string' ? l : l.name)),
          },
        });
      }

      page++;
    }

    this.logger.log(`Fetched ${docs.length} issues from ${owner}/${repo}`);
    return docs;
  }

  /**
   * Fetch pull requests (open and closed/merged).
   */
  async fetchPullRequests(owner: string, repo: string, maxPRs = 50): Promise<RawDocument[]> {
    const docs: RawDocument[] = [];
    let page = 1;

    while (docs.length < maxPRs) {
      await this.throttle();
      const { data } = await this.octokit.pulls.list({
        owner,
        repo,
        state: 'all',
        sort: 'updated',
        direction: 'desc',
        per_page: Math.min(100, maxPRs - docs.length),
        page,
      });

      if (data.length === 0) break;

      for (const pr of data) {
        const body = [
          `# PR #${pr.number}: ${pr.title}`,
          '',
          `State: ${pr.state} | Merged: ${pr.merged_at ? 'yes' : 'no'}`,
          `Base: ${pr.base.ref} <- Head: ${pr.head.ref}`,
          '',
          pr.body || '(no description)',
        ].join('\n');

        docs.push({
          title: `PR #${pr.number}: ${pr.title}`,
          content: body,
          contentType: 'pull_request',
          url: pr.html_url,
          metadata: {
            owner,
            repo,
            number: pr.number,
            state: pr.state,
            merged: !!pr.merged_at,
          },
        });
      }

      page++;
    }

    this.logger.log(`Fetched ${docs.length} PRs from ${owner}/${repo}`);
    return docs;
  }

  /**
   * Fetch code files broadly — all languages, config files, etc.
   */
  async fetchCodeFiles(
    owner: string,
    repo: string,
    maxFiles = 150,
  ): Promise<RawDocument[]> {
    const docs: RawDocument[] = [];

    let meta: RepoMeta | null = null;
    try {
      meta = await this.getRepoMeta(owner, repo);
    } catch {
      this.logger.warn(`Could not fetch metadata for ${owner}/${repo}, branch resolution may be inaccurate`);
    }
    const branch = meta?.defaultBranch ?? 'main';

    try {
      const { tree } = await this.getRepoTreeForRef(owner, repo, branch);

      const isCodeFile = (path: string) =>
        CODE_EXTENSIONS.some((ext) => path.endsWith(ext));

      const isConfigFile = (path: string) =>
        CONFIG_FILES.some((name) => path === name || path.endsWith(`/${name}`));

      const isSkippedDir = (path: string) =>
        SKIP_DIRS.some((d) => path.includes(`${d}/`) || path.startsWith(`${d}/`));

      const codeFiles = tree
        .filter(
          (f) =>
            f.type === 'blob' &&
            f.path &&
            !isSkippedDir(f.path) &&
            !f.path.endsWith('.min.js') &&
            !f.path.endsWith('.min.css') &&
            !f.path.endsWith('.map') &&
            !f.path.endsWith('.lock') &&
            !f.path.endsWith('package-lock.json') &&
            !f.path.endsWith('yarn.lock') &&
            !f.path.endsWith('pnpm-lock.yaml') &&
            (isCodeFile(f.path) || isConfigFile(f.path)) &&
            (f.size ?? 0) < 100_000, // skip large generated files
        )
        .slice(0, maxFiles);

      for (const file of codeFiles) {
        try {
          const content = await this.fetchFileContent(owner, repo, file.path!);
          // Skip empty/trivial files
          if (content.trim().length < 20) continue;

          docs.push({
            title: `${owner}/${repo}: ${file.path}`,
            content,
            contentType: 'code',
            url: `https://github.com/${owner}/${repo}/blob/${branch}/${file.path}`,
            metadata: { owner, repo, path: file.path, branch, size: file.size },
          });
        } catch {
          // skip unreadable files
        }
      }
    } catch (error) {
      this.logger.warn(`Could not fetch code tree for ${owner}/${repo}: ${error}`);
    }

    this.logger.log(`Fetched ${docs.length} code files from ${owner}/${repo}`);
    return docs;
  }

  /**
   * Fetch wiki pages (if the repo has a wiki).
   */
  async fetchWiki(owner: string, repo: string): Promise<RawDocument[]> {
    try {
      const wikiRepo = `${repo}.wiki`;
      await this.throttle();
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo: wikiRepo,
        path: '',
      });

      if (!Array.isArray(data)) return [];

      const docs: RawDocument[] = [];
      const mdFiles = data.filter((f) => f.type === 'file' && f.name.endsWith('.md'));

      for (const file of mdFiles) {
        try {
          const content = await this.fetchFileContent(owner, wikiRepo, file.path);
          docs.push({
            title: `Wiki: ${file.name.replace('.md', '')}`,
            content,
            contentType: 'wiki',
            url: `https://github.com/${owner}/${repo}/wiki/${file.name.replace('.md', '')}`,
            metadata: { owner, repo, path: file.path, isWiki: true },
          });
        } catch {
          // skip
        }
      }

      this.logger.log(`Fetched ${docs.length} wiki pages from ${owner}/${repo}`);
      return docs;
    } catch {
      this.logger.debug(`No wiki found for ${owner}/${repo}`);
      return [];
    }
  }

  /**
   * Fetch repo content with configurable depth.
   *
   * - `light` (default): Only metadata + README + all .md files.
   *   Fast, no rate-limit concerns — ideal for bulk org ingestion.
   *
   * - `full`: Everything — metadata, README, markdown, issues, PRs,
   *   code files, wiki. Use on-demand per repo.
   */
  async fetchAllRepoContent(
    owner: string,
    repo: string,
    mode: 'light' | 'full' = 'light',
  ): Promise<{
    documents: RawDocument[];
    breakdown: Record<string, number>;
    meta: RepoMeta | null;
  }> {
    this.logger.log(`Fetching ${mode} content from ${owner}/${repo}...`);

    await this.guardRateLimit();

    // Fetch repo metadata separately so we can return it for the caller
    let meta: RepoMeta | null = null;
    try {
      meta = await this.getRepoMeta(owner, repo);
    } catch {
      this.logger.warn(`Could not fetch metadata for ${owner}/${repo}`);
    }

    // Light mode: only markdown / docs
    const lightFetchers: Array<Promise<RawDocument[]>> = [
      this.fetchRepoMetadata(owner, repo),
      this.fetchRepoReadme(owner, repo),
      this.fetchAllMarkdown(owner, repo),
    ];
    const lightLabels = ['metadata', 'readme', 'documentation'];

    // Full mode: add issues, PRs, code, wiki
    const fullFetchers: Array<Promise<RawDocument[]>> = mode === 'full'
      ? [
          this.fetchIssues(owner, repo),
          this.fetchPullRequests(owner, repo),
          this.fetchCodeFiles(owner, repo),
          this.fetchWiki(owner, repo),
        ]
      : [];
    const fullLabels = mode === 'full' ? ['issues', 'prs', 'code', 'wiki'] : [];

    const results = await Promise.allSettled([...lightFetchers, ...fullFetchers]);
    const labels = [...lightLabels, ...fullLabels];

    const all: RawDocument[] = [];
    const breakdown: Record<string, number> = {};

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        all.push(...result.value);
        breakdown[labels[i]] = result.value.length;
      } else {
        breakdown[labels[i]] = 0;
        this.logger.warn(
          `Failed to fetch ${labels[i]} for ${owner}/${repo}: ${result.reason}`,
        );
      }
    });

    this.logger.log(
      `Total: ${all.length} documents (${mode}) from ${owner}/${repo} — ${JSON.stringify(breakdown)}`,
    );
    return { documents: all, breakdown, meta };
  }

  // ───────────────────── Branch helpers ─────────────────────

  /**
   * List all branch names for a repo.
   */
  async listBranches(owner: string, repo: string): Promise<string[]> {
    const branches: string[] = [];
    let page = 1;

    try {
      while (true) {
        await this.throttle();
        const { data } = await this.octokit.repos.listBranches({
          owner,
          repo,
          per_page: 100,
          page,
        });
        if (data.length === 0) break;
        for (const b of data) {
          branches.push(b.name);
        }
        if (data.length < 100) break;
        page++;
      }
    } catch (error) {
      this.logger.warn(`Could not list branches for ${owner}/${repo}: ${error}`);
    }

    return branches;
  }

  /**
   * Fetch the repo tree for a specific branch/ref.
   */
  private async getRepoTreeForRef(owner: string, repo: string, ref: string) {
    await this.throttle();
    const { data } = await this.octokit.git.getTree({
      owner,
      repo,
      tree_sha: ref,
      recursive: 'true',
    });
    return { tree: data.tree, truncated: !!data.truncated };
  }

  // ───────────────────── Private helpers ─────────────────────

  private async fetchIssueComments(
    owner: string,
    repo: string,
    issueNumber: number,
    maxComments = 10,
  ): Promise<string[]> {
    try {
      await this.throttle();
      const { data } = await this.octokit.issues.listComments({
        owner,
        repo,
        issue_number: issueNumber,
        per_page: maxComments,
      });
      return data.map((c) => c.body || '').filter(Boolean);
    } catch {
      return [];
    }
  }

  private async fetchFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<string> {
    await this.throttle();
    const { data } = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
      ...(ref ? { ref } : {}),
    });
    if (Array.isArray(data) || data.type !== 'file') {
      throw new Error(`${path} is not a file`);
    }
    return Buffer.from((data as any).content, 'base64').toString('utf-8');
  }

  private async getRepoTree(owner: string, repo: string) {
    await this.throttle();
    const { data } = await this.octokit.git.getTree({
      owner,
      repo,
      tree_sha: 'HEAD',
      recursive: 'true',
    });
    return { tree: data.tree, truncated: !!data.truncated };
  }
}
