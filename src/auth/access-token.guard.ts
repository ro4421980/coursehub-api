import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { JwtPayload } from './types/jwt-payload.type.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization?.trim();
    const tokenMatch = authorization?.match(/^Bearer\s+(\S+)$/i);

    if (!tokenMatch) {
      throw new UnauthorizedException('Invalid or missing access token');
    }

    let payload: unknown;
    try {
      payload =
        await this.jwtService.verifyAsync<Record<string, unknown>>(
          tokenMatch[1],
        );
    } catch {
      throw new UnauthorizedException('Invalid or missing access token');
    }

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('sub' in payload) ||
      typeof payload.sub !== 'number' ||
      !Number.isInteger(payload.sub) ||
      !('email' in payload) ||
      typeof payload.email !== 'string'
    ) {
      throw new UnauthorizedException('Invalid or missing access token');
    }

    request.user = { sub: payload.sub, email: payload.email };
    return true;
  }
}
