import { CoursesService } from './courses.service';

describe('CoursesService', () => {
  let service: CoursesService;
  const coursesRepository = {
    findAndCount: vi.fn(),
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
});
