import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EnrollmentsQueryDto } from './enrollments-query.dto.js';

describe('EnrollmentsQueryDto', () => {
  it('defaults to the first page', async () => {
    const query = plainToInstance(EnrollmentsQueryDto, {});

    expect(query).toMatchObject({ page: 1, limit: 10 });
    expect(await validate(query)).toHaveLength(0);
  });

  it.each([
    [{ page: '0' }, 'page'],
    [{ limit: '200' }, 'limit'],
    [{ studentId: '0' }, 'studentId'],
    [{ activeOnly: 'yes' }, 'activeOnly'],
  ])('rejects invalid query values: %o', async (params, property) => {
    const query = plainToInstance(EnrollmentsQueryDto, params);
    const errors = await validate(query);

    expect(errors.map((error) => error.property)).toContain(property);
  });
});
