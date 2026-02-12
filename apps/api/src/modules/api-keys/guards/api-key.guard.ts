import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ApiKeysService } from '../api-keys.service';
import { SCOPES_KEY } from '../decorators/scopes.decorator';
import type { ApiKeyScope } from '../../../entities/api-key.entity';
import type { ApiKey } from '../../../entities/api-key.entity';

/** Extend Express Request to carry the validated API key */
declare module 'express' {
  interface Request {
    apiKey?: ApiKey;
  }
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawKey =
      request.headers['x-api-key'] as string | undefined;

    if (!rawKey) {
      throw new UnauthorizedException(
        'Missing API key. Provide it via the X-API-Key header.',
      );
    }

    // Validate the key
    const apiKey = await this.apiKeysService.validateKey(rawKey);
    if (!apiKey) {
      throw new UnauthorizedException(
        'Invalid or expired API key.',
      );
    }

    // Check required scopes
    const requiredScopes = this.reflector.getAllAndOverride<
      ApiKeyScope[] | undefined
    >(SCOPES_KEY, [context.getHandler(), context.getClass()]);

    if (requiredScopes && requiredScopes.length > 0) {
      for (const scope of requiredScopes) {
        if (!this.apiKeysService.hasScope(apiKey, scope)) {
          throw new ForbiddenException(
            `API key missing required scope: "${scope}"`,
          );
        }
      }
    }

    // Attach key to request for downstream use (rate limiter, usage logging)
    request.apiKey = apiKey;

    // Fire-and-forget: increment usage counter
    this.apiKeysService.recordUsage(apiKey.id).catch((err) => {
      this.logger.warn(`Failed to record usage for key ${apiKey.id}: ${err.message}`);
    });

    return true;
  }
}
