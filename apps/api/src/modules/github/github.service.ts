import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';

/** A raw document fetched from GitHub before chunking. */
export interface RawDocument {
  title: string;
  content: string;
  contentType: string;
  url: string;
  metadata: Record<string, unknown>;
}

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);
  private readonly octokit: Octokit;

  constructor(private readonly config: ConfigService) {
    const token = this.config.get<string>('GITHUB_TOKEN');
    this.octokit = new Octokit({ auth: token || undefined });
  }

  // ───────────────────── Org-level helpers ─────────────────────

  /**
   * List all public repos in an organization.
   */
  async listOrgRepos(org: string): Promise<Array<{ owner: string; repo: string; url: string }>> {
    const repos: Array<{ owner: string; repo: string; url: string }> = [];
    let page = 1;

    while (true) {
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
        });
      }
      page++;
    }

    this.logger.log(`Found ${repos.length} repos in org "${org}"`);
    return repos;
  }

  // ───────────────────── Repo-level fetchers ─────────────────────

  /**
   * Fetch the README of a repo.
   */
  async fetchRepoReadme(owner: string, repo: string): Promise<RawDocument[]> {
    try {
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
   * Recursively fetch all Markdown / doc files from /docs and root.
   */
  async fetchRepoDocs(owner: string, repo: string): Promise<RawDocument[]> {
    const docs: RawDocument[] = [];

    // Fetch from common doc paths
    const docPaths = ['docs', 'documentation', 'doc', '.'];

    for (const basePath of docPaths) {
      try {
        await this.fetchMarkdownFiles(owner, repo, basePath, docs);
      } catch {
        // path doesn't exist — skip
      }
    }

    this.logger.log(`Fetched ${docs.length} doc files from ${owner}/${repo}`);
    return docs;
  }

  /**
   * Fetch issues (open and closed, most recent first).
   */
  async fetchIssues(
    owner: string,
    repo: string,
    maxIssues = 100,
  ): Promise<RawDocument[]> {
    const docs: RawDocument[] = [];
    let page = 1;

    while (docs.length < maxIssues) {
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
        // Skip pull requests (GitHub API includes them in issues endpoint)
        if (issue.pull_request) continue;

        const comments = await this.fetchIssueComments(owner, repo, issue.number);
        const body = [
          `# ${issue.title}`,
          '',
          `State: ${issue.state} | Labels: ${issue.labels.map((l) => (typeof l === 'string' ? l : l.name)).join(', ')}`,
          '',
          issue.body || '(no description)',
          '',
          ...comments.map(
            (c, i) => `--- Comment ${i + 1} ---\n${c}`,
          ),
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
  async fetchPullRequests(
    owner: string,
    repo: string,
    maxPRs = 50,
  ): Promise<RawDocument[]> {
    const docs: RawDocument[] = [];
    let page = 1;

    while (docs.length < maxPRs) {
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
   * Fetch notable code files (Solidity contracts, TypeScript, config files).
   */
  async fetchCodeFiles(
    owner: string,
    repo: string,
    extensions = ['.sol', '.ts', '.js', '.json'],
    maxFiles = 50,
  ): Promise<RawDocument[]> {
    const docs: RawDocument[] = [];

    try {
      const tree = await this.getRepoTree(owner, repo);

      const codeFiles = tree
        .filter(
          (f) =>
            f.type === 'blob' &&
            extensions.some((ext) => f.path?.endsWith(ext)) &&
            !f.path?.includes('node_modules') &&
            !f.path?.includes('dist/') &&
            !f.path?.includes('.min.') &&
            (f.size ?? 0) < 100_000, // skip large files
        )
        .slice(0, maxFiles);

      for (const file of codeFiles) {
        try {
          const content = await this.fetchFileContent(
            owner,
            repo,
            file.path!,
          );
          docs.push({
            title: `${owner}/${repo}: ${file.path}`,
            content,
            contentType: 'code',
            url: `https://github.com/${owner}/${repo}/blob/main/${file.path}`,
            metadata: { owner, repo, path: file.path, size: file.size },
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
    // GitHub doesn't have an official API for wiki content.
    // We attempt to access the wiki repo (<repo>.wiki.git) via the contents API.
    try {
      const wikiRepo = `${repo}.wiki`;
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo: wikiRepo,
        path: '',
      });

      if (!Array.isArray(data)) return [];

      const docs: RawDocument[] = [];
      const mdFiles = data.filter(
        (f) => f.type === 'file' && f.name.endsWith('.md'),
      );

      for (const file of mdFiles) {
        try {
          const content = await this.fetchFileContent(
            owner,
            wikiRepo,
            file.path,
          );
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
   * Fetch ALL content types for a single repo.
   */
  async fetchAllRepoContent(owner: string, repo: string): Promise<RawDocument[]> {
    this.logger.log(`Fetching all content from ${owner}/${repo}...`);

    const [readme, docs, issues, prs, code, wiki] = await Promise.allSettled([
      this.fetchRepoReadme(owner, repo),
      this.fetchRepoDocs(owner, repo),
      this.fetchIssues(owner, repo),
      this.fetchPullRequests(owner, repo),
      this.fetchCodeFiles(owner, repo),
      this.fetchWiki(owner, repo),
    ]);

    const all: RawDocument[] = [];
    for (const result of [readme, docs, issues, prs, code, wiki]) {
      if (result.status === 'fulfilled') {
        all.push(...result.value);
      }
    }

    this.logger.log(
      `Total: ${all.length} documents from ${owner}/${repo}`,
    );
    return all;
  }

  // ───────────────────── Private helpers ─────────────────────

  private async fetchIssueComments(
    owner: string,
    repo: string,
    issueNumber: number,
    maxComments = 10,
  ): Promise<string[]> {
    try {
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

  private async fetchMarkdownFiles(
    owner: string,
    repo: string,
    path: string,
    docs: RawDocument[],
  ): Promise<void> {
    const { data } = await this.octokit.repos.getContent({ owner, repo, path });

    if (!Array.isArray(data)) {
      // Single file
      if (data.name.endsWith('.md') || data.name.endsWith('.mdx')) {
        const content = Buffer.from(
          (data as any).content,
          'base64',
        ).toString('utf-8');
        docs.push({
          title: `${owner}/${repo}: ${data.path}`,
          content,
          contentType: 'documentation',
          url: data.html_url!,
          metadata: { owner, repo, path: data.path },
        });
      }
      return;
    }

    for (const item of data) {
      if (
        item.type === 'file' &&
        (item.name.endsWith('.md') || item.name.endsWith('.mdx'))
      ) {
        try {
          const content = await this.fetchFileContent(owner, repo, item.path);
          docs.push({
            title: `${owner}/${repo}: ${item.path}`,
            content,
            contentType: 'documentation',
            url: item.html_url!,
            metadata: { owner, repo, path: item.path },
          });
        } catch {
          // skip unreadable
        }
      } else if (item.type === 'dir') {
        await this.fetchMarkdownFiles(owner, repo, item.path, docs);
      }
    }
  }

  private async fetchFileContent(
    owner: string,
    repo: string,
    path: string,
  ): Promise<string> {
    const { data } = await this.octokit.repos.getContent({ owner, repo, path });
    if (Array.isArray(data) || data.type !== 'file') {
      throw new Error(`${path} is not a file`);
    }
    return Buffer.from((data as any).content, 'base64').toString('utf-8');
  }

  private async getRepoTree(
    owner: string,
    repo: string,
  ) {
    const { data } = await this.octokit.git.getTree({
      owner,
      repo,
      tree_sha: 'HEAD',
      recursive: 'true',
    });
    return data.tree;
  }
}
