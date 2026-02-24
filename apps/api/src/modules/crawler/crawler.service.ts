import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import type { RawDocument } from '../ingestion/ingestion.types';
import {
  type CrawlOptions,
  DEFAULT_CRAWL_OPTIONS,
} from './crawler.types';

/** Normalize and extract readable text from HTML. */
function extractTextFromHtml(html: string, baseUrl: string): { title: string; text: string } {
  const $ = cheerio.load(html);

  // Remove script, style, nav, footer, noscript
  $('script, style, nav, footer, noscript, [role="navigation"], .nav, .footer').remove();

  const title =
    $('title').first().text().trim() ||
    $('h1').first().text().trim() ||
    new URL(baseUrl).hostname;

  // Prefer main/content areas
  const main =
    $('main').first().length ||
    $('article').first().length ||
    $('[role="main"]').first().length
      ? $('main, article, [role="main"]').first()
      : $('body');

  let text = main.text() || $('body').text();
  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
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

/** Collect same-origin links from the page. */
function collectLinks($: cheerio.CheerioAPI, baseUrl: string, sameOriginOnly: boolean): string[] {
  const seen = new Set<string>();
  const base = new URL(baseUrl);

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:'))
      return;
    const url = resolveUrl(href, baseUrl, sameOriginOnly);
    if (url && !seen.has(url)) {
      seen.add(url);
    }
  });

  return Array.from(seen);
}

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);
  private readonly client: AxiosInstance;

  constructor(private readonly config: ConfigService) {
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
   */
  async crawlPage(
    url: string,
    options: CrawlOptions = {},
  ): Promise<{ doc: RawDocument | null; links: string[] }> {
    const opts = { ...DEFAULT_CRAWL_OPTIONS, ...options };
    const timeout = options.timeout ?? this.config.get<number>('CRAWL_TIMEOUT_MS', opts.timeout);
    const sameOriginOnly = options.sameOriginOnly ?? opts.sameOriginOnly;

    try {
      const res = await this.client.get<string>(url, {
        timeout,
        responseType: 'text',
        headers: options.userAgent ? { 'User-Agent': options.userAgent } : undefined,
      });

      const html = res.data;
      const $ = cheerio.load(html);
      const { title, text } = extractTextFromHtml(html, url);
      const links = collectLinks($, url, sameOriginOnly);

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
      this.logger.warn(`Failed to crawl ${url}: ${err.message}`);
      return { doc: null, links: [] };
    }
  }

  /**
   * Crawl a website starting from seedUrl: fetch seed page, discover same-origin links,
   * and crawl up to maxPages pages (breadth-first, limited by maxDepth).
   */
  async crawlWebsite(
    seedUrl: string,
    options: CrawlOptions = {},
  ): Promise<{ documents: RawDocument[]; crawledUrls: string[] }> {
    const opts = { ...DEFAULT_CRAWL_OPTIONS, ...options };
    const maxPages = options.maxPages ?? this.config.get<number>('CRAWL_MAX_PAGES', opts.maxPages);
    const maxDepth = options.maxDepth ?? opts.maxDepth;
    const delayMs = options.delayBetweenRequests ?? opts.delayBetweenRequests;
    const sameOriginOnly = options.sameOriginOnly ?? opts.sameOriginOnly;

    const baseOrigin = new URL(seedUrl).origin;
    const visited = new Set<string>();
    const toVisit: { url: string; depth: number }[] = [{ url: seedUrl, depth: 0 }];
    const documents: RawDocument[] = [];
    const crawledUrls: string[] = [];

    const delay = () => new Promise((r) => setTimeout(r, delayMs));

    while (toVisit.length > 0 && documents.length < maxPages) {
      const { url, depth } = toVisit.shift()!;
      const normalized = url.replace(/#.*$/, '').replace(/\/$/, '') || url;
      if (visited.has(normalized)) continue;
      visited.add(normalized);

      const { doc, links } = await this.crawlPage(url, options);
      if (doc) {
        documents.push(doc);
        crawledUrls.push(url);
        this.logger.log(`Crawled [${documents.length}/${maxPages}] ${url}`);
      }

      if (depth < maxDepth) {
        for (const href of links) {
          const normalizedHref = href.replace(/#.*$/, '').replace(/\/$/, '') || href;
          if (!visited.has(normalizedHref) && new URL(href).origin === baseOrigin) {
            toVisit.push({ url: href, depth: depth + 1 });
          }
        }
      }

      await delay();
    }

    this.logger.log(
      `Crawl complete: ${documents.length} documents from ${crawledUrls.length} URLs (seed: ${seedUrl})`,
    );
    return { documents, crawledUrls };
  }
}
