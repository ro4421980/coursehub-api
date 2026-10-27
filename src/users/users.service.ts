import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmailForLogin(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.trim().toLowerCase() })
      .getOne();
  }

  async create(
    email: string,
    passwordHash: string,
  ): Promise<Pick<User, 'id' | 'email' | 'createdAt'>> {
    email = email.trim().toLowerCase();
    const emailExists = await this.usersRepository.findOneBy({ email });
    if (emailExists) {
      throw new ConflictException(
        `El correo "${email}" ya se encuentra registrado`,
      );
    }

    const user = this.usersRepository.create({
      email,
      passwordHash,
    });

    try {
      const savedUser = await this.usersRepository.save(user);
      return {
        id: savedUser.id,
        email: savedUser.email,
        createdAt: savedUser.createdAt,
      };
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException(
          `El correo "${email}" ya se encuentra registrado`,
        );
      }
      throw error;
    }
  }
}
