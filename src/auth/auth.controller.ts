import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { LoginDto } from './dto/login.dto.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { AuthService } from './auth.service.js';
import { AccessTokenGuard } from './access-token.guard.js';
import type { JwtPayload } from './types/jwt-payload.type.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  me(@Req() req: AuthenticatedRequest) {
    return { id: req.user.sub, email: req.user.email };
  }
}

