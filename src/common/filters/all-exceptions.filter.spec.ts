import {
  ArgumentsHost,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  CourseAccessDeniedError,
  CourseNotFoundError,
} from '../../courses/domain/course.errors.js';
import type { RequestWithId } from '../types/request-with-id.type.js';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

function createHost(requestOverrides: Partial<RequestWithId> = {}) {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const setHeader = vi.fn();
  const response = {
    status,
    setHeader,
    headersSent: false,
  } as unknown as Response;
  const request = {
    method: 'PATCH',
    path: '/courses/abc',
    requestId: 'request-123',
    ...requestOverrides,
  } as RequestWithId;
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json, setHeader };
}

describe('AllExceptionsFilter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the same shape for validation errors', () => {
    const { host, status, json } = createHost();

    new AllExceptionsFilter().catch(
      new BadRequestException(['title should not be empty']),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      error: 'Bad Request',
      message: ['title should not be empty'],
      path: '/courses/abc',
      timestamp: expect.any(String),
      requestId: 'request-123',
    });
  });

  it('returns the same shape for not-found errors', () => {
    const { host, status, json } = createHost();

    new AllExceptionsFilter().catch(
      new NotFoundException('Course 999 not found'),
      host,
    );

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        error: 'Not Found',
        message: 'Course 999 not found',
        path: '/courses/abc',
        requestId: 'request-123',
      }),
    );
  });

  it('translates business errors without importing HTTP in the use case', () => {
    const notFound = createHost();
    new AllExceptionsFilter().catch(
      new CourseNotFoundError(999),
      notFound.host,
    );
    expect(notFound.status).toHaveBeenCalledWith(404);
    expect(notFound.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        error: 'Not Found',
        message: 'Course 999 not found',
      }),
    );

    const denied = createHost();
    new AllExceptionsFilter().catch(new CourseAccessDeniedError(), denied.host);
    expect(denied.status).toHaveBeenCalledWith(403);
    expect(denied.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        error: 'Forbidden',
        message: 'You can only update your own courses',
      }),
    );
  });

  it('does not expose internal traces for unexpected errors', () => {
    const errorLog = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    const { host, status, json } = createHost();

    new AllExceptionsFilter().catch(
      new Error('connect ECONNREFUSED password=super-secret'),
      host,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal server error',
      path: '/courses/abc',
      timestamp: expect.any(String),
      requestId: 'request-123',
    });

    const body = JSON.stringify(json.mock.calls[0][0]);
    expect(body).not.toContain('ECONNREFUSED');
    expect(body).not.toContain('super-secret');
    expect(body).not.toContain('stack');
    expect(errorLog).toHaveBeenCalledOnce();
  });

  it('hides the message of explicit 5xx HTTP exceptions', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const { host, json } = createHost();

    new AllExceptionsFilter().catch(
      new InternalServerErrorException('database password=super-secret'),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
    expect(JSON.stringify(json.mock.calls[0][0])).not.toContain('super-secret');
  });
});
