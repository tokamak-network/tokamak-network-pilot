import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import type { RawDocument } from '../ingestion/ingestion.types';
import {
  type CrawlOptions,
  DEFAULT_CRAWL_OPTIONS,
  normalizeCrawlUrl,
} from './crawler.types';
import { RobotsService, isDisallowed } from './robots.service';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const PROGRESS_EVERY_N_PAGES = 5;

/** Check if response is HTML by Content-Type header. */
function isHtmlResponse(contentType: string | undefined): boolean {
  if (!contentType) return false;
  const lower = contentType.toLowerCase().split(';')[0].trim();
  return lower === 'text/html' || lower === 'application/xhtml+xml';
}

/** Extract readable text from a pre-loaded cheerio instance. Mutates $ (removes elements). */
function extractTextFromCheerio($: cheerio.CheerioAPI, baseUrl: string): { title: string; text: string } {
  $('script, style, nav, footer, noscript, [role="navigation"], .nav, .footer').remove();

  const title =
    $('title').first().text().trim() ||
    $('h1').first().text().trim() ||
    new URL(baseUrl).hostname;

  const main =
    $('main').first().length ||
    $('article').first().length ||
    $('[role="main"]').first().length
      ? $('main, article, [role="main"]').first()
      : $('body');

  let text = main.text() || $('body').text();
  text = text
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text.length > 500_000) text = text.slice(0, 500_000) + '\n[... truncated]';

  return { title, text };
}

/** Resolve href against base URL; return null if invalid or not same-origin. */
function resolveUrl(href: string, baseUrl: string, sameOriginOnly: boolean): string | null {
  try {
    const resolved = new URL(href, baseUrl);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null;
    if (sameOriginOnly) {
      const base = new URL(baseUrl);
      if (resolved.origin !== base.origin) return null;
    }
    return resolved.href;
  } catch {
    return null;
  }
}

/** Return true if path should be excluded by excludePathPatterns. */
function isExcludedPath(pathname: string, patterns: string[]): boolean {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return patterns.some((p) => {
    const normalized = p.replace(/\/$/, '');
    return path === normalized || path.startsWith(normalized + '/');
  });
}

/**
 * Collect same-origin links from the page, excluding paths that match excludePathPatterns.
 * Must be called BEFORE extractTextFromCheerio (which removes nav/footer elements containing links).
 */
