import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../users/user-role.enum.js';
import { CoursesService } from './courses.service';

describe('CoursesService', () => {
  let service: CoursesService;
  const coursesRepository = {
    findAndCount: vi.fn(),
    findOneBy: vi.fn(),
    create: vi.fn((course) => course),
    save: vi.fn(async (course) => course),
    remove: vi.fn(async (course) => course),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CoursesService(coursesRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('filters, sorts, paginates, and returns collection metadata', async () => {
    const items = [{ id: 6, title: 'Testing NestJS', level: 'beginner' }];
    coursesRepository.findAndCount.mockResolvedValue([items, 11]);

    const result = await service.findAll({
      level: 'beginner',
      page: 2,
      limit: 5,
      sortBy: 'title',
      order: 'ASC',
    });

    expect(coursesRepository.findAndCount).toHaveBeenCalledWith({
      where: { level: 'beginner' },
      order: { title: 'ASC', id: 'ASC' },
      skip: 5,
      take: 5,
    });
    expect(result).toEqual({
      items,
      meta: { total: 11, page: 2, limit: 5, totalPages: 3 },
    });
  });

  it('returns consecutive pages without repeating courses', async () => {
    const courses = [
      { id: 1, title: 'Course 1', level: 'beginner' },
      { id: 2, title: 'Course 2', level: 'beginner' },
      { id: 3, title: 'Course 3', level: 'beginner' },
      { id: 4, title: 'Course 4', level: 'beginner' },
    ];
    coursesRepository.findAndCount.mockImplementation(({ skip, take }) => [
      courses.slice(skip, skip + take),
      courses.length,
    ]);

    const firstPage = await service.findAll({
      page: 1,
      limit: 2,
      sortBy: 'id',
      order: 'ASC',
    });
    const secondPage = await service.findAll({
      page: 2,
      limit: 2,
      sortBy: 'id',
      order: 'ASC',
    });

    expect(firstPage.items.map((course) => course.id)).toEqual([1, 2]);
    expect(secondPage.items.map((course) => course.id)).toEqual([3, 4]);
    expect(coursesRepository.findAndCount).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ skip: 0, take: 2 }),
    );
    expect(coursesRepository.findAndCount).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ skip: 2, take: 2 }),
    );
  });

  it('records the authenticated creator when creating a course', async () => {
    const actor = {
      id: 7,
      email: 'teacher@example.test',
      role: UserRole.TEACHER,
    };
    const dto = { title: 'NestJS', level: 'beginner' };

    await service.create(dto, actor);

    expect(coursesRepository.create).toHaveBeenCalledWith({
      ...dto,
      createdByUserId: actor.id,
    });
    expect(coursesRepository.save).toHaveBeenCalledOnce();
  });

  it('allows a teacher to update their own course', async () => {
    const course = {
      id: 3,
      title: 'Original',
      level: 'beginner',
      createdByUserId: 7,
    };
    coursesRepository.findOneBy.mockResolvedValue(course);

    const result = await service.update(
      3,
      { title: 'Updated' },
      {
        id: 7,
        email: 'teacher@example.test',
        role: UserRole.TEACHER,
      },
    );

    expect(result.title).toBe('Updated');
    expect(coursesRepository.save).toHaveBeenCalledWith(course);
  });

  it('rejects a teacher who does not own the course', async () => {
    coursesRepository.findOneBy.mockResolvedValue({
      id: 3,
      title: 'Original',
      level: 'beginner',
      createdByUserId: 7,
    });

    await expect(
      service.update(
        3,
        { title: 'Updated' },
        {
          id: 8,
          email: 'other-teacher@example.test',
          role: UserRole.TEACHER,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(coursesRepository.save).not.toHaveBeenCalled();
  });

  it('rejects students even when they own the course', async () => {
    coursesRepository.findOneBy.mockResolvedValue({
      id: 3,
      title: 'Original',
      level: 'beginner',
      createdByUserId: 7,
    });

    await expect(
      service.update(
        3,
        { title: 'Updated' },
        {
          id: 7,
          email: 'student@example.test',
          role: UserRole.STUDENT,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(coursesRepository.save).not.toHaveBeenCalled();
  });

  it('allows admins to update courses owned by other users', async () => {
    const course = {
      id: 3,
      title: 'Original',
      level: 'beginner',
      createdByUserId: 7,
    };
    coursesRepository.findOneBy.mockResolvedValue(course);

    await service.update(
      3,
      { title: 'Admin update' },
      {
        id: 1,
        email: 'admin@example.test',
        role: UserRole.ADMIN,
      },
    );

    expect(coursesRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Admin update' }),
    );
  });
});
