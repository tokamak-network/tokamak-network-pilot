import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Rate-limit unauthenticated public feedback submissions.
 * Bucket key is project slug + requester IP.
 */
@Injectable()
export class PublicFeedbackThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const slug = String(req.params?.slug || 'unknown').toLowerCase();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `public-feedback:${slug}:${ip}`;
  }

  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    // 10 submissions / 10 minutes per (project slug + IP)
    return super.handleRequest({
      ...requestProps,
      limit: 10,
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
