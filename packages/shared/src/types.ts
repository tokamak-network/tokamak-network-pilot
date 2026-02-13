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
  conversationId?: string;
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
  authorId: string;
  author?: User;
  isOutdated: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- Auth Types ----

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  isActive?: boolean;
  lastLoginAt?: string;
}

export type UserRole = 'admin' | 'project_lead' | 'member' | 'viewer';

export interface RequestOtpRequest {
  email: string;
}

export interface RequestOtpResponse {
  message: string;
}

export interface VerifyOtpRequest {
  email: string;
  code: string;
}

export interface VerifyOtpResponse {
  token: string;
  user: User;
}

// ---- API Key Types ----

export type ApiKeyTier = 'free' | 'standard' | 'premium';

export type ApiKeyScope = 'ask' | 'search' | 'sources:read' | 'content:read';

export const API_KEY_ALL_SCOPES: ApiKeyScope[] = [
  'ask',
  'search',
  'sources:read',
  'content:read',
];

/** Public-facing API key info (never includes the hash or plaintext secret) */
export interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  tier: ApiKeyTier;
  rateLimit: number;
  isActive: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  totalRequests: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Request body for creating an API key */
export interface CreateApiKeyRequest {
  name: string;
  scopes?: ApiKeyScope[];
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

/** Response after creating or rotating an API key — includes the plaintext key (shown once) */
export interface CreateApiKeyResponse extends ApiKeyInfo {
  /** The plaintext API key — store this securely, it will never be shown again */
  key: string;
}

/** Request body for updating an API key */
export interface UpdateApiKeyRequest {
  name?: string;
  scopes?: ApiKeyScope[];
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

/** Usage log entry */
export interface ApiKeyUsageEntry {
  id: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs?: number;
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

// ---- Conversation Types ----

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  userId?: string;
  messageCount: number;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  messages: MessageInfo[];
}

export interface MessageInfo {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: CitedSource[];
  confidence?: number;
  provider?: string;
  model?: string;
  createdAt: string;
}

export interface CreateConversationRequest {
  title?: string;
}

export interface UpdateConversationRequest {
  title: string;
}

export interface AskInConversationRequest {
  question: string;
  filters?: string[];
}

export interface AskInConversationResponse {
  conversationId: string;
  userMessage: MessageInfo;
  assistantMessage: MessageInfo;
}

// ---- Project Types ----

export type ProjectRole = 'lead' | 'contributor' | 'viewer';

export interface ProjectLink {
  label: string;
  url: string;
}

export interface ProjectInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  links: ProjectLink[];
  summary?: string;
  summaryUpdatedAt?: string;
  isPublic: boolean;
  memberCount: number;
  sourceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectInfo {
  members: ProjectMemberInfo[];
  sources: ProjectSourceInfo[];
}

export interface ProjectMemberInfo {
  id: string;
  userId: string;
  role: ProjectRole;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

export interface ProjectSourceInfo {
  id: string;
  sourceId: string;
  assignedAt: string;
  source: {
    id: string;
    name: string;
    type: string;
    status: string;
    documentCount: number;
    lastSyncedAt?: string;
  };
}

export interface CreateProjectRequest {
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  links?: ProjectLink[];
  isPublic?: boolean;
}

export interface UpdateProjectRequest {
  name?: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  links?: ProjectLink[];
  summary?: string;
  isPublic?: boolean;
}

export interface AddProjectMemberRequest {
  email: string;
  role?: ProjectRole;
}

export interface UpdateProjectMemberRequest {
  role: ProjectRole;
}

export interface AddProjectSourceRequest {
  sourceId: string;
}

export interface ProjectPublicInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  links: ProjectLink[];
  summary?: string;
  members: Array<{
    role: ProjectRole;
    user: { name?: string; email: string };
  }>;
  sources: Array<{
    name: string;
    type: string;
    documentCount: number;
  }>;
}

// ---- Common Types ----

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
