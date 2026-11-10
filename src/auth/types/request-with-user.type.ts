import type { Request } from 'express';
import type { AuthenticatedUser } from './jwt-payload.type.js';

export type RequestWithUser = Request & {
  user: AuthenticatedUser;
};
