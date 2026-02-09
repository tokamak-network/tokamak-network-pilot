// ---- Source Types ----

export type SourceType =
  | 'github_repo'
  | 'github_org'
  | 'documentation'
  | 'file_upload'
  | 'notion'
  | 'custom';

export type SourceStatus =
  | 'active'
  | 'syncing'
  | 'error'
  | 'disabled';

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  status: SourceStatus;
  config: Record<string, unknown>;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- RAG Types ----

export interface AskRequest {
  question: string;
  filters?: string[];
  conversationHistory?: ConversationMessage[];
}

export interface AskResponse {
  answer: string;
  question: string;
  sources: CitedSource[];
  confidence: number;
}

export interface CitedSource {
  title: string;
  url: string;
  score: number;
  snippet?: string;
}

export interface SearchResult {
  content: string;
  source: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
}

// ---- Content Types ----

export interface ContentEntry {
  id: string;
  title: string;
  body: string;
  project?: string;
  category?: string;
  tags: string[];
  author: string;
  isOutdated: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- Auth Types ----

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export type UserRole = 'admin' | 'project_lead' | 'member' | 'viewer';

// ---- Document Chunk Types ----

export type ChunkType =
  | 'readme'
  | 'code'
  | 'issue'
  | 'pull_request'
  | 'documentation'
  | 'markdown'
  | 'text'
  | 'comment';

export interface DocumentChunk {
  id: string;
  content: string;
  sourceId: string;
  sourceType: SourceType;
  chunkType: ChunkType;
  metadata: ChunkMetadata;
  embedding?: number[];
}

export interface ChunkMetadata {
  title?: string;
  url?: string;
  filePath?: string;
  repo?: string;
  owner?: string;
  language?: string;
  /** ISO date */
  lastUpdated?: string;
  /** Additional key-value pairs */
  [key: string]: unknown;
}

// ---- Vector Search Types ----

export interface VectorSearchResult {
  id: string;
  content: string;
  score: number;
  chunkType: ChunkType;
  metadata: ChunkMetadata;
}

// ---- Ingestion Types ----

export type IngestionStatus =
  | 'pending'
  | 'fetching'
  | 'chunking'
  | 'embedding'
  | 'storing'
  | 'completed'
  | 'failed';

export interface IngestionJob {
  id: string;
  sourceId: string;
  status: IngestionStatus;
  totalChunks: number;
  processedChunks: number;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface GitHubRepoConfig {
  owner: string;
  repo: string;
  branch?: string;
  /** Glob patterns of files to include */
  includePaths?: string[];
  /** Glob patterns of files to exclude */
  excludePaths?: string[];
  /** Whether to index issues */
  indexIssues?: boolean;
  /** Whether to index pull requests */
  indexPullRequests?: boolean;
  /** Whether to index code files */
  indexCode?: boolean;
}

// ---- Common Types ----

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
