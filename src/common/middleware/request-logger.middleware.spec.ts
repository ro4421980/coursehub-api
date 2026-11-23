import { Logger } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { RequestWithId } from '../types/request-with-id.type.js';
import { RequestLoggerMiddleware } from './request-logger.middleware.js';

function createResponse() {
  const on = vi.fn();
  const setHeader = vi.fn();
  const response = {
    statusCode: 201,
    on,
    setHeader,
  } as unknown as Response;

  return {
    response,
    setHeader,
    emitFinish: () => {
      const finishCall = on.mock.calls.find(([event]) => event === 'finish');
      (finishCall?.[1] as (() => void) | undefined)?.();
    },
  };
}

function createRequest(overrides: Partial<RequestWithId> = {}): RequestWithId {
  return {
    method: 'POST',
    path: '/auth/login',
    headers: {
      authorization: 'Bearer super-secret-token',
      'x-request-id': 'request-123',
    },
    body: {
      email: 'persona@example.test',
      password: 'super-secret-password',
    },
    ...overrides,
  } as unknown as RequestWithId;
}

describe('RequestLoggerMiddleware', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs metadata without body, headers, query string or secrets', () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    const { response, setHeader, emitFinish } = createResponse();
    const request = createRequest();
    const next = vi.fn<NextFunction>();

    new RequestLoggerMiddleware().use(request, response, next);
    emitFinish();

    expect(next).toHaveBeenCalledOnce();
    expect(setHeader).toHaveBeenCalledWith('x-request-id', 'request-123');
    expect(log).toHaveBeenCalledOnce();

    const payload = String(log.mock.calls[0][0]);
    expect(payload).not.toContain('super-secret-token');
    expect(payload).not.toContain('super-secret-password');
    expect(payload).not.toContain('authorization');
    expect(payload).not.toContain('password');
    expect(payload).not.toContain('persona@example.test');
    expect(JSON.parse(payload)).toMatchObject({
      event: 'http_request',
      requestId: 'request-123',
      method: 'POST',
      path: '/auth/login',
      statusCode: 201,
    });
  });

  it('does not log the query string', () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    const { response, emitFinish } = createResponse();
    const request = createRequest({
      path: '/courses',
      originalUrl: '/courses?access_token=super-secret-token',
    });

    new RequestLoggerMiddleware().use(request, response, vi.fn<NextFunction>());
    emitFinish();

    const payload = String(log.mock.calls[0][0]);
    expect(payload).toContain('"/courses"');
    expect(payload).not.toContain('access_token');
  });

  it('generates a safe request id when the header is missing or invalid', () => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    const { response, setHeader } = createResponse();
    const request = createRequest({
      headers: { 'x-request-id': 'invalid id with spaces' },
    });

    new RequestLoggerMiddleware().use(request, response, vi.fn<NextFunction>());

    expect(setHeader).toHaveBeenCalledWith(
      'x-request-id',
      expect.stringMatching(/^[0-9a-f-]{36}$/),
    );
    expect(request.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
