import { SetMetadata } from '@nestjs/common';
import type { ApiKeyScope } from '../../../entities/api-key.entity';

export const SCOPES_KEY = 'api_key_scopes';

/**
 * Decorator to specify which API key scopes are required for an endpoint.
 *
 * @example
 * ```ts
 * @Scopes('ask')
 * @Post()
 * async ask() { ... }
 * ```
 */
export const Scopes = (...scopes: ApiKeyScope[]) =>
  SetMetadata(SCOPES_KEY, scopes);
