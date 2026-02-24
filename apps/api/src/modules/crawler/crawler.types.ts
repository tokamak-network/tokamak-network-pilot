/**
 * Options for website crawling. Used when creating a website source
 * or when re-syncing.
 */
export interface CrawlOptions {
  /** Maximum number of pages to crawl (default from config). */
  maxPages?: number;
  /** Maximum depth from seed URL (default 2). */
  maxDepth?: number;
  /** Request timeout in ms (default 15000). */
  timeout?: number;
  /** Delay between requests in ms to be polite (default 500). */
  delayBetweenRequests?: number;
  /** Custom User-Agent string. */
  userAgent?: string;
  /** Only follow links under the same origin as the seed URL (default true). */
  sameOriginOnly?: boolean;
}

export const DEFAULT_CRAWL_OPTIONS: Required<CrawlOptions> = {
  maxPages: 50,
  maxDepth: 2,
  timeout: 15000,
  delayBetweenRequests: 500,
  userAgent: 'TokamakPilotCrawler/1.0 (+https://tokamak.network)',
  sameOriginOnly: true,
};
