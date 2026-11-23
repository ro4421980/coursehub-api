import type { Course, NewCourse } from '../../domain/course.js';
import type {
  CoursePage,
  CoursePageQuery,
  CourseRepository,
} from '../ports/course.repository.js';
import { ListCoursesUseCase } from './list-courses.use-case.js';

class StubCourseRepository implements CourseRepository {
  findPage = vi.fn<(query: CoursePageQuery) => Promise<CoursePage>>();

  async findById(): Promise<Course | null> {
    return null;
  }

  async create(course: NewCourse): Promise<Course> {
    return { id: 1, ...course };
  }

  async save(course: Course): Promise<Course> {
    return course;
  }

  async delete(): Promise<void> {}
}

describe('ListCoursesUseCase', () => {
  it('maps filters, sorting and pagination to the repository port', async () => {
    const repository = new StubCourseRepository();
    const items = [{ id: 6, title: 'Testing NestJS', level: 'beginner' }];
    repository.findPage.mockResolvedValue({ items, total: 11 });
    const useCase = new ListCoursesUseCase(repository);

    const result = await useCase.execute({
      level: 'beginner',
      page: 2,
      limit: 5,
      sortBy: 'title',
      order: 'ASC',
    });

    expect(repository.findPage).toHaveBeenCalledWith({
      level: 'beginner',
      sortBy: 'title',
      order: 'ASC',
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
      { id: 1, title: 'Course 1', level: 'beginner', createdByUserId: 1 },
      { id: 2, title: 'Course 2', level: 'beginner', createdByUserId: 1 },
      { id: 3, title: 'Course 3', level: 'beginner', createdByUserId: 1 },
      { id: 4, title: 'Course 4', level: 'beginner', createdByUserId: 1 },
    ];
    const repository = new StubCourseRepository();
    repository.findPage.mockImplementation(async ({ skip, take }) => ({
      items: courses.slice(skip, skip + take),
      total: courses.length,
    }));
    const useCase = new ListCoursesUseCase(repository);

    const firstPage = await useCase.execute({
      page: 1,
      limit: 2,
      sortBy: 'id',
      order: 'ASC',
    });
    const secondPage = await useCase.execute({
      page: 2,
      limit: 2,
      sortBy: 'id',
      order: 'ASC',
    });

    expect(firstPage.items.map((course) => course.id)).toEqual([1, 2]);
    expect(secondPage.items.map((course) => course.id)).toEqual([3, 4]);
  });
});
