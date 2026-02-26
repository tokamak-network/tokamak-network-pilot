import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/** Simple in-memory cache for robots.txt disallow rules by origin. */
const robotsCache = new Map<
  string,
  { disallowPrefixes: string[]; fetchedAt: number }
>();
const ROBOTS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Parse robots.txt and return path prefixes that are disallowed for the given userAgent.
 * Matches User-agent: * or any agent whose name appears as a prefix in the UA string
 * (e.g. robots.txt "User-agent: TokamakPilotCrawler" matches UA "TokamakPilotCrawler/1.0 (...)").
 */
function parseRobotsTxt(content: string, userAgent: string): string[] {
  const disallow: string[] = [];
  const lines = content.split(/\r?\n/);
  let currentAgent = '';
  const uaLower = userAgent.toLowerCase();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#') || !line) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (key === 'user-agent') {
      currentAgent = value.toLowerCase();
      continue;
    }
    if (key === 'disallow' && value) {
      const path = value.startsWith('/') ? value : `/${value}`;
      const agentMatches =
        currentAgent === '*' ||
        currentAgent === uaLower ||
        uaLower.startsWith(currentAgent);
      if (agentMatches) {
        disallow.push(path);
      }
      continue;
    }
  }

  return disallow;
}

/** Check if url path is disallowed by any of the prefix rules (robots.txt spec: pure prefix match). */
function isDisallowed(pathname: string, disallowPrefixes: string[]): boolean {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return disallowPrefixes.some((prefix) => path.startsWith(prefix));
}

@Injectable()
export class RobotsService {
  private readonly logger = new Logger(RobotsService.name);

  /**
   * Get disallowed path prefixes for the given origin and user-agent.
   * Returns empty array if no robots.txt or on parse/network error.
   */
  async getDisallowedPrefixes(
    origin: string,
    userAgent: string,
  ): Promise<string[]> {
    const cacheKey = `${origin}|${userAgent}`;
    const cached = robotsCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < ROBOTS_CACHE_TTL_MS) {
      return cached.disallowPrefixes;
    }

    try {
      const url = `${origin}/robots.txt`;
      const res = await axios.get<string>(url, {
        timeout: 5000,
        responseType: 'text',
        validateStatus: (s) => s === 200,
      });
      if (res.status !== 200 || !res.data) {
        robotsCache.set(cacheKey, { disallowPrefixes: [], fetchedAt: Date.now() });
        return [];
      }
      const disallowPrefixes = parseRobotsTxt(res.data, userAgent);
      robotsCache.set(cacheKey, { disallowPrefixes, fetchedAt: Date.now() });
      return disallowPrefixes;
    } catch {
      robotsCache.set(cacheKey, { disallowPrefixes: [], fetchedAt: Date.now() });
      return [];
    }
  }

  /** Check if the given full URL is allowed (not disallowed by robots.txt). */
  async isAllowed(fullUrl: string, disallowPrefixes: string[]): Promise<boolean> {
    try {
      const pathname = new URL(fullUrl).pathname;
      return !isDisallowed(pathname, disallowPrefixes);
    } catch {
      return true;
    }
  }
}

export { isDisallowed };
