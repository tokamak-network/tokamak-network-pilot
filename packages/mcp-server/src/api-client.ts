export interface ApiClientConfig {
  apiUrl: string;
  apiKey: string;
}

/**
 * HTTP client for communicating with the Tokamak Pilot API.
 *
 * Wraps the public API (authenticated via `X-API-Key`) and the
 * open project endpoints (no auth required, but key is sent anyway).
 */
export class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.apiUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
  }

  // ── RAG ────────────────────────────────────────────────────

  async ask(
    question: string,
    filters?: string[],
  ): Promise<{
    answer: string;
    question: string;
    sources: Array<{ title: string; url: string; score: number; snippet?: string }>;
    confidence: number;
  }> {
    return this.post('/public/ask', { question, filters });
  }

  async search(
    query: string,
    limit?: number,
  ): Promise<{
    query: string;
    results: Array<{ content: string; source: string; score: number; metadata: Record<string, unknown> }>;
    total: number;
  }> {
    const params = new URLSearchParams({ q: query });
    if (limit !== undefined) params.set('limit', String(limit));
    return this.get(`/public/search?${params}`);
  }

  // ── Sources ────────────────────────────────────────────────

  async listSources(): Promise<{
    sources: Array<{
      id: string;
      name: string;
      type: string;
      status: string;
      lastSyncedAt?: string;
      createdAt: string;
    }>;
    total: number;
  }> {
    return this.get('/public/sources');
  }

  async getSource(id: string): Promise<Record<string, unknown>> {
    return this.get(`/public/sources/${encodeURIComponent(id)}`);
  }

  // ── Content ────────────────────────────────────────────────

  async listContent(filters?: {
    project?: string;
    category?: string;
  }): Promise<{
    data: Array<{
      id: string;
      title: string;
      body: string;
      project?: string;
      category?: string;
      tags: string[];
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams();
    if (filters?.project) params.set('project', filters.project);
    if (filters?.category) params.set('category', filters.category);
    const qs = params.toString();
    return this.get(`/public/content${qs ? `?${qs}` : ''}`);
  }

  async getContent(id: string): Promise<Record<string, unknown>> {
    return this.get(`/public/content/${encodeURIComponent(id)}`);
  }

  // ── Projects ───────────────────────────────────────────────

  async listProjects(): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      description?: string;
      summary?: string;
      isPublic: boolean;
      memberCount: number;
      sourceCount: number;
      createdAt: string;
    }>
  > {
    return this.get('/projects');
  }

  async getProject(idOrSlug: string): Promise<Record<string, unknown>> {
    return this.get(`/projects/${encodeURIComponent(idOrSlug)}`);
  }

  // ── Health ─────────────────────────────────────────────────

  async health(): Promise<{ status: string }> {
    return this.get('/public/health');
  }

  // ── Internal Helpers ───────────────────────────────────────

  private async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  private async request<T>(path: string, options: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? (err as { message: string }).message
          : `API error: ${res.status}`;
      throw new Error(msg);
    }

    return res.json() as Promise<T>;
  }
}
