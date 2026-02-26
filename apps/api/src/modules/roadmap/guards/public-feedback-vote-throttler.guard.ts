import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Rate-limit public feedback voting to reduce abuse.
 * Bucket key is project slug + requester IP.
 */
@Injectable()
export class PublicFeedbackVoteThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const slug = String(req.params?.slug || 'unknown').toLowerCase();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `public-feedback-vote:${slug}:${ip}`;
  }

  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    // 60 vote attempts / 10 minutes per (project slug + IP)
    return super.handleRequest({
      ...requestProps,
      limit: 60,
      ttl: 10 * 60 * 1000,
    });
  }

  protected getRequestResponse(
    context: ExecutionContext,
  ): {
    req: Record<string, any>;
    res: Record<string, any>;
  } {
    const http = context.switchToHttp();
    return {
      req: http.getRequest<Request>() as unknown as Record<string, any>,
      res: http.getResponse() as Record<string, any>,
    };
  }
}
