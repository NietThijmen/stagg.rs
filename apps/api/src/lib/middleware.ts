import { createMiddleware } from 'hono/factory';
import type { AppDeps, AppEnv } from '../types.js';
import { parseBearer } from './auth.js';
import { unauthorized } from './errors.js';

export function createAuthMiddleware(deps: AppDeps) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const token = parseBearer(c.req.header('authorization'));
    if (!token) {
      throw unauthorized('Missing bearer token');
    }

    const principal = await deps.authenticate(token);
    if (!principal) {
      throw unauthorized('Invalid or expired token');
    }

    c.set('principal', principal);
    await next();
  });
}
