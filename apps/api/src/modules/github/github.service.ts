import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';

export interface GitHubFile {
  path: string;
  content: string;
  url: string;
  sha: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  url: string;
  state: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  comments: GitHubComment[];
}

export interface GitHubComment {
  body: string;
  author: string;
  createdAt: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string;
  url: string;
  state: string;
  merged: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RepoMetadata {
  owner: string;
  repo: string;
  description: string;
  defaultBranch: string;
  language: string | null;
  topics: string[];
  stars: number;
  url: string;
}

/** File extensions we want to index */
const INDEXABLE_EXTENSIONS = new Set([
  '.md',
  '.mdx',
  '.txt',
  '.rst',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.sol',
  '.py',
  '.go',
  '.rs',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
]);

/** Files/directories to always skip */
const SKIP_PATTERNS = [
  'node_modules',
  'dist',
  'build',
  '.git',
  'coverage',
  '__pycache__',
  '.next',
  'vendor',
  'target',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
];

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);
  private octokit: Octokit;

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('GITHUB_TOKEN');
    this.octokit = new Octokit({
      ...(token ? { auth: token } : {}),
    });

    if (!token) {
      this.logger.warn(
        'GITHUB_TOKEN not set — API rate limits will be very low (60 req/hour)',
      );
    }
  }

  /** Get metadata for a repository. */
  async getRepoMetadata(owner: string, repo: string): Promise<RepoMetadata> {
    const { data } = await this.octokit.repos.get({ owner, repo });
    return {
      owner,
      repo,
      description: data.description ?? '',
      defaultBranch: data.default_branch,
      language: data.language,
      topics: data.topics ?? [],
      stars: data.stargazers_count,
      url: data.html_url,
    };
  }

  /**
   * Recursively fetch all indexable files from a repo.
   * Uses the Git Trees API for efficiency (single call for entire tree).
   */
  async fetchRepoFiles(
    owner: string,
    repo: string,
    branch?: string,
    includePaths?: string[],
    excludePaths?: string[],
  ): Promise<GitHubFile[]> {
    const ref = branch ?? (await this.getDefaultBranch(owner, repo));

    this.logger.log(
      `Fetching file tree for ${owner}/${repo}@${ref}`,
    );

    // Get the full tree recursively
    const { data: tree } = await this.octokit.git.getTree({
      owner,
      repo,
      tree_sha: ref,
      recursive: 'true',
    });

    // Filter to indexable files
    const files = tree.tree.filter((item) => {
      if (item.type !== 'blob' || !item.path) return false;

      // Skip known non-useful paths
      if (SKIP_PATTERNS.some((p) => item.path!.includes(p))) return false;

      // Check extension
      const ext = this.getExtension(item.path);
      if (!INDEXABLE_EXTENSIONS.has(ext)) return false;

      // Apply include patterns
      if (includePaths && includePaths.length > 0) {
        if (!includePaths.some((p) => item.path!.startsWith(p))) return false;
      }

      // Apply exclude patterns
      if (excludePaths && excludePaths.length > 0) {
        if (excludePaths.some((p) => item.path!.startsWith(p))) return false;
      }

      return true;
    });

    this.logger.log(
      `Found ${files.length} indexable files in ${owner}/${repo}`,
    );

    // Fetch content for each file (in batches to respect rate limits)
    const results: GitHubFile[] = [];
    const batchSize = 10;

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (file) => {
          try {
            return await this.fetchFileContent(owner, repo, file.path!, ref);
          } catch (error) {
            this.logger.warn(
              `Failed to fetch ${file.path}: ${(error as Error).message}`,
            );
            return null;
          }
        }),
      );
      results.push(...batchResults.filter(Boolean) as GitHubFile[]);
    }

    return results;
  }

  /** Fetch a single file's content. */
  async fetchFileContent(
    owner: string,
    repo: string,
    path: string,
    ref: string,
  ): Promise<GitHubFile> {
    const { data } = await this.octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    // getContent returns file data with content base64-encoded
    if ('content' in data && data.type === 'file') {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return {
        path,
        content,
        url: data.html_url ?? `https://github.com/${owner}/${repo}/blob/${ref}/${path}`,
        sha: data.sha,
      };
    }

    throw new Error(`${path} is not a file`);
  }

  /**
   * Fetch issues from a repo (open + recently closed).
   */
  async fetchIssues(
    owner: string,
    repo: string,
    maxIssues = 100,
  ): Promise<GitHubIssue[]> {
    this.logger.log(`Fetching issues for ${owner}/${repo}`);

    const { data: issues } = await this.octokit.issues.listForRepo({
      owner,
      repo,
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: Math.min(maxIssues, 100),
    });

    const results: GitHubIssue[] = [];

    for (const issue of issues) {
      // Skip pull requests (GitHub lists them as issues too)
      if (issue.pull_request) continue;

      // Fetch comments for issues with discussion
      let comments: GitHubComment[] = [];
      if (issue.comments > 0) {
        try {
          const { data: issueComments } = await this.octokit.issues.listComments({
            owner,
            repo,
            issue_number: issue.number,
            per_page: 20,
          });
          comments = issueComments.map((c) => ({
            body: c.body ?? '',
            author: c.user?.login ?? 'unknown',
            createdAt: c.created_at,
          }));
        } catch {
          // Skip if we can't fetch comments
        }
      }

      results.push({
        number: issue.number,
        title: issue.title,
        body: issue.body ?? '',
        url: issue.html_url,
        state: issue.state,
        labels: issue.labels.map((l) =>
          typeof l === 'string' ? l : l.name ?? '',
        ),
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        comments,
      });
    }

    this.logger.log(
      `Fetched ${results.length} issues from ${owner}/${repo}`,
    );
    return results;
  }

  /**
   * Fetch pull requests (merged/open).
   */
  async fetchPullRequests(
    owner: string,
    repo: string,
    maxPRs = 50,
  ): Promise<GitHubPullRequest[]> {
    this.logger.log(`Fetching PRs for ${owner}/${repo}`);

    const { data: prs } = await this.octokit.pulls.list({
      owner,
      repo,
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: Math.min(maxPRs, 100),
    });

    return prs.map((pr) => ({
      number: pr.number,
      title: pr.title,
      body: pr.body ?? '',
      url: pr.html_url,
      state: pr.state,
      merged: pr.merged_at !== null,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
    }));
  }

  /**
   * List all repos for a GitHub organization.
   */
  async listOrgRepos(org: string): Promise<RepoMetadata[]> {
    const repos: RepoMetadata[] = [];
    let page = 1;

    while (true) {
      const { data } = await this.octokit.repos.listForOrg({
        org,
        type: 'public',
        sort: 'updated',
        per_page: 100,
        page,
      });

      if (data.length === 0) break;

      repos.push(
        ...data.map((r) => ({
          owner: org,
          repo: r.name,
          description: r.description ?? '',
          defaultBranch: r.default_branch ?? 'main',
          language: r.language ?? null,
          topics: r.topics ?? [],
          stars: r.stargazers_count ?? 0,
          url: r.html_url,
        })),
      );

      if (data.length < 100) break;
      page++;
    }

    this.logger.log(`Found ${repos.length} repos in org ${org}`);
    return repos;
  }

  private async getDefaultBranch(
    owner: string,
    repo: string,
  ): Promise<string> {
    const { data } = await this.octokit.repos.get({ owner, repo });
    return data.default_branch;
  }

  private getExtension(path: string): string {
    const lastDot = path.lastIndexOf('.');
    return lastDot === -1 ? '' : path.slice(lastDot).toLowerCase();
  }
}
