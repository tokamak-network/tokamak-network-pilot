import type {
  AskRequest,
  AskResponse,
  SearchResponse,
  Source,
  ContentEntry,
  PaginatedResponse,
} from '@tokamak-pilot/shared';

export interface TokamakPilotClientOptions {
  /** Base URL of the Tokamak Pilot API (e.g. https://pilot.tokamak.network/api/v1) */
  baseUrl: string;
  /** API key for authenticating with the public API */
  apiKey: string;
}

/**
 * TypeScript SDK client for the Tokamak Pilot **public** API.
 *
 * All requests are authenticated via an API key sent in the `X-API-Key` header.
 * The available endpoints depend on the scopes granted to your key:
 *
 * | Method          | Required Scope    |
 * |-----------------|-------------------|
 * | `ask()`         | `ask`             |
 * | `search()`      | `search`          |
 * | `listSources()` | `sources:read`    |
 * | `getSource()`   | `sources:read`    |
 * | `listContent()` | `content:read`    |
 * | `getContent()`  | `content:read`    |
 * | `health()`      | *(none)*          |
 *
 * @example
 * ```ts
 * const pilot = new TokamakPilotClient({
 *   baseUrl: 'https://pilot.tokamak.network/api/v1',
 *   apiKey: 'tkp_a1b2c3d4e5f6...',
 * });
 *
 * const answer = await pilot.ask('How does TON staking work?');
 * console.log(answer.answer);
 *
 * const results = await pilot.search('staking rewards');
 * console.log(results.results);
 * ```
 */
export class TokamakPilotClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(options: TokamakPilotClientOptions) {
    if (!options.apiKey) {
      throw new Error('An API key is required to use the Tokamak Pilot SDK');
    }
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
  }

  // ---- RAG ----

  /** Ask a question and receive an AI-generated answer with cited sources. Requires scope: `ask`. */
  async ask(question: string, filters?: string[]): Promise<AskResponse> {
    const body: AskRequest = { question, filters };
    return this.post<AskResponse>('/public/ask', body);
  }

  /** Perform a semantic search across the knowledge base. Requires scope: `search`. */
  async search(query: string, limit = 10): Promise<SearchResponse> {
    return this.get<SearchResponse>(
      `/public/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    );
  }

  // ---- Sources ----

  /** List all indexed sources. Requires scope: `sources:read`. */
  async listSources(): Promise<{ sources: Source[]; total: number }> {
    return this.get('/public/sources');
  }

  /** Get details for a specific source. Requires scope: `sources:read`. */
  async getSource(id: string): Promise<Source> {
    return this.get(`/public/sources/${id}`);
  }

  // ---- Content ----

  /** List content entries with optional filters. Requires scope: `content:read`. */
  async listContent(
    filters?: { project?: string; category?: string },
  ): Promise<PaginatedResponse<ContentEntry>> {
    const params = new URLSearchParams();
    if (filters?.project) params.set('project', filters.project);
    if (filters?.category) params.set('category', filters.category);
    const qs = params.toString();
    return this.get(`/public/content${qs ? `?${qs}` : ''}`);
  }

  /** Get a specific content entry by ID. Requires scope: `content:read`. */
  async getContent(id: string): Promise<ContentEntry> {
    return this.get(`/public/content/${id}`);
  }

  // ---- Health ----

  /** Check the health of the Tokamak Pilot API. No scope required. */
  async health(): Promise<{ status: string; version?: string }> {
    return this.get('/public/health');
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
      'X-API-Key': this.apiKey,
    };

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
