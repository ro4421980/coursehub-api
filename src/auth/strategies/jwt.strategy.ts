import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '../../users/user-role.enum.js';
import type { AuthenticatedUser } from '../types/jwt-payload.type.js';

type JwtClaims = {
  sub?: unknown;
  email?: unknown;
  role?: unknown;
};

function isUserRole(role: unknown): role is UserRole {
  return (
    typeof role === 'string' &&
    Object.values(UserRole).some((value) => value === role)
  );
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtClaims): AuthenticatedUser {
    if (
      typeof payload.sub !== 'number' ||
      !Number.isInteger(payload.sub) ||
      typeof payload.email !== 'string' ||
      !isUserRole(payload.role)
    ) {
      throw new UnauthorizedException('Invalid access token');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
