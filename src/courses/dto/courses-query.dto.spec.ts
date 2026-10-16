import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CoursesQueryDto } from './courses-query.dto.js';

describe('CoursesQueryDto', () => {
  it('uses first-page defaults when no query parameters are provided', async () => {
    const query = plainToInstance(CoursesQueryDto, {});

    expect(query).toMatchObject({
      page: 1,
      limit: 10,
      sortBy: 'id',
      order: 'ASC',
    });
    expect(await validate(query)).toHaveLength(0);
  });

  it.each([
    [{ page: '0' }, 'page'],
    [{ limit: '200' }, 'limit'],
    [{ sortBy: 'createdAt' }, 'sortBy'],
  ])('rejects invalid query values: %o', async (params, property) => {
    const query = plainToInstance(CoursesQueryDto, params);
    const errors = await validate(query);

    expect(errors.map((error) => error.property)).toContain(property);
  });
});
