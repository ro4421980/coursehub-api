import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import { UserRole } from './user-role.enum.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;
  const usersRepository = {
    findOneBy: vi.fn(),
    createQueryBuilder: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsersService(usersRepository as unknown as Repository<User>);
  });

  it('rejects an email that already exists', async () => {
    usersRepository.findOneBy.mockResolvedValue({ id: 1 } as User);

    await expect(
      service.create(' USER@EXAMPLE.TEST ', 'bcrypt-hash'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(usersRepository.save).not.toHaveBeenCalled();
  });

  it('normalizes the email before checking and persisting a new account', async () => {
    usersRepository.findOneBy.mockResolvedValue(null);
    usersRepository.create.mockImplementation((user) => user);
    usersRepository.save.mockImplementation(async (user) => ({
      ...user,
      id: 1,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }));

    const result = await service.create(' USER@EXAMPLE.TEST ', 'bcrypt-hash');

    expect(usersRepository.findOneBy).toHaveBeenCalledWith({
      email: 'user@example.test',
    });
    expect(usersRepository.create).toHaveBeenCalledWith({
      email: 'user@example.test',
      passwordHash: 'bcrypt-hash',
      role: UserRole.STUDENT,
    });
    expect(result).toEqual({
      id: 1,
      email: 'user@example.test',
      role: UserRole.STUDENT,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('explicitly selects the password hash only for login lookup', async () => {
    const queryBuilder = {
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue({ id: 1 } as User),
    };
    usersRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await service.findByEmailForLogin(' USER@EXAMPLE.TEST ');

    expect(usersRepository.createQueryBuilder).toHaveBeenCalledWith('user');
    expect(queryBuilder.addSelect).toHaveBeenCalledWith('user.passwordHash');
    expect(queryBuilder.where).toHaveBeenCalledWith('user.email = :email', {
      email: 'user@example.test',
    });
  });

  it('translates a concurrent unique-email conflict', async () => {
    usersRepository.findOneBy.mockResolvedValue(null);
    usersRepository.create.mockImplementation((user) => user);
    usersRepository.save.mockRejectedValue({ code: '23505' });

    await expect(
      service.create('user@example.test', 'bcrypt-hash'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
