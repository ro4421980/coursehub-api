import type { Request } from 'express';

/**
 * Express request enriched by RequestLoggerMiddleware.
 */
export type RequestWithId = Request & {
  requestId?: string;
};
