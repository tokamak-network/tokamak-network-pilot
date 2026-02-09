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
  /** Optional bearer token for authenticated endpoints */
  token?: string;
}

/**
 * TypeScript SDK client for the Tokamak Pilot API.
 *
 * @example
 * ```ts
 * import { TokamakPilotClient } from '@tokamak-pilot/sdk';
 *
 * const pilot = new TokamakPilotClient({
 *   baseUrl: 'http://localhost:4000/api/v1',
 * });
 *
 * const answer = await pilot.ask('How does TON staking work?');
 * console.log(answer.answer);
 * ```
 */
export class TokamakPilotClient {
  private baseUrl: string;
  private token?: string;

  constructor(options: TokamakPilotClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.token = options.token;
  }

  // ---- RAG ----

  async ask(question: string, filters?: string[]): Promise<AskResponse> {
    const body: AskRequest = { question, filters };
    return this.post<AskResponse>('/ask', body);
  }

  async search(query: string, limit = 10): Promise<SearchResponse> {
    return this.get<SearchResponse>(
      `/ask/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    );
  }

  // ---- Sources ----

  async listSources(): Promise<{ sources: Source[]; total: number }> {
    return this.get('/sources');
  }

  async getSource(id: string): Promise<Source> {
    return this.get(`/sources/${id}`);
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
    return this.get(`/content${qs ? `?${qs}` : ''}`);
  }

  async getContent(id: string): Promise<ContentEntry> {
    return this.get(`/content/${id}`);
  }

  // ---- Health ----

  async health(): Promise<{ status: string; version: string }> {
    return this.get('/health');
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
