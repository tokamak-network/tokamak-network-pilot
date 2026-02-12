const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

/** Get stored JWT token */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tokamak_token');
}

/**
 * Typed fetch wrapper for the Tokamak Pilot API.
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
 * Ask a question to the RAG pipeline.
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
