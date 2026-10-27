import {
  ConflictException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AccessTokenGuard } from './access-token.guard.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  const jwtSecret = 'test-secret-with-at-least-32-characters';
  let app: INestApplication;
  const authService = {
    register: vi.fn(),
    login: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    authService.register.mockResolvedValue({
      id: 1,
      email: 'prueba@correo.com',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    authService.login.mockResolvedValue({
      accessToken: 'signed-access-token',
      user: {
        id: 1,
        email: 'prueba@correo.com',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });

    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: jwtSecret })],
      controllers: [AuthController],
      providers: [
        AccessTokenGuard,
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('accepts JSON registration and returns only safe account fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: ' Prueba@Correo.com ', password: 'clave123' })
      .expect(201);

    expect(authService.register).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'prueba@correo.com',
        password: 'clave123',
      }),
    );
    expect(response.body).toEqual({
      id: 1,
      email: 'prueba@correo.com',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('password');
  });

  it('rejects malformed email and short password before calling the service', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email', password: 'clave123' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'prueba@correo.com', password: '1234567' })
      .expect(400);

    expect(authService.register).not.toHaveBeenCalled();
  });

  it('returns 409 when the service reports a duplicate email', async () => {
    authService.register.mockRejectedValue(
      new ConflictException('Email already exists'),
    );

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'prueba@correo.com', password: 'clave123' })
      .expect(409);
  });

  it('returns 200 for a valid login without exposing password data', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'PRUEBA@CORREO.COM', password: 'clave123' })
      .expect(200);

    expect(authService.login).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'prueba@correo.com',
        password: 'clave123',
      }),
    );
    expect(response.body).toEqual({
      accessToken: 'signed-access-token',
      user: {
        id: 1,
        email: 'prueba@correo.com',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(response.body.user).not.toHaveProperty('password');
  });

  it('rejects a malformed login email before calling the service', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'not-an-email', password: 'clave123' })
      .expect(400);

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('rejects an email longer than the database limit before login lookup', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: `${'a'.repeat(140)}@example.test`,
        password: 'clave123',
      })
      .expect(400);

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('rejects a short login password before calling the service', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'prueba@correo.com', password: '1234567' })
      .expect(400);

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('returns the same 401 response for a wrong password and unknown email', async () => {
    authService.login.mockRejectedValue(
      new UnauthorizedException('Invalid credentials'),
    );

    const wrongPasswordResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'prueba@correo.com', password: 'clave123' })
      .expect(401);
    const unknownEmailResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'desconocido@correo.com', password: 'clave123' })
      .expect(401);

    expect(wrongPasswordResponse.body).toEqual({
      statusCode: 401,
      message: 'Invalid credentials',
      error: 'Unauthorized',
    });
    expect(unknownEmailResponse.body).toEqual(wrongPasswordResponse.body);
  });

  it('returns 401 for /auth/me without an authorization header', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('returns 401 for /auth/me with a tampered access token', async () => {
    const jwtService = app.get(JwtService);
    const token = await jwtService.signAsync({
      sub: 1,
      email: 'prueba@correo.com',
    });
    const [header, payload, signature] = token.split('.');
    const tamperedToken = `${header}.${payload}.${signature[0] === 'a' ? 'b' : 'a'}${signature.slice(1)}`;

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${tamperedToken}`)
      .expect(401);
  });

  it('returns the verified identity for /auth/me with a valid access token', async () => {
    const jwtService = app.get(JwtService);
    const token = await jwtService.signAsync({
      sub: 1,
      email: 'prueba@correo.com',
    });

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      id: 1,
      email: 'prueba@correo.com',
    });
  });
});