function collectLinks(
  $: cheerio.CheerioAPI,
  baseUrl: string,
  sameOriginOnly: boolean,
  excludePathPatterns: string[],
): string[] {
  const seen = new Set<string>();

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:'))
      return;
    const url = resolveUrl(href, baseUrl, sameOriginOnly);
    if (!url) return;
    try {
      if (isExcludedPath(new URL(url).pathname, excludePathPatterns)) return;
    } catch {
      return;
    }
    const normalized = normalizeCrawlUrl(url);
    if (!seen.has(normalized)) seen.add(normalized);
  });

  return Array.from(seen);
}

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private readonly client: AxiosInstance;

  constructor(
    private readonly config: ConfigService,
    private readonly robots: RobotsService,
  ) {
    const timeout = this.config.get<number>('CRAWL_TIMEOUT_MS', 15000);
    const userAgent = this.config.get<string>(
      'CRAWL_USER_AGENT',
      DEFAULT_CRAWL_OPTIONS.userAgent,
    );

    this.client = axios.create({
      timeout,
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml',
      },
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });
  }

  /**
   * Fetch one URL and return raw document plus outbound links (for multi-page crawl).
   * Skips non-HTML responses. Retries up to MAX_RETRIES on timeout or 5xx.
   */
  async crawlPage(
    url: string,
    options: CrawlOptions = {},
  ): Promise<{ doc: RawDocument | null; links: string[] }> {
    const opts = { ...DEFAULT_CRAWL_OPTIONS, ...options };
    const timeout = options.timeout ?? this.config.get<number>('CRAWL_TIMEOUT_MS', opts.timeout);
    const sameOriginOnly = options.sameOriginOnly ?? opts.sameOriginOnly;
    const excludePathPatterns = options.excludePathPatterns ?? opts.excludePathPatterns;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await this.client.get<string>(url, {
          timeout,
          responseType: 'text',
          headers: options.userAgent ? { 'User-Agent': options.userAgent } : undefined,
        });

        const contentType = (res.headers['content-type'] ?? res.headers['Content-Type']) as string | undefined;
        if (!isHtmlResponse(contentType)) {
          this.logger.debug(`Skipping ${url}: non-HTML Content-Type ${contentType ?? 'missing'}`);
          return { doc: null, links: [] };
        }

        const html = res.data;
        const $ = cheerio.load(html);
        const links = collectLinks($, url, sameOriginOnly, excludePathPatterns);
        const { title, text } = extractTextFromCheerio($, url);

        if (!text || text.length < 50) {
          this.logger.debug(`Skipping ${url}: too little text`);
          return { doc: null, links };
        }

        const doc: RawDocument = {
          title: title || new URL(url).pathname || url,
          content: text,
          contentType: 'html',
          url,
          metadata: { crawledAt: new Date().toISOString() },
        };
        return { doc, links };
      } catch (err: any) {
        const status = err.response?.status;
        const is5xx = typeof status === 'number' && status >= 500;
        const isTimeout =
          err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';
        const isRetryable = (is5xx || isTimeout) && attempt < MAX_RETRIES;

        if (isRetryable) {
          lastError = err;
          this.logger.debug(`Retry ${attempt + 1}/${MAX_RETRIES} for ${url}: ${err.message}`);
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          continue;
        }
        if (status >= 400) {
          this.logger.warn(`Skipping ${url}: HTTP ${status}`);
        } else {
          this.logger.warn(`Failed to crawl ${url}: ${err.message}`);
        }
        return { doc: null, links: [] };
      }
    }

    this.logger.warn(`Failed to crawl ${url} after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`);
    return { doc: null, links: [] };
  }

  /**
   * Crawl a website starting from seedUrl: fetch seed page, discover same-origin links,
   * and crawl up to maxPages pages (breadth-first, limited by maxDepth).
   * Seed URL is normalized. Optional onProgress(crawledCount, lastUrl) is called every N pages.
   */
  async crawlWebsite(
    seedUrl: string,
    options: CrawlOptions = {},
    onProgress?: (crawled: number, lastUrl: string) => void | Promise<void>,
  ): Promise<{ documents: RawDocument[]; crawledUrls: string[] }> {
    const opts = { ...DEFAULT_CRAWL_OPTIONS, ...options };
    const normalizedSeed = normalizeCrawlUrl(seedUrl);
    const maxPages = options.maxPages ?? this.config.get<number>('CRAWL_MAX_PAGES', opts.maxPages);
    const maxDepth = options.maxDepth ?? opts.maxDepth;
    const delayMs = options.delayBetweenRequests ?? opts.delayBetweenRequests;
    const sameOriginOnly = options.sameOriginOnly ?? opts.sameOriginOnly;
    const respectRobotsTxt = options.respectRobotsTxt ?? opts.respectRobotsTxt;
    const userAgent = options.userAgent ?? this.config.get<string>('CRAWL_USER_AGENT', opts.userAgent);

    const baseOrigin = new URL(normalizedSeed).origin;
    let disallowPrefixes: string[] = [];
    if (respectRobotsTxt) {
      disallowPrefixes = await this.robots.getDisallowedPrefixes(baseOrigin, userAgent);
      if (disallowPrefixes.length > 0) {
        this.logger.log(`Robots.txt: ${disallowPrefixes.length} disallow rule(s) for ${baseOrigin}`);
      }
    }

    const visited = new Set<string>();
    const toVisit: { url: string; depth: number }[] = [{ url: normalizedSeed, depth: 0 }];
    const documents: RawDocument[] = [];
    const crawledUrls: string[] = [];

    const delay = () => new Promise((r) => setTimeout(r, delayMs));

    while (toVisit.length > 0 && documents.length < maxPages) {
      const { url, depth } = toVisit.shift()!;
      const normalized = normalizeCrawlUrl(url);
      if (visited.has(normalized)) continue;
      if (disallowPrefixes.length > 0 && isDisallowed(new URL(url).pathname, disallowPrefixes)) {
        this.logger.debug(`Skipping (robots): ${url}`);
        visited.add(normalized);
        continue;
      }
      visited.add(normalized);

      const { doc, links } = await this.crawlPage(url, options);
      if (doc) {
        documents.push(doc);
        crawledUrls.push(url);
        this.logger.log(`Crawled [${documents.length}/${maxPages}] ${url}`);
        if (onProgress && documents.length % PROGRESS_EVERY_N_PAGES === 0) {
          await Promise.resolve(onProgress(documents.length, url));
        }
      }

      if (depth < maxDepth) {
        for (const href of links) {
          const norm = normalizeCrawlUrl(href);
          if (visited.has(norm)) continue;
          try {
            if (new URL(href).origin !== baseOrigin) continue;
            if (disallowPrefixes.length > 0 && isDisallowed(new URL(href).pathname, disallowPrefixes)) continue;
          } catch {
            continue;
          }
          toVisit.push({ url: href, depth: depth + 1 });
        }
      }

      await delay();
    }

    this.logger.log(
      `Crawl complete: ${documents.length} documents from ${crawledUrls.length} URLs (seed: ${normalizedSeed})`,
    );
    return { documents, crawledUrls };
  }
}
