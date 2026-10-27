import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import {
  createTypeOrmOptions,
  environmentValidationSchema,
} from './database.config.js';

describe('database configuration', () => {
  const databaseEnvironment = {
    DB_HOST: 'localhost',
    DB_PORT: 5432,
    DB_NAME: 'coursehub',
    DB_USER: 'postgres',
    DB_PASSWORD: 'test-only-password',
  };

  it.each([
    ['development', true],
    ['production', false],
    ['test', false],
  ] as const)(
    'sets synchronize=$expected for NODE_ENV=$nodeEnv',
    (nodeEnv, expected) => {
      const config = new ConfigService({
        ...databaseEnvironment,
        NODE_ENV: nodeEnv,
      });

      expect(createTypeOrmOptions(config)).toMatchObject({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        autoLoadEntities: true,
        synchronize: expected,
      });
    },
  );

  it('converts validated string database ports to numbers', () => {
    const config = new ConfigService({
      ...databaseEnvironment,
      DB_PORT: '5432',
      NODE_ENV: 'development',
    });

    const options = createTypeOrmOptions(config);
    expect('port' in options ? options.port : undefined).toBe(5432);
  });

  it('requires all database connection variables', () => {
    const { error } = environmentValidationSchema.validate({
      NODE_ENV: 'production',
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_USER: 'postgres',
    });

    expect(error?.details.map(({ path }) => path[0])).toEqual(
      expect.arrayContaining(['DB_NAME', 'DB_PASSWORD']),
    );
  });

  it('simulates production from a temporary development env copy without connecting', () => {
    const directory = mkdtempSync(join(tmpdir(), 'coursehub-config-'));
    const developmentFile = join(directory, '.env');
    const productionFile = join(directory, '.env.production');
    const developmentValues = {
      NODE_ENV: 'development',
      PORT: '3000',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_NAME: 'coursehub_test',
      DB_USER: 'test_user',
      DB_PASSWORD: 'test_only_placeholder',
      JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
      JWT_EXPIRES_IN: '15m',
    };
    const developmentText = Object.entries(developmentValues)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    writeFileSync(developmentFile, developmentText);

    try {
      writeFileSync(
        productionFile,
        readFileSync(developmentFile, 'utf8').replace(
          'NODE_ENV=development',
          'NODE_ENV=production',
        ),
      );
      const productionValues = Object.fromEntries(
        readFileSync(productionFile, 'utf8')
          .split(/\r?\n/)
          .map((line) => {
            const separator = line.indexOf('=');
            return [line.slice(0, separator), line.slice(separator + 1)];
          }),
      );
      const { value, error } =
        environmentValidationSchema.validate(productionValues);

      expect(error).toBeUndefined();
      expect(createTypeOrmOptions(new ConfigService(value)).synchronize).toBe(
        false,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
