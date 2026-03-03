// ---- Source Types ----

export type SourceType =
  | 'github_repo'
  | 'github_org'
  | 'documentation'
  | 'file_upload'
  | 'website'
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
  /** Scope the question to a project by ID. */
  projectId?: string;
  /** Scope the question to a project by slug. */
  projectSlug?: string;
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

// ---- Streaming Types ----

/** SSE event types emitted during a streaming ask response */
export type AskStreamEventType = 'metadata' | 'chunk' | 'done' | 'error';

/** Metadata event — sent first with sources and model info */
export interface AskStreamMetadata {
  sources: CitedSource[];
  confidence: number;
  provider: string;
  model: string;
}

/** Text chunk event — a piece of the streamed answer */
export interface AskStreamChunk {
  text: string;
}

/** Done event — signals completion */
export interface AskStreamDone {}

/** Error event — signals a failure */
export interface AskStreamError {
  message: string;
}

/** Callbacks for consuming a streaming ask response */
export interface AskStreamCallbacks {
  onMetadata?: (metadata: AskStreamMetadata) => void;
  onChunk?: (chunk: AskStreamChunk) => void;
  onDone?: () => void;
  onError?: (error: AskStreamError) => void;
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

export type PublicTheme =
  | 'forest'
  | 'ocean'
  | 'sunset'
  | 'midnight'
  | 'lavender'
  | 'slate';

export type PublicBorderRadius = 'rounded' | 'pill' | 'square';

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
  publicTheme: PublicTheme;
  publicBorderRadius: PublicBorderRadius;
  isNewsEnabled: boolean;
  newsKeywords: string[];
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
  publicTheme?: PublicTheme;
  publicBorderRadius?: PublicBorderRadius;
  isNewsEnabled?: boolean;
  newsKeywords?: string[];
}

export interface UpdateProjectRequest {
  name?: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  links?: ProjectLink[];
  summary?: string;
  isPublic?: boolean;
  publicTheme?: PublicTheme;
  publicBorderRadius?: PublicBorderRadius;
  isNewsEnabled?: boolean;
  newsKeywords?: string[];
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

// ---- Invitation Types ----

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface InviteProjectMemberRequest {
  email: string;
  role?: ProjectRole;
}

export interface ProjectInvitationInfo {
  id: string;
  email: string;
  role: ProjectRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface ProjectInvitationDetail extends ProjectInvitationInfo {
  project: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
  };
}

export interface AcceptInvitationResponse {
  message: string;
  projectId: string;
  projectSlug: string;
  projectName: string;
  role?: ProjectRole;
}

export interface ProjectPublicInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  links: ProjectLink[];
  summary?: string;
  publicTheme: PublicTheme;
  publicBorderRadius: PublicBorderRadius;
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

// ---- Project News Types ----

export interface ProjectNewsInfo {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  url: string;
  source?: string;
  imageUrl?: string;
  publishedAt?: string;
  fetchedAt: string;
}

export interface ProjectNewsResponse {
  data: ProjectNewsInfo[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface NewsSyncResponse {
  synced: number;
}

export type SocialPlatform = 'twitter' | 'linkedin' | 'instagram';

export interface GenerateSocialPostRequest {
  platform: SocialPlatform;
  customPrompt?: string;
}

export interface GeneratedSocialPost {
  content: string;
  platform: SocialPlatform;
  articleId: string;
  articleTitle: string;
  provider: string;
  model: string;
}

// ---- Feedback Types ----

export type FeedbackRating = 'up' | 'down';

export interface FeedbackInfo {
  id: string;
  messageId: string;
  userId: string;
  rating: FeedbackRating;
  comment?: string;
  createdAt: string;
}

export interface SubmitFeedbackRequest {
  messageId: string;
  rating: FeedbackRating;
  comment?: string;
}

export interface FeedbackStats {
  total: number;
  upCount: number;
  downCount: number;
  satisfactionRate: number | null;
  recentNegative: Array<{
    id: string;
    messageId: string;
    comment?: string;
    messagePreview?: string;
    createdAt: string;
  }>;
}

export type SuggestedQuestionSource = 'popular' | 'curated';

export interface SuggestedQuestion {
  question: string;
  source: SuggestedQuestionSource;
}

export interface SuggestedQuestionsResponse {
  suggestions: SuggestedQuestion[];
}

// ---- Snippet Types ----

export interface SnippetInfo {
  id: string;
  title: string;
  description?: string;
  code: string;
  language: string;
  category?: string;
  tags: string[];
  projectSlug?: string;
  isGenerated: boolean;
  copyCount: number;
  author?: {
    id: string;
    email: string;
    name?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateSnippetRequest {
  title: string;
  code: string;
  language: string;
  description?: string;
  category?: string;
  tags?: string[];
  projectSlug?: string;
}

export interface GenerateSnippetRequest {
  prompt: string;
  language?: string;
  projectSlug?: string;
}

export interface GenerateSnippetResponse extends SnippetInfo {
  provider: string;
  model: string;
}

// ---- Changelog Types ----

export type ChangeType =
  | 'added'
  | 'changed'
  | 'fixed'
  | 'deprecated'
  | 'removed'
  | 'security';

export interface ChangelogChange {
  type: ChangeType;
  description: string;
  breaking?: boolean;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: ChangelogChange[];
}

export interface ChangelogResponse {
  entries: ChangelogEntry[];
  total: number;
}

// ---- Webhook Types ----

export interface WebhookEvent {
  name: string;
  description: string;
  payload: Record<string, unknown>;
}

export interface WebhookConfig {
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
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
