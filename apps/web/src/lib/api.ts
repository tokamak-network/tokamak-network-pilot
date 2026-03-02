const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

/** Get stored JWT token */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tokamak_token');
}

/**
 * Typed fetch wrapper for the Tokamak Forest API.
 * Automatically attaches JWT bearer token if available.
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('tokamak_token');
      window.dispatchEvent(new Event('tokamak:unauthorized'));
    }
    throw new Error(error.message || `API error: ${res.status}`);
  }

  return res.json();
}

/**
 * Ask a question to the RAG pipeline (standalone, no conversation tracking).
 */
export async function askQuestion(question: string, filters?: string[]) {
  return apiFetch<{
    answer: string;
    question: string;
    sources: Array<{ title: string; url: string; score: number }>;
    confidence: number;
  }>('/ask', {
    method: 'POST',
    body: JSON.stringify({ question, filters }),
  });
}

// ───────────────────── Conversations API ─────────────────────

export interface ConversationSummaryResponse {
  id: string;
  title: string;
  userId?: string;
  messageCount: number;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageResponse {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ title: string; url: string; score: number; snippet?: string }>;
  confidence?: number;
  provider?: string;
  model?: string;
  createdAt: string;
}

export interface ConversationDetailResponse extends ConversationSummaryResponse {
  messages: MessageResponse[];
}

export interface AskInConversationResponse {
  conversationId: string;
  userMessage: MessageResponse;
  assistantMessage: MessageResponse;
}

