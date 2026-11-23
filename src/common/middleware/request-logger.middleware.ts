import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { RequestWithId } from '../types/request-with-id.type.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const MAX_LOGGED_PATH_LENGTH = 512;


@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  use(request: RequestWithId, response: Response, next: NextFunction): void {
    const startedAt = Date.now();
    const requestId = this.resolveRequestId(request);

    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    response.on('finish', () => {
      this.logger.log(
        JSON.stringify({
          event: 'http_request',
          requestId,
          method: request.method,
          path: this.safePath(request),
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
        }),
      );
    });

    next();
  }

  private resolveRequestId(request: RequestWithId): string {
    const header = request.headers['x-request-id'];
    const candidate = Array.isArray(header) ? header[0] : header;

    return candidate && REQUEST_ID_PATTERN.test(candidate)
      ? candidate
      : randomUUID();
  }

  private safePath(request: Request): string {
    // Express `path` excludes the query string. Query values can contain
    // tokens or personal data, so they must not be logged.
    return (request.path || '/').slice(0, MAX_LOGGED_PATH_LENGTH);
  }
}
