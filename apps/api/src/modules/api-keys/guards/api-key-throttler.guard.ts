import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { Request } from 'express';
import { TIER_RATE_LIMITS } from '../../../entities/api-key.entity';

/**
 * Custom ThrottlerGuard that reads per-key rate limits.
 *
 * - If the request carries a validated API key (set by ApiKeyGuard),
 *   the rate limit is taken from the key's `rateLimit` field.
 * - The tracker key is the API key's ID, so each key has its own bucket.
 * - If no API key is present, falls back to default throttling by IP.
 */
@Injectable()
export class ApiKeyThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const apiKey = (req as any).apiKey;
    if (apiKey) {
      return `api-key:${apiKey.id}`;
    }
    // Fallback to IP
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const { context } = requestProps;
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = (request as any).apiKey;

    if (apiKey) {
      // Override the throttler limit/ttl based on the API key
      const limit = apiKey.rateLimit || TIER_RATE_LIMITS.premium;
      const ttl = 60_000; // 1 minute window in ms

      return super.handleRequest({
        ...requestProps,
        limit,
        ttl,
      });
    }

    return super.handleRequest(requestProps);
  }
}
