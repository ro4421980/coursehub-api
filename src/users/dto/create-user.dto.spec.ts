import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from '../../auth/dto/login.dto.js';
import { CreateUserDto } from './create-user.dto.js';

describe('CreateUserDto', () => {
  it('normalizes email without altering the password', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: '  User@Example.Test ',
      password: '  secure-password  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.email).toBe('user@example.test');
    expect(dto.password).toBe('  secure-password  ');
  });

  it('rejects a malformed email', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'not-an-email',
      password: 'secure-password',
    });

    const errors = await validate(dto);

    expect(errors.map(({ property }) => property)).toContain('email');
  });

  it('rejects email addresses longer than the database column limit', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: `${'a'.repeat(140)}@example.test`,
      password: 'secure-password',
    });

    const errors = await validate(dto);

    expect(errors.map(({ property }) => property)).toContain('email');
  });

  it('rejects passwords that are too short or exceed bcrypt byte limits', async () => {
    const tooShort = plainToInstance(CreateUserDto, {
      email: 'user@example.test',
      password: 'short',
    });
    const tooLong = plainToInstance(CreateUserDto, {
      email: 'user@example.test',
      password: 'a'.repeat(73),
    });

    const [shortErrors, longErrors] = await Promise.all([
      validate(tooShort),
      validate(tooLong),
    ]);

    expect(shortErrors.map(({ property }) => property)).toContain('password');
    expect(longErrors.map(({ property }) => property)).toContain('password');
  });

  it('rejects malformed email and short password in login DTOs', async () => {
    const invalidEmail = plainToInstance(LoginDto, {
      email: 'not-an-email',
      password: 'valid-password',
    });
    const shortPassword = plainToInstance(LoginDto, {
      email: 'user@example.test',
      password: 'short',
    });

    const [emailErrors, passwordErrors] = await Promise.all([
      validate(invalidEmail),
      validate(shortPassword),
    ]);

    expect(emailErrors.map(({ property }) => property)).toContain('email');
    expect(passwordErrors.map(({ property }) => property)).toContain(
      'password',
    );
  });
});
