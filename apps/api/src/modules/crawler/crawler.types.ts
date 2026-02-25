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
  /** When true, fetch robots.txt and skip disallowed URLs (default false). */
  respectRobotsTxt?: boolean;
  /** Path prefixes or patterns to skip when discovering links (e.g. /login, /api/). */
  excludePathPatterns?: string[];
}

export const DEFAULT_CRAWL_OPTIONS: Required<Omit<CrawlOptions, 'excludePathPatterns'>> & {
  excludePathPatterns: string[];
} = {
  maxPages: 50,
  maxDepth: 2,
  timeout: 15000,
  delayBetweenRequests: 500,
  userAgent: 'TokamakPilotCrawler/1.0 (+https://tokamak.network)',
  sameOriginOnly: true,
  respectRobotsTxt: false,
  excludePathPatterns: [
    '/login',
    '/logout',
    '/signin',
    '/signup',
    '/cart',
    '/checkout',
    '/api/',
    '/search',
    '/admin',
    '/_next/',
    '/static/',
  ],
};

/** Normalize URL for deduplication: strip fragment, trailing slash (except root), lowercase host. */
export function normalizeCrawlUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return url;
    u.hash = '';
    u.search = ''; // optional: keep query for same path? we normalize for dedupe
    const path = u.pathname.replace(/\/$/, '') || '/';
    u.pathname = path;
    u.hostname = u.hostname.toLowerCase();
    return u.href;
  } catch {
    return url;
  }
}