/** Create a new conversation */
export async function createConversation(title?: string) {
  return apiFetch<ConversationSummaryResponse>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

/** List conversations for the current user */
export async function fetchConversations(page = 1, limit = 30) {
  return apiFetch<{
    data: ConversationSummaryResponse[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>(`/conversations?page=${page}&limit=${limit}`);
}

/** Get a single conversation with all messages */
export async function fetchConversation(id: string) {
  return apiFetch<ConversationDetailResponse>(`/conversations/${id}`);
}

/** Update conversation title */
export async function updateConversation(id: string, title: string) {
  return apiFetch<ConversationSummaryResponse>(`/conversations/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title }),
  });
}

/** Delete a conversation */
export async function deleteConversation(id: string) {
  return apiFetch<{ message: string }>(`/conversations/${id}`, {
    method: 'DELETE',
  });
}

/** Ask a question within an existing conversation */
export async function askInConversation(
  conversationId: string,
  question: string,
  filters?: string[],
) {
  return apiFetch<AskInConversationResponse>(
    `/conversations/${conversationId}/ask`,
    {
      method: 'POST',
      body: JSON.stringify({ question, filters }),
    },
  );
}

/** Quick ask — creates a conversation and asks in one step */
export async function quickAsk(question: string, filters?: string[]) {
  return apiFetch<AskInConversationResponse>('/conversations/quick-ask', {
    method: 'POST',
    body: JSON.stringify({ question, filters }),
  });
}

// ───────────────────── Streaming API ─────────────────────

export interface StreamMetadata {
  conversationId: string;
  userMessageId: string;
  sources: Array<{ title: string; url: string; score: number; snippet?: string }>;
  confidence: number;
  provider: string;
  model: string;
}

export interface StreamCallbacks {
  onMetadata: (metadata: StreamMetadata) => void;
  onChunk: (text: string) => void;
  onDone: (data: { assistantMessageId: string }) => void;
  onError: (error: Error) => void;
}

async function streamSSE(path: string, body: object, callbacks: StreamCallbacks) {
  const url = `${API_BASE}${path}`;
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('tokamak_token');
      window.dispatchEvent(new Event('tokamak:unauthorized'));
    }
    throw new Error(error.message || `API error: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let currentEvent = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        switch (currentEvent) {
          case 'metadata':
            callbacks.onMetadata(data);
            break;
          case 'chunk':
            callbacks.onChunk(data.text);
            break;
          case 'done':
            callbacks.onDone(data);
            break;
          case 'error':
            callbacks.onError(new Error(data.message));
            break;
        }
        currentEvent = '';
      }
    }
  }
}

/** Quick ask with streaming */
export function quickAskStream(
  question: string,
  callbacks: StreamCallbacks,
  filters?: string[],
  projectId?: string,
) {
  return streamSSE('/conversations/quick-ask/stream', { question, filters, projectId }, callbacks);
}

/** Ask in conversation with streaming */
export function askInConversationStream(
  conversationId: string,
  question: string,
  callbacks: StreamCallbacks,
  filters?: string[],
  projectId?: string,
) {
  return streamSSE(
    `/conversations/${conversationId}/ask/stream`,
    { question, filters, projectId },
    callbacks,
  );
}

// ───────────────────── Feedback API ─────────────────────

export interface FeedbackResponse {
  id: string;
  messageId: string;
  userId: string;
  rating: 'up' | 'down';
  comment?: string;
  createdAt: string;
}

export interface SuggestedQuestion {
  question: string;
  source: 'popular' | 'curated';
}

/** Submit feedback (thumbs up/down) on an assistant message */
export async function submitFeedback(
  messageId: string,
  rating: 'up' | 'down',
  comment?: string,
) {
  return apiFetch<FeedbackResponse>('/feedback', {
    method: 'POST',
    body: JSON.stringify({ messageId, rating, comment }),
  });
}

/** Get your existing feedback for a specific message */
export async function getFeedback(messageId: string) {
  return apiFetch<FeedbackResponse | null>(`/feedback/message/${messageId}`);
}

/** Get suggested questions (popular + curated) */
export async function fetchSuggestedQuestions(limit = 6) {
  return apiFetch<{ suggestions: SuggestedQuestion[] }>(
    `/feedback/suggested-questions?limit=${limit}`,
  );
}

/**
 * Semantic search across the knowledge base.
 */
export async function searchKnowledge(query: string, limit = 10) {
  return apiFetch<{
    query: string;
    results: Array<{ content: string; source: string; score: number }>;
    total: number;
  }>(`/ask/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}

// ───────────────────── Sources API ─────────────────────

export interface SourceResponse {
  id: string;
  name: string;
  type: string;
  status: string;
  config: Record<string, unknown>;
  documentCount: number;
  lastSyncedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  stats?: Record<string, number>;
  /** Last GitHub commit push date (ISO string) */
  pushedAt?: string | null;
  /** GitHub stars */
  stars?: number;
  /** Primary language */
  language?: string | null;
  /** Repo description */
  description?: string | null;
}

export interface DocumentResponse {
  id: string;
  title: string;
  contentType: string;
  url?: string;
  chunkIndex: number;
  createdAt: string;
  contentPreview: string;
}

export interface SourceSummary {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  stats: Record<string, number>;
  summary: string;
  provider: string;
  model: string;
  generatedAt: string;
}

/** Fetch all sources */
export async function fetchSources() {
  return apiFetch<{ sources: SourceResponse[]; total: number }>('/sources');
}

// ───────────────────── Ingestion Status API ─────────────────────

export interface IngestionRepoStatus {
  id: string;
  name: string;
  type: string;
  status: string;
  lastSyncedAt?: string;
  errorMessage?: string;
  documentCount: number;
  totalChunks: number;
  rawDocumentCount: number;
  fetchBreakdown: Record<string, number>;
  chunkBreakdown: Record<string, number>;
  createdAt: string;
  /** Last GitHub commit push date */
  pushedAt?: string | null;
  /** GitHub stars */
  stars?: number;
  /** Primary language */
  language?: string | null;
  /** Repo description */
  description?: string | null;
}

export interface IngestionSummary {
  totalRepos: number;
  fetched: number;
  syncing: number;
  failed: number;
  empty: number;
  pending: number;
  totalDocuments: number;
  totalChunks: number;
}

export interface IngestionStatusResponse {
  summary: IngestionSummary;
  repos: IngestionRepoStatus[];
}

/** Fetch ingestion status dashboard */
export async function fetchIngestionStatus() {
  return apiFetch<IngestionStatusResponse>('/sources/status');
}

/** Fetch a single source with document stats */
export async function fetchSource(id: string) {
  return apiFetch<SourceResponse>(`/sources/${id}`);
}

/** Fetch documents for a source */
export async function fetchSourceDocuments(
  sourceId: string,
  contentType?: string,
  page = 1,
  limit = 50,
) {
  const params = new URLSearchParams();
  if (contentType) params.set('contentType', contentType);
  params.set('page', String(page));
  params.set('limit', String(limit));
  return apiFetch<{
    documents: DocumentResponse[];
    total: number;
    page: number;
    limit: number;
  }>(`/sources/${sourceId}/documents?${params}`);
}

/** Generate an AI summary of a source */
export async function generateSourceSummary(sourceId: string) {
  return apiFetch<SourceSummary>(`/sources/${sourceId}/summary`, {
    method: 'POST',
  });
}

/** Create a new source */
export async function createSource(data: {
  name: string;
  type: string;
  config: Record<string, unknown>;
}) {
  return apiFetch<SourceResponse>('/sources', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Crawl a website URL and add it as a knowledge source (creates website source + enqueues job) */
export interface CrawlWebsiteRequest {
  url: string;
  name?: string;
  maxPages?: number;
  maxDepth?: number;
  timeout?: number;
  delayBetweenRequests?: number;
  respectRobotsTxt?: boolean;
  excludePathPatterns?: string[];
  force?: boolean;
}

export interface CrawlWebsiteResponse {
  source: SourceResponse;
  jobId: string;
  message: string;
}

export async function crawlWebsite(data: CrawlWebsiteRequest): Promise<CrawlWebsiteResponse> {
  return apiFetch<CrawlWebsiteResponse>('/sources/crawl', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Trigger a light source sync (markdown/docs only) */
export async function syncSource(id: string) {
  return apiFetch<{ message: string; sourceId: string; fetchMode: string }>(
    `/sources/${id}/sync`,
    { method: 'POST' },
  );
}

/** Trigger a deep source sync (code, issues, PRs, wiki — everything) */
export async function syncSourceFull(id: string) {
  return apiFetch<{ message: string; sourceId: string; fetchMode: string }>(
    `/sources/${id}/sync-full`,
    { method: 'POST' },
  );
}

/** Delete a source */
export async function deleteSource(id: string) {
  return apiFetch<{ message: string }>(`/sources/${id}`, {
    method: 'DELETE',
  });
}

// ───────────────────── File Upload API ─────────────────────

export interface FileUploadResponse {
  message: string;
  source: {
    id: string;
    name: string;
    type: string;
    status: string;
    fileCount: number;
    parsedDocuments: number;
    files: Array<{ name: string; size: number }>;
  };
}

export interface SupportedFormatsResponse {
  formats: string[];
  maxFileSize: number;
  maxFileSizeHuman: string;
  maxFiles: number;
}

/**
 * Upload files to create a file_upload knowledge source.
 * Uses multipart/form-data — does NOT set Content-Type header (browser sets it with boundary).
 */
export async function uploadFiles(files: File[]): Promise<FileUploadResponse> {
  const url = `${API_BASE}/sources/upload`;
  const token = getToken();

  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Do NOT set Content-Type — the browser will set it with the correct multipart boundary

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('tokamak_token');
      window.dispatchEvent(new Event('tokamak:unauthorized'));
    }
    throw new Error(error.message || `Upload failed: ${res.status}`);
  }

  return res.json();
}

/** Fetch supported file upload formats */
export async function fetchSupportedFormats() {
  return apiFetch<SupportedFormatsResponse>('/sources/upload/supported-formats');
}

// ───────────────────── API Keys API ─────────────────────

export interface ApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  tier: string;
  rateLimit: number;
  isActive: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  totalRequests: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyResponse extends ApiKeyResponse {
  /** The plaintext key — only returned once on creation */
  key: string;
}

/** List all API keys for the current user */
export async function fetchApiKeys() {
  return apiFetch<ApiKeyResponse[]>('/api-keys');
}

/** Create a new API key */
export async function createApiKey(data: {
  name: string;
  scopes?: string[];
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}) {
  return apiFetch<CreateApiKeyResponse>('/api-keys', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Update an API key */
export async function updateApiKey(
  id: string,
  data: {
    name?: string;
    scopes?: string[];
    isActive?: boolean;
    metadata?: Record<string, unknown>;
  },
) {
  return apiFetch<ApiKeyResponse>(`/api-keys/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** Delete / revoke an API key */
export async function deleteApiKey(id: string) {
  return apiFetch<{ message: string }>(`/api-keys/${id}`, {
    method: 'DELETE',
  });
}

/** Rotate an API key (generates new secret) */
export async function rotateApiKey(id: string) {
  return apiFetch<CreateApiKeyResponse>(`/api-keys/${id}/rotate`, {
    method: 'POST',
  });
}

// ───────────────────── Changelog API ─────────────────────

export interface ChangelogChangeResponse {
  type: 'added' | 'changed' | 'fixed' | 'deprecated' | 'removed' | 'security';
  description: string;
  breaking?: boolean;
}

export interface ChangelogEntryResponse {
  version: string;
  date: string;
  changes: ChangelogChangeResponse[];
}

/** Fetch all changelog entries */
export async function fetchChangelog(type?: string) {
  const qs = type ? `?type=${type}` : '';
  return apiFetch<{ entries: ChangelogEntryResponse[]; total: number }>(
    `/changelog${qs}`,
  );
}

/** Fetch the latest changelog entry */
export async function fetchLatestChangelog() {
  return apiFetch<ChangelogEntryResponse>('/changelog/latest');
}

/** Fetch API key usage logs */
export async function fetchApiKeyUsage(
  keyId: string,
  page = 1,
  limit = 20,
) {
  return apiFetch<{
    data: Array<{
      id: string;
      endpoint: string;
      method: string;
      statusCode: number;
      responseTimeMs?: number;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>(`/api-keys/${keyId}/usage?page=${page}&limit=${limit}`);
}

// ───────────────────── Auth API ─────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: string;
}

/** Request an OTP code to the given email */
export async function requestOtp(email: string) {
  return apiFetch<{ message: string }>('/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/** Verify OTP and receive JWT + user info */
export async function verifyOtp(email: string, code: string) {
  return apiFetch<{ token: string; user: AuthUser }>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

/** Get the current authenticated user profile */
export async function fetchMe() {
  return apiFetch<AuthUser>('/auth/me');
}

// ───────────────────── Content API ─────────────────────

export interface ContentEntryResponse {
  id: string;
  title: string;
  body: string;
  project?: string;
  category?: string;
  tags: string[];
  isOutdated: boolean;
  authorId: string;
  author?: { id: string; email: string; name?: string; role: string };
  createdAt: string;
  updatedAt: string;
}

/** List content entries */
export async function fetchContent(filters?: {
  project?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.project) params.set('project', filters.project);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return apiFetch<{
    data: ContentEntryResponse[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>(`/content${qs ? `?${qs}` : ''}`);
}

/** Create a content entry */
export async function createContent(data: {
  title: string;
  body: string;
  project?: string;
  category?: string;
  tags?: string[];
}) {
  return apiFetch<ContentEntryResponse>('/content', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Update a content entry */
export async function updateContent(
  id: string,
  data: Partial<{
    title: string;
    body: string;
    project?: string;
    category?: string;
    tags?: string[];
    isOutdated?: boolean;
  }>,
) {
  return apiFetch<ContentEntryResponse>(`/content/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/** Delete a content entry */
export async function deleteContent(id: string) {
  return apiFetch<{ message: string }>(`/content/${id}`, {
    method: 'DELETE',
  });
}

// ───────────────────── Projects API ─────────────────────

export interface ProjectLinkResponse {
  label: string;
  url: string;
}

export interface ProjectMemberResponse {
  id: string;
  userId: string;
  role: 'lead' | 'contributor' | 'viewer';
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

export interface ProjectSourceResponse {
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

export interface ProjectResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  links: ProjectLinkResponse[];
  summary?: string;
  summaryUpdatedAt?: string;
  isPublic: boolean;
  showOnLandingPage: boolean;
  isRoadmapPublic: boolean;
  publicTheme: string;
  publicBorderRadius: string;
  isNewsEnabled: boolean;
  newsKeywords: string[];
  memberCount: number;
  sourceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetailResponse extends ProjectResponse {
  members: ProjectMemberResponse[];
  sources: ProjectSourceResponse[];
}

export interface ProjectDashboardResponse {
  project: ProjectDetailResponse;
  stats: {
    memberCount: number;
    sourceCount: number;
    contentEntries: number;
    totalDocuments: number;
    totalChunks: number;
    chunkBreakdown: Record<string, number>;
  };
}

export interface ProjectPublicResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  links: ProjectLinkResponse[];
  summary?: string;
  publicTheme: string;
  publicBorderRadius: string;
  isRoadmapPublic: boolean;
  roadmap: Array<{
    id: string;
    title: string;
    problem: string;
    outcome?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    effort: 'xs' | 's' | 'm' | 'l' | 'xl';
    status: 'proposed' | 'approved' | 'planned' | 'in_progress' | 'completed' | 'rejected';
    targetQuarter?: string;
    updatedAt: string;
  }>;
  members: Array<{
    role: string;
    user: { name?: string; email: string };
  }>;
  sources: Array<{
    name: string;
    type: string;
    documentCount: number;
  }>;
}

export interface ProjectSummaryResponse {
  projectId: string;
  projectName: string;
  summary: string;
  provider: string;
  model: string;
  generatedAt: string;
}

/** List all projects */
export async function fetchProjects() {
  return apiFetch<{ projects: ProjectResponse[]; total: number }>('/projects');
}

/** Get project details by ID or slug */
export async function fetchProject(idOrSlug: string) {
  return apiFetch<ProjectDetailResponse>(`/projects/${idOrSlug}`);
}

/** Get project dashboard with stats */
export async function fetchProjectDashboard(idOrSlug: string) {
  return apiFetch<ProjectDashboardResponse>(`/projects/${idOrSlug}/dashboard`);
}

/** Get public project overview */
export async function fetchProjectPublic(slug: string) {
  return apiFetch<ProjectPublicResponse>(`/projects/${slug}/public`);
}

/** Create a new project */
export async function createProject(data: {
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  links?: ProjectLinkResponse[];
  isPublic?: boolean;
  isRoadmapPublic?: boolean;
}) {
  return apiFetch<ProjectDetailResponse>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Create a project from a GitHub repo source (auto-generates name & AI description) */
export async function createProjectFromSource(sourceId: string) {
  return apiFetch<ProjectDetailResponse>('/projects/from-source', {
    method: 'POST',
    body: JSON.stringify({ sourceId }),
  });
}

/** Update a project */
export async function updateProject(
  id: string,
  data: {
    name?: string;
    slug?: string;
    description?: string;
    logoUrl?: string;
    links?: ProjectLinkResponse[];
    summary?: string;
    isPublic?: boolean;
    showOnLandingPage?: boolean;
    isRoadmapPublic?: boolean;
    publicTheme?: string;
    publicBorderRadius?: string;
    isNewsEnabled?: boolean;
    newsKeywords?: string[];
  },
) {
  return apiFetch<ProjectDetailResponse>(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/** Delete a project */
export async function deleteProject(id: string) {
  return apiFetch<{ message: string }>(`/projects/${id}`, {
    method: 'DELETE',
  });
}

/** Add a source to a project */
export async function addProjectSource(projectId: string, sourceId: string) {
  return apiFetch<ProjectSourceResponse>(`/projects/${projectId}/sources`, {
    method: 'POST',
    body: JSON.stringify({ sourceId }),
  });
}

/** Remove a source from a project */
export async function removeProjectSource(projectId: string, sourceId: string) {
  return apiFetch<{ message: string }>(
    `/projects/${projectId}/sources/${sourceId}`,
    { method: 'DELETE' },
  );
}

/** Add a member to a project */
export async function addProjectMember(
  projectId: string,
  email: string,
  role?: 'lead' | 'contributor' | 'viewer',
) {
  return apiFetch<ProjectMemberResponse>(`/projects/${projectId}/members`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

/** Update a project member's role */
export async function updateProjectMember(
  projectId: string,
  userId: string,
  role: 'lead' | 'contributor' | 'viewer',
) {
  return apiFetch<ProjectMemberResponse>(
    `/projects/${projectId}/members/${userId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ role }),
    },
  );
}

/** Remove a member from a project */
export async function removeProjectMember(projectId: string, userId: string) {
  return apiFetch<{ message: string }>(
    `/projects/${projectId}/members/${userId}`,
    { method: 'DELETE' },
  );
}

// ───────────────────── Project Invitations API ─────────────────────

export interface ProjectInvitationResponse {
  id: string;
  email: string;
  role: 'lead' | 'contributor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface InvitationDetailResponse {
  id: string;
  email: string;
  role: 'lead' | 'contributor' | 'viewer';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  createdAt: string;
  project: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
  };
  invitedBy: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface AcceptInvitationResponse {
  message: string;
  projectId: string;
  projectSlug: string;
  projectName: string;
  role?: string;
}

/** Invite a user to a project via email */
export async function inviteProjectMember(
  projectId: string,
  email: string,
  role?: 'lead' | 'contributor' | 'viewer',
) {
  return apiFetch<ProjectInvitationResponse>(
    `/projects/${projectId}/invitations`,
    {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    },
  );
}

/** List all invitations for a project */
export async function fetchProjectInvitations(projectId: string) {
  return apiFetch<ProjectInvitationResponse[]>(
    `/projects/${projectId}/invitations`,
  );
}

/** Get invitation details by token (no auth required) */
export async function fetchInvitationByToken(token: string) {
  return apiFetch<InvitationDetailResponse>(
    `/projects/invitations/by-token/${token}`,
  );
}

/** Accept an invitation (requires auth) */
export async function acceptInvitation(token: string) {
  return apiFetch<AcceptInvitationResponse>(
    `/projects/invitations/${token}/accept`,
    { method: 'POST' },
  );
}

/** Cancel a pending invitation */
export async function cancelProjectInvitation(
  projectId: string,
  invitationId: string,
) {
  return apiFetch<{ message: string }>(
    `/projects/${projectId}/invitations/${invitationId}`,
    { method: 'DELETE' },
  );
}

/** Resend an invitation email */
export async function resendProjectInvitation(
  projectId: string,
  invitationId: string,
) {
  return apiFetch<ProjectInvitationResponse & { message: string }>(
    `/projects/${projectId}/invitations/${invitationId}/resend`,
    { method: 'POST' },
  );
}

/** Generate an AI summary for a project */
export async function generateProjectSummary(projectId: string) {
  return apiFetch<ProjectSummaryResponse>(`/projects/${projectId}/summary`, {
    method: 'POST',
  });
}

/** Get the current user's role in a project */
export async function fetchMyProjectRole(projectId: string) {
  return apiFetch<{ role: 'lead' | 'contributor' | 'viewer' | null }>(
    `/projects/${projectId}/my-role`,
  );
}

/** Transfer project ownership to another member */
export async function transferProjectOwnership(
  projectId: string,
  newOwnerId: string,
) {
  return apiFetch<{ message: string; newOwner: { userId: string; email: string; name?: string; role: string } }>(
    `/projects/${projectId}/transfer-ownership`,
    {
      method: 'POST',
      body: JSON.stringify({ newOwnerId }),
    },
  );
}

// ───────────────────── Feedback -> Roadmap Pipeline API ─────────────────────

export type ProjectFeedbackCategory =
  | 'feature'
  | 'bug'
  | 'ux'
  | 'performance'
  | 'integration'
  | 'pricing'
  | 'other';

export type ProjectFeedbackStatus = 'new' | 'reviewed' | 'planned' | 'rejected';

export interface ProjectFeedbackInboxEntry {
  id: string;
  projectId: string;
  category: ProjectFeedbackCategory;
  status: ProjectFeedbackStatus;
  title?: string;
  content: string;
  painLevel?: number;
  persona?: string;
  submitterName?: string;
  submitterEmail?: string;
  sourceType: string;
  sourceUrl?: string;
  votes: number;
  moderatorNote?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PublicProjectFeedbackEntry {
  id: string;
  projectId: string;
  category: ProjectFeedbackCategory;
  status: ProjectFeedbackStatus;
  title?: string;
  content: string;
  painLevel?: number;
  persona?: string;
  submitterName?: string;
  sourceType: string;
  sourceUrl?: string;
  votes: number;
  createdAt: string;
  updatedAt: string;
}

export type RoadmapPriority = 'low' | 'medium' | 'high' | 'critical';
export type RoadmapEffort = 'xs' | 's' | 'm' | 'l' | 'xl';
export type RoadmapStatus =
  | 'proposed'
  | 'approved'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'rejected';

export interface RoadmapItemResponse {
  id: string;
  projectId: string;
  title: string;
  problem: string;
  outcome?: string;
  priority: RoadmapPriority;
  effort: RoadmapEffort;
  status: RoadmapStatus;
  targetQuarter?: string;
  aiConfidence?: number;
  aiRationale?: string;
  sourceFeedbackIds: string[];
  autoGenerated: boolean;
  latestTaskPrompt?: string;
  latestTaskChecklist?: Array<{
    title: string;
    description: string;
    acceptanceCriteria: string[];
  }>;
  ownerId?: string;
  createdById?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapTaskPromptResponse {
  id: string;
  projectId: string;
  roadmapItemId: string;
  prompt: string;
  tasks: Array<{
    title: string;
    description: string;
    acceptanceCriteria: string[];
  }>;
  provider?: string;
  model?: string;
  createdById?: string;
  createdAt: string;
}

/** Public feedback submission from project public page (no auth required). */
export async function submitProjectPublicFeedback(
  projectSlug: string,
  data: {
    title?: string;
    content: string;
    category?: ProjectFeedbackCategory;
    painLevel?: number;
    persona?: string;
    submitterName?: string;
    submitterEmail?: string;
    sourceUrl?: string;
  },
) {
  return apiFetch<{ message: string; feedback: ProjectFeedbackInboxEntry }>(
    `/projects/${projectSlug}/public-feedback`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}

/** List public feedback entries for a project (no auth required). */
export async function fetchProjectPublicFeedback(
  projectSlug: string,
  params?: {
    category?: ProjectFeedbackCategory;
    sort?: 'top' | 'latest';
    limit?: number;
  },
) {
  const search = new URLSearchParams();
  if (params?.category) search.set('category', params.category);
  if (params?.sort) search.set('sort', params.sort);
  if (params?.limit) search.set('limit', String(params.limit));
  const qs = search.toString();

  return apiFetch<{
    data: PublicProjectFeedbackEntry[];
    total: number;
    limit: number;
    sort: 'top' | 'latest';
  }>(`/projects/${projectSlug}/public-feedback${qs ? `?${qs}` : ''}`);
}

/** Upvote a public feedback entry (no auth required). */
export async function voteProjectPublicFeedback(
  projectSlug: string,
  feedbackId: string,
) {
  return apiFetch<{ message: string; feedback: PublicProjectFeedbackEntry }>(
    `/projects/${projectSlug}/public-feedback/${feedbackId}/vote`,
    {
      method: 'POST',
    },
  );
}

/** Inbox list for project feedback (auth required). */
export async function fetchProjectFeedbackInbox(
  idOrSlug: string,
  params?: {
    status?: ProjectFeedbackStatus;
    category?: ProjectFeedbackCategory;
    page?: number;
    limit?: number;
  },
) {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.category) search.set('category', params.category);
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));
  const qs = search.toString();

  return apiFetch<{
    data: ProjectFeedbackInboxEntry[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>(`/projects/${idOrSlug}/feedback${qs ? `?${qs}` : ''}`);
}

/** Update project feedback status/note (auth required). */
export async function updateProjectFeedbackInboxItem(
  idOrSlug: string,
  feedbackId: string,
  data: {
    status?: ProjectFeedbackStatus;
    moderatorNote?: string;
  },
) {
  return apiFetch<ProjectFeedbackInboxEntry>(
    `/projects/${idOrSlug}/feedback/${feedbackId}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
  );
}

/** Queue background AI draft generation from feedback -> roadmap. */
export async function queueProjectRoadmapDraft(
  idOrSlug: string,
  maxItems = 5,
) {
  return apiFetch<{ jobId: string; projectId: string; message: string }>(
    `/projects/${idOrSlug}/roadmap/ai-draft`,
    {
      method: 'POST',
      body: JSON.stringify({ maxItems }),
    },
  );
}

/** Summary counters for feedback-to-roadmap pipeline. */
export async function fetchProjectRoadmapPipelineSummary(idOrSlug: string) {
  return apiFetch<{
    projectId: string;
    feedbackByStatus: Record<ProjectFeedbackStatus, number>;
    roadmapByStatus: Record<RoadmapStatus, number>;
  }>(`/projects/${idOrSlug}/roadmap/pipeline`);
}

/** List roadmap items for a project. */
export async function fetchProjectRoadmap(
  idOrSlug: string,
  params?: { status?: RoadmapStatus; page?: number; limit?: number },
) {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));
  const qs = search.toString();
  return apiFetch<{
    data: RoadmapItemResponse[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>(`/projects/${idOrSlug}/roadmap${qs ? `?${qs}` : ''}`);
}

/** Create a roadmap item. */
export async function createProjectRoadmapItem(
  idOrSlug: string,
  data: {
    title: string;
    problem: string;
    outcome?: string;
    priority?: RoadmapPriority;
    effort?: RoadmapEffort;
    status?: RoadmapStatus;
    targetQuarter?: string;
    sourceFeedbackIds?: string[];
    ownerId?: string;
  },
) {
  return apiFetch<RoadmapItemResponse>(`/projects/${idOrSlug}/roadmap`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Update a roadmap item. */
export async function updateProjectRoadmapItem(
  idOrSlug: string,
  itemId: string,
  data: {
    title?: string;
    problem?: string;
    outcome?: string;
    priority?: RoadmapPriority;
    effort?: RoadmapEffort;
    status?: RoadmapStatus;
    targetQuarter?: string;
    sourceFeedbackIds?: string[];
    ownerId?: string;
  },
) {
  return apiFetch<RoadmapItemResponse>(
    `/projects/${idOrSlug}/roadmap/${itemId}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
  );
}

/** Delete a roadmap item. */
export async function deleteProjectRoadmapItem(
  idOrSlug: string,
  itemId: string,
) {
  return apiFetch<{ deleted: boolean; id: string }>(
    `/projects/${idOrSlug}/roadmap/${itemId}`,
    { method: 'DELETE' },
  );
}

/** Generate an implementation-ready AI task prompt for a roadmap item. */
export async function generateRoadmapTaskPrompt(
  idOrSlug: string,
  itemId: string,
  data?: {
    extraContext?: string;
    taskSeeds?: Array<{
      title: string;
      description: string;
      acceptanceCriteria: string[];
    }>;
  },
) {
  return apiFetch<RoadmapTaskPromptResponse>(
    `/projects/${idOrSlug}/roadmap/${itemId}/task-prompts`,
    {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    },
  );
}

/** List generated prompts for a roadmap item. */
export async function fetchRoadmapTaskPrompts(
  idOrSlug: string,
  itemId: string,
  limit = 10,
) {
  return apiFetch<{ data: RoadmapTaskPromptResponse[]; total: number }>(
    `/projects/${idOrSlug}/roadmap/${itemId}/task-prompts?limit=${limit}`,
  );
}

// ───────────────────── Snippets API ─────────────────────

export interface SnippetResponse {
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
  author?: { id: string; email: string; name?: string };
  createdAt: string;
  updatedAt: string;
  provider?: string;
  model?: string;
}

export interface SnippetFilters {
  language?: string;
  category?: string;
  projectSlug?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/** List snippets with optional filters */
export async function fetchSnippets(filters?: SnippetFilters) {
  const params = new URLSearchParams();
  if (filters?.language) params.set('language', filters.language);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.projectSlug) params.set('projectSlug', filters.projectSlug);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return apiFetch<{
    data: SnippetResponse[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>(`/snippets${qs ? `?${qs}` : ''}`);
}

/** Get a single snippet */
export async function fetchSnippet(id: string) {
  return apiFetch<SnippetResponse>(`/snippets/${id}`);
}

/** Create a snippet */
export async function createSnippet(data: {
  title: string;
  code: string;
  language: string;
  description?: string;
  category?: string;
  tags?: string[];
  projectSlug?: string;
}) {
  return apiFetch<SnippetResponse>('/snippets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** AI-generate a snippet from a natural language prompt */
export async function generateSnippet(data: {
  prompt: string;
  language?: string;
  projectSlug?: string;
}) {
  return apiFetch<SnippetResponse>('/snippets/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Track a snippet copy event */
export async function trackSnippetCopy(id: string) {
  return apiFetch<{ copyCount: number }>(`/snippets/${id}/copy`, {
    method: 'POST',
  });
}

/** Delete a snippet */
export async function deleteSnippet(id: string) {
  return apiFetch<{ message: string }>(`/snippets/${id}`, {
    method: 'DELETE',
  });
}

/** Get available snippet languages */
export async function fetchSnippetLanguages() {
  return apiFetch<Array<{ language: string; count: number }>>('/snippets/languages');
}

/** Get available snippet categories */
export async function fetchSnippetCategories() {
  return apiFetch<Array<{ category: string; count: number }>>('/snippets/categories');
}

// ───────────────────── Project News API ─────────────────────

export interface ProjectNewsArticle {
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
  data: ProjectNewsArticle[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/** Fetch news articles for a project */
export async function fetchProjectNews(
  idOrSlug: string,
  filters?: { page?: number; limit?: number; search?: string },
) {
  const params = new URLSearchParams();
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));
  if (filters?.search) params.set('search', filters.search);
  const qs = params.toString();
  return apiFetch<ProjectNewsResponse>(
    `/projects/${idOrSlug}/news${qs ? `?${qs}` : ''}`,
  );
}

/** Manually trigger news sync for a project */
export async function syncProjectNews(idOrSlug: string) {
  return apiFetch<{ synced: number }>(`/projects/${idOrSlug}/news/sync`, {
    method: 'POST',
  });
}

/** Delete a news article */
export async function deleteProjectNewsArticle(
  idOrSlug: string,
  articleId: string,
) {
  return apiFetch<{ deleted: boolean }>(
    `/projects/${idOrSlug}/news/${articleId}`,
    { method: 'DELETE' },
  );
}

export type SocialPlatform = 'twitter' | 'linkedin' | 'instagram';

export interface GeneratedSocialPost {
  content: string;
  platform: SocialPlatform;
  articleId: string;
  articleTitle: string;
  provider: string;
  model: string;
}

/** Generate an AI social media post from a news article */
export async function generateSocialPost(
  idOrSlug: string,
  articleId: string,
  platform: SocialPlatform,
  customPrompt?: string,
) {
  return apiFetch<GeneratedSocialPost>(
    `/projects/${idOrSlug}/news/${articleId}/generate-post`,
    {
      method: 'POST',
      body: JSON.stringify({ platform, customPrompt }),
    },
  );
}
