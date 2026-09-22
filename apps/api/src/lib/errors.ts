import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export class ApiError extends HTTPException {
  readonly code: string;

  constructor(status: ContentfulStatusCode, code: string, message: string) {
    super(status, { message });
    this.code = code;
  }
}

export const unauthorized = (message = 'Authentication required') =>
  new ApiError(401, 'unauthorized', message);

export const forbidden = (message = 'Insufficient permissions') =>
  new ApiError(403, 'forbidden', message);

export const notFound = (message = 'Resource not found') =>
  new ApiError(404, 'not_found', message);

export const conflict = (message = 'Resource already exists') =>
  new ApiError(409, 'conflict', message);

export const badRequest = (message = 'Invalid request') =>
  new ApiError(400, 'bad_request', message);
