const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

/**
 * Typed fetch wrapper for the Tokamak Pilot API.
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
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
