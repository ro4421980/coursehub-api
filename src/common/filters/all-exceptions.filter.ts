import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { ApplicationError } from '../errors/application.error.js';
import type { RequestWithId } from '../types/request-with-id.type.js';

/**
 * Application error codes are translated to HTTP only here, keeping the
 * business layer free of framework concerns.
 */
const APPLICATION_ERROR_STATUS: Readonly<Record<string, number>> = {
  COURSE_NOT_FOUND: HttpStatus.NOT_FOUND,
  COURSE_ACCESS_DENIED: HttpStatus.FORBIDDEN,
};

type ErrorBody = {
  statusCode: number;
  error: string;
  message: string | string[];
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<RequestWithId>();
    const requestId = request.requestId ?? randomUUID();
    const body = this.describe(exception);

    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // The trace is useful on the server, but it is never returned to the
      // client. This is the only place where the internal error is inspected.
      this.logger.error(
        `Unhandled error on ${request.method} ${request.path} [${requestId}]`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (!response.headersSent) {
      response.setHeader('x-request-id', requestId);
    }

    response.status(body.statusCode).json({
      statusCode: body.statusCode,
      error: body.error,
      message: body.message,
      path: request.path,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }

  private describe(exception: unknown): ErrorBody {
    if (exception instanceof ApplicationError) {
      const status = APPLICATION_ERROR_STATUS[exception.code];

      if (status === undefined) {
        return this.internalError();
      }

      return {
        statusCode: status,
        error: statusLabel(status),
        message: exception.message,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      // A 5xx message can contain database details, file paths or internal
      // identifiers. Clients always receive a generic message.
      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        return {
          statusCode: status,
          error: statusLabel(status),
          message: 'Internal server error',
        };
      }

      return this.fromHttpException(exception, status);
    }

    return this.internalError();
  }

  private fromHttpException(
    exception: HttpException,
    status: number,
  ): ErrorBody {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return {
        statusCode: status,
        error: statusLabel(status),
        message: response,
      };
    }

    const body = response as {
      message?: string | string[];
      error?: string;
    };

    return {
      statusCode: status,
      error: body.error ?? statusLabel(status),
      message: body.message ?? exception.message,
    };
  }

  private internalError(): ErrorBody {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: statusLabel(HttpStatus.INTERNAL_SERVER_ERROR),
      message: 'Internal server error',
    };
  }
}

function statusLabel(status: number): string {
  const name = HttpStatus[status];

  if (typeof name !== 'string') {
    return 'Error';
  }

  return name
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
