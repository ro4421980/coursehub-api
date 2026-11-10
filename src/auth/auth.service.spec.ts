import { compare, getRounds, hash } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import { UserRole } from '../users/user-role.enum.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  const jwtService = {
    signAsync: vi.fn(),
  };
  const usersService = {
    create: vi.fn(),
    findByEmailForLogin: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    jwtService.signAsync.mockResolvedValue('signed-access-token');
    service = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
    );
  });

  it('hashes the original password before persisting and returns a safe result', async () => {
    const dto = {
      email: 'user@example.test',
      password: '  secure-password  ',
    };
    usersService.create.mockImplementation(async () => ({
      id: 1,
      email: dto.email,
      role: UserRole.STUDENT,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }));

    const result = await service.register(dto);
    const passwordHash = usersService.create.mock.calls[0][1] as string;

    expect(usersService.create).toHaveBeenCalledWith(
      dto.email,
      expect.any(String),
    );
    await expect(compare(dto.password, passwordHash)).resolves.toBe(true);
    expect(getRounds(passwordHash)).toBe(12);
    expect(result).toEqual({
      id: 1,
      email: dto.email,
      role: UserRole.STUDENT,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(result).not.toHaveProperty('password');
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('authenticates a valid password and returns a safe user', async () => {
    const passwordHash = await hash('secure-password', 4);
    const user = {
      id: 2,
      email: 'user@example.test',
      role: UserRole.TEACHER,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      passwordHash,
    };
    usersService.findByEmailForLogin.mockResolvedValue(user);

    const result = await service.login({
      email: user.email,
      password: 'secure-password',
    });

    expect(result).toEqual({
      accessToken: 'signed-access-token',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).not.toHaveProperty('password');
  });

  it('returns the same unauthorized error for a wrong password and missing user', async () => {
    const passwordHash = await hash('secure-password', 4);
    usersService.findByEmailForLogin
      .mockResolvedValueOnce({
        id: 2,
        email: 'user@example.test',
        passwordHash,
      })
      .mockResolvedValueOnce(null);

    await expect(
      service.login({
        email: 'user@example.test',
        password: 'incorrect-password',
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Invalid credentials',
    });
    await expect(
      service.login({
        email: 'unknown@example.test',
        password: 'incorrect-password',
      }),
    ).rejects.toMatchObject({
      status: 401,
      message: 'Invalid credentials',
    });
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});
