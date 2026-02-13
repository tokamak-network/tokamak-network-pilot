import type {
  AskRequest,
  AskResponse,
  SearchResponse,
  Source,
  ContentEntry,
  PaginatedResponse,
  ApiKeyInfo,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  UpdateApiKeyRequest,
  ApiKeyUsageEntry,
  ConversationSummary,
  ConversationDetail,
  AskInConversationRequest,
  AskInConversationResponse,
} from '@tokamak-pilot/shared';

export interface TokamakPilotClientOptions {
  /** Base URL of the Tokamak Pilot API (e.g. https://pilot.tokamak.network/api/v1) */
  baseUrl: string;
  /** Optional bearer token for authenticated endpoints (key management) */
  token?: string;
  /** Optional API key for public endpoints (third-party access) */
  apiKey?: string;
}

/**
 * TypeScript SDK client for the Tokamak Pilot API.
 *
 * There are two authentication modes:
 *
 * 1. **JWT token** — for internal users managing keys, sources, content, etc.
 * 2. **API key** — for third-party apps accessing the public API.
 *
 * When an `apiKey` is provided, the `ask`, `search`, `listSources`, `getSource`,
 * `listContent`, `getContent`, and `health` methods automatically route through
 * the `/public/` endpoints with the `X-API-Key` header.
 *
 * @example
 * ```ts
 * // Third-party usage with API key
 * const pilot = new TokamakPilotClient({
 *   baseUrl: 'http://localhost:4000/api/v1',
 *   apiKey: 'tkp_a1b2c3d4e5f6...',
 * });
 *
 * const answer = await pilot.ask('How does TON staking work?');
 * console.log(answer.answer);
 * ```
 *
 * @example
 * ```ts
 * // Internal usage with JWT
 * const pilot = new TokamakPilotClient({
 *   baseUrl: 'http://localhost:4000/api/v1',
 *   token: 'eyJhbGciOi...',
 * });
 *
 * const keys = await pilot.listApiKeys();
 * ```
 */
export class TokamakPilotClient {
  private baseUrl: string;
  private token?: string;
  private apiKey?: string;

  constructor(options: TokamakPilotClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.token = options.token;
    this.apiKey = options.apiKey;
  }

  /** Whether this client uses API key auth (routes through /public/ endpoints) */
  get isApiKeyAuth(): boolean {
    return !!this.apiKey;
  }

  // ---- RAG ----

  async ask(question: string, filters?: string[]): Promise<AskResponse> {
    const body: AskRequest = { question, filters };
    const path = this.apiKey ? '/public/ask' : '/ask';
    return this.post<AskResponse>(path, body);
  }

  async search(query: string, limit = 10): Promise<SearchResponse> {
    const base = this.apiKey ? '/public/search' : '/ask/search';
    return this.get<SearchResponse>(
      `${base}?q=${encodeURIComponent(query)}&limit=${limit}`,
    );
  }

  // ---- Sources ----

  async listSources(): Promise<{ sources: Source[]; total: number }> {
    const path = this.apiKey ? '/public/sources' : '/sources';
    return this.get(path);
  }

  async getSource(id: string): Promise<Source> {
    const path = this.apiKey ? `/public/sources/${id}` : `/sources/${id}`;
    return this.get(path);
  }

  async syncSource(id: string): Promise<{ message: string }> {
    return this.post(`/sources/${id}/sync`);
  }

  // ---- Content ----

  async listContent(
    filters?: { project?: string; category?: string },
  ): Promise<PaginatedResponse<ContentEntry>> {
    const params = new URLSearchParams();
    if (filters?.project) params.set('project', filters.project);
    if (filters?.category) params.set('category', filters.category);
    const qs = params.toString();
    const base = this.apiKey ? '/public/content' : '/content';
    return this.get(`${base}${qs ? `?${qs}` : ''}`);
  }

  async getContent(id: string): Promise<ContentEntry> {
    const path = this.apiKey ? `/public/content/${id}` : `/content/${id}`;
    return this.get(path);
  }

  // ---- Conversations (requires JWT token) ----

  async createConversation(title?: string): Promise<ConversationSummary> {
    return this.post<ConversationSummary>('/conversations', title ? { title } : {});
  }

  async listConversations(
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<ConversationSummary>> {
    return this.get(`/conversations?page=${page}&limit=${limit}`);
  }

  async getConversation(id: string): Promise<ConversationDetail> {
    return this.get<ConversationDetail>(`/conversations/${id}`);
  }

  async updateConversation(id: string, title: string): Promise<ConversationSummary> {
    return this.request<ConversationSummary>(`/conversations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    });
  }

  async deleteConversation(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/conversations/${id}`, {
      method: 'DELETE',
    });
  }

  async askInConversation(
    conversationId: string,
    question: string,
    filters?: string[],
  ): Promise<AskInConversationResponse> {
    const body: AskInConversationRequest = { question, filters };
    return this.post<AskInConversationResponse>(
      `/conversations/${conversationId}/ask`,
      body,
    );
  }

  async quickAsk(
    question: string,
    filters?: string[],
  ): Promise<AskInConversationResponse> {
    const body: AskInConversationRequest = { question, filters };
    return this.post<AskInConversationResponse>('/conversations/quick-ask', body);
  }

  // ---- Health ----

  async health(): Promise<{ status: string; version?: string }> {
    const path = this.apiKey ? '/public/health' : '/health';
    return this.get(path);
  }

  // ---- API Key Management (requires JWT token) ----

  async createApiKey(dto: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
    return this.post<CreateApiKeyResponse>('/api-keys', dto);
  }

  async listApiKeys(): Promise<ApiKeyInfo[]> {
    return this.get<ApiKeyInfo[]>('/api-keys');
  }

  async getApiKey(id: string): Promise<ApiKeyInfo> {
    return this.get<ApiKeyInfo>(`/api-keys/${id}`);
  }

  async updateApiKey(id: string, dto: UpdateApiKeyRequest): Promise<ApiKeyInfo> {
    return this.request<ApiKeyInfo>(`/api-keys/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  }

  async deleteApiKey(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api-keys/${id}`, {
      method: 'DELETE',
    });
  }

  async rotateApiKey(id: string): Promise<CreateApiKeyResponse> {
    return this.post<CreateApiKeyResponse>(`/api-keys/${id}/rotate`);
  }

  async getApiKeyUsage(
    id: string,
    page = 1,
    limit = 50,
  ): Promise<PaginatedResponse<ApiKeyUsageEntry>> {
    return this.get(`/api-keys/${id}/usage?page=${page}&limit=${limit}`);
  }

  // ---- Internal Helpers ----

  private async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  private async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private async request<T>(path: string, options: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string>) },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `API error: ${res.status}`);
    }

    return res.json();
  }
}
