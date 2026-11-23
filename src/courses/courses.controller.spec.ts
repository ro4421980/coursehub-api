import type { AuthenticatedUser } from '../auth/types/jwt-payload.type.js';
import type { RequestWithUser } from '../auth/types/request-with-user.type.js';
import { UserRole } from '../users/user-role.enum.js';
import { CreateCourseUseCase } from './application/use-cases/create-course.use-case.js';
import { DeleteCourseUseCase } from './application/use-cases/delete-course.use-case.js';
import { GetCourseUseCase } from './application/use-cases/get-course.use-case.js';
import { ListCoursesUseCase } from './application/use-cases/list-courses.use-case.js';
import { UpdateCourseUseCase } from './application/use-cases/update-course.use-case.js';
import { CoursesController } from './courses.controller.js';
import type { Course } from './domain/course.js';
import type { CreateCourseDto } from './dto/create-courses.dto.js';
import type { CoursesQueryDto } from './dto/courses-query.dto.js';
import type { UpdateCourseDto } from './dto/update-course.dto.js';

const COURSE_ID = 5;

function authenticatedUser(
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    id: 7,
    email: 'teacher@example.test',
    role: UserRole.TEACHER,
    ...overrides,
  };
}

function requestWith(user: AuthenticatedUser): RequestWithUser {
  return { user } as RequestWithUser;
}

function createHarness() {
  const listCourses = { execute: vi.fn() };
  const getCourse = { execute: vi.fn() };
  const createCourse = { execute: vi.fn() };
  const updateCourse = { execute: vi.fn() };
  const deleteCourse = { execute: vi.fn() };

  const controller = new CoursesController(
    listCourses as unknown as ListCoursesUseCase,
    getCourse as unknown as GetCourseUseCase,
    createCourse as unknown as CreateCourseUseCase,
    updateCourse as unknown as UpdateCourseUseCase,
    deleteCourse as unknown as DeleteCourseUseCase,
  );

  return {
    controller,
    listCourses,
    getCourse,
    createCourse,
    updateCourse,
    deleteCourse,
  };
}

describe('CoursesController', () => {
  it('delegates the parsed route id to GetCourseUseCase', async () => {
    const { controller, getCourse } = createHarness();
    const course: Course = {
      id: 42,
      title: 'Arquitectura',
      level: 'advanced',
      createdByUserId: 7,
    };
    getCourse.execute.mockResolvedValue(course);

    await expect(controller.findOne(42)).resolves.toBe(course);
    expect(getCourse.execute).toHaveBeenCalledWith(42);
  });

  it('delegates the list query without rewriting it', async () => {
    const { controller, listCourses } = createHarness();
    const query = {
      level: 'beginner',
      page: 2,
      limit: 5,
      sortBy: 'title',
      order: 'ASC',
    } as CoursesQueryDto;
    listCourses.execute.mockResolvedValue({ items: [], meta: {} });

    await controller.findAll(query);

    expect(listCourses.execute).toHaveBeenCalledWith(query);
  });

  it('updates with the route id, the DTO and the authenticated actor', async () => {
    const { controller, updateCourse } = createHarness();
    const user = authenticatedUser();
    const body: UpdateCourseDto = {
      title: 'NestJS avanzado',
      level: 'advanced',
    };

    await controller.update(COURSE_ID, body, requestWith(user));

    expect(updateCourse.execute).toHaveBeenCalledWith({
      courseId: COURSE_ID,
      changes: { title: 'NestJS avanzado', level: 'advanced' },
      actor: user,
    });
  });

  it('does not let the body override identity or ownership on PATCH', async () => {
    const { controller, updateCourse } = createHarness();
    const user = authenticatedUser({ id: 7, role: UserRole.TEACHER });
    const body = {
      title: 'Título legítimo',
      id: 999,
      createdByUserId: 999,
      role: UserRole.ADMIN,
    } as unknown as UpdateCourseDto;

    await controller.update(COURSE_ID, body, requestWith(user));

    expect(updateCourse.execute).toHaveBeenCalledWith({
      courseId: COURSE_ID,
      changes: { title: 'Título legítimo' },
      actor: user,
    });
  });

  it('creates the course with the authenticated creator, not with body data', async () => {
    const { controller, createCourse } = createHarness();
    const user = authenticatedUser({ id: 7, role: UserRole.TEACHER });
    const body = {
      title: 'Nuevo curso',
      level: 'beginner',
      createdByUserId: 999,
    } as unknown as CreateCourseDto;

    await controller.create(body, requestWith(user));

    expect(createCourse.execute).toHaveBeenCalledWith({
      title: 'Nuevo curso',
      level: 'beginner',
      actor: user,
    });
  });

  it('delegates DELETE to the use case with the route id', async () => {
    const { controller, deleteCourse } = createHarness();

    await controller.remove(COURSE_ID);

    expect(deleteCourse.execute).toHaveBeenCalledWith(COURSE_ID);
  });
});
