import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import type { JwtPayload } from './types/jwt-payload.type.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    createUserDto: CreateUserDto,
  ): Promise<Pick<User, 'id' | 'email' | 'createdAt'>> {
    const passwordHash = await hash(createUserDto.password, 12);
    return this.usersService.create(createUserDto.email, passwordHash);
  }

  async login(loginDto: LoginDto): Promise<{
    accessToken: string;
    user: Pick<User, 'id' | 'email' | 'createdAt'>;
  }> {
    const user = await this.validateCredentials(
      loginDto.email,
      loginDto.password,
    );
    const payload: JwtPayload = { sub: user.id, email: user.email };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user,
    };
  }

  private async validateCredentials(
    email: string,
    password: string,
  ): Promise<Pick<User, 'id' | 'email' | 'createdAt'>> {
    const user = await this.usersService.findByEmailForLogin(email);
    const passwordMatches = user
      ? await compare(password, user.passwordHash)
      : false;

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    };
  }
}
