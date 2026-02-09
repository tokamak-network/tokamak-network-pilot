import { v4 as uuidv4 } from 'uuid';
import {
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
} from '@tokamak-pilot/shared';
import type { DocumentChunk, ChunkType, SourceType } from '@tokamak-pilot/shared';
import type {
  GitHubFile,
  GitHubIssue,
  GitHubPullRequest,
} from './github.service';

interface ChunkOptions {
  sourceId: string;
  sourceType: SourceType;
  owner: string;
  repo: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

/**
 * Split a text into overlapping chunks of roughly `chunkSize` characters.
 * Tries to split on paragraph/sentence boundaries when possible.
 */
export function splitText(
  text: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  chunkOverlap = DEFAULT_CHUNK_OVERLAP,
): string[] {
  if (!text || text.trim().length === 0) return [];
  if (text.length <= chunkSize) return [text.trim()];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    // Try to find a natural break point (paragraph, sentence, or line boundary)
    if (end < text.length) {
      const searchWindow = text.slice(
        Math.max(end - 200, start),
        end,
      );

      // Look for paragraph break
      const paraBreak = searchWindow.lastIndexOf('\n\n');
      if (paraBreak !== -1 && paraBreak > searchWindow.length * 0.3) {
        end = Math.max(end - 200, start) + paraBreak + 2;
      } else {
        // Look for line break
        const lineBreak = searchWindow.lastIndexOf('\n');
        if (lineBreak !== -1 && lineBreak > searchWindow.length * 0.3) {
          end = Math.max(end - 200, start) + lineBreak + 1;
        } else {
          // Look for sentence boundary
          const sentenceBreak = searchWindow.lastIndexOf('. ');
          if (
            sentenceBreak !== -1 &&
            sentenceBreak > searchWindow.length * 0.3
          ) {
            end = Math.max(end - 200, start) + sentenceBreak + 2;
          }
        }
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - chunkOverlap;
    if (start >= text.length) break;
  }

  return chunks;
}

/**
 * Convert GitHub files into document chunks.
 */
export function chunkFiles(
  files: GitHubFile[],
  options: ChunkOptions,
): DocumentChunk[] {
  const { chunkSize, chunkOverlap } = options;
  const chunks: DocumentChunk[] = [];

  for (const file of files) {
    const chunkType = getFileChunkType(file.path);
    const textChunks = splitText(file.content, chunkSize, chunkOverlap);

    for (let i = 0; i < textChunks.length; i++) {
      const prefix =
        textChunks.length > 1
          ? `[${file.path} — part ${i + 1}/${textChunks.length}]\n\n`
          : `[${file.path}]\n\n`;

      chunks.push({
        id: uuidv4(),
        content: prefix + textChunks[i],
        sourceId: options.sourceId,
        sourceType: options.sourceType,
        chunkType,
        metadata: {
          title: file.path,
          url: file.url,
          filePath: file.path,
          repo: options.repo,
          owner: options.owner,
          language: getLanguageFromPath(file.path),
        },
      });
    }
  }

  return chunks;
}

/**
 * Convert GitHub issues into document chunks.
 */
export function chunkIssues(
  issues: GitHubIssue[],
  options: ChunkOptions,
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  for (const issue of issues) {
    // Build a single text block for the issue: title + body + comments
    let content = `# Issue #${issue.number}: ${issue.title}\n`;
    content += `State: ${issue.state}\n`;
    if (issue.labels.length > 0) {
      content += `Labels: ${issue.labels.join(', ')}\n`;
    }
    content += `\n${issue.body}\n`;

    if (issue.comments.length > 0) {
      content += '\n---\n## Comments\n\n';
      for (const comment of issue.comments) {
        content += `**${comment.author}** (${comment.createdAt}):\n${comment.body}\n\n`;
      }
    }

    const textChunks = splitText(
      content,
      options.chunkSize,
      options.chunkOverlap,
    );

    for (let i = 0; i < textChunks.length; i++) {
      chunks.push({
        id: uuidv4(),
        content: textChunks[i],
        sourceId: options.sourceId,
        sourceType: options.sourceType,
        chunkType: 'issue',
        metadata: {
          title: `Issue #${issue.number}: ${issue.title}`,
          url: issue.url,
          repo: options.repo,
          owner: options.owner,
          lastUpdated: issue.updatedAt,
        },
      });
    }
  }

  return chunks;
}

/**
 * Convert GitHub pull requests into document chunks.
 */
export function chunkPullRequests(
  prs: GitHubPullRequest[],
  options: ChunkOptions,
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];

  for (const pr of prs) {
    let content = `# PR #${pr.number}: ${pr.title}\n`;
    content += `State: ${pr.state}${pr.merged ? ' (merged)' : ''}\n`;
    content += `\n${pr.body}\n`;

    const textChunks = splitText(
      content,
      options.chunkSize,
      options.chunkOverlap,
    );

    for (let i = 0; i < textChunks.length; i++) {
      chunks.push({
        id: uuidv4(),
        content: textChunks[i],
        sourceId: options.sourceId,
        sourceType: options.sourceType,
        chunkType: 'pull_request',
        metadata: {
          title: `PR #${pr.number}: ${pr.title}`,
          url: pr.url,
          repo: options.repo,
          owner: options.owner,
          lastUpdated: pr.updatedAt,
        },
      });
    }
  }

  return chunks;
}

function getFileChunkType(path: string): ChunkType {
  const lower = path.toLowerCase();
  if (lower.includes('readme')) return 'readme';
  if (lower.endsWith('.md') || lower.endsWith('.mdx')) return 'markdown';
  if (lower.endsWith('.txt') || lower.endsWith('.rst')) return 'documentation';
  return 'code';
}

function getLanguageFromPath(path: string): string | undefined {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    sol: 'solidity',
    py: 'python',
    go: 'go',
    rs: 'rust',
    md: 'markdown',
    mdx: 'markdown',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
  };
  return langMap[ext];
}
