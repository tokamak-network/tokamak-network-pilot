/**
 * Raw document shape produced by any fetcher (GitHub, crawler, etc.)
 * before chunking and embedding.
 */
export interface RawDocument {
  title: string;
  content: string;
  contentType: string;
  url: string;
  metadata: Record<string, unknown>;
}
