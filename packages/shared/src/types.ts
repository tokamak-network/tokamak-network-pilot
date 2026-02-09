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
