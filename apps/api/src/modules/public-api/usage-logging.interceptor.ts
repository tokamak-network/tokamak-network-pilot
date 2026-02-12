import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { ApiKeysService } from '../api-keys/api-keys.service';

/**
 * Interceptor that logs detailed usage for every public API request.
 * Runs after the response is sent (fire-and-forget).
 */
@Injectable()
export class UsageLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(UsageLoggingInterceptor.name);

  constructor(private readonly apiKeysService: ApiKeysService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.log(request, response, start),
        error: () => this.log(request, response, start),
      }),
    );
  }

  private log(req: Request, res: Response, start: number) {
    const apiKey = (req as any).apiKey;
    if (!apiKey) return;

    const responseTimeMs = Date.now() - start;

    this.apiKeysService
      .logUsage({
        apiKeyId: apiKey.id,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTimeMs,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      })
      .catch((err) => {
        this.logger.warn(`Failed to log usage: ${err.message}`);
      });
  }
}
