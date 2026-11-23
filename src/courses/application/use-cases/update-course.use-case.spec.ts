import { UserRole } from '../../../users/user-role.enum.js';
import type { Course, CourseChanges, NewCourse } from '../../domain/course.js';
import {
  CourseAccessDeniedError,
  CourseNotFoundError,
} from '../../domain/course.errors.js';
import type { CourseRepository } from '../ports/course.repository.js';
import { UpdateCourseUseCase } from './update-course.use-case.js';

const COURSE_ID = 5;
const OWNER_ID = 2;

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: COURSE_ID,
    title: 'NestJS',
    level: 'beginner',
    createdByUserId: OWNER_ID,
    ...overrides,
  };
}

/**
 * Simulated repository: it implements the application port with an array.
 * There is no TypeORM, no SQL, no PostgreSQL and no network. Each test gets a
 * fresh instance, so the order of execution cannot affect the result.
 */
class InMemoryCourseRepository implements CourseRepository {
  constructor(private courses: Course[] = [makeCourse()]) {}

  async findPage() {
    return { items: [...this.courses], total: this.courses.length };
  }

  async findById(id: number): Promise<Course | null> {
    return this.courses.find((course) => course.id === id) ?? null;
  }

  async create(course: NewCourse): Promise<Course> {
    const created: Course = { id: this.courses.length + 1, ...course };
    this.courses.push(created);
    return created;
  }

  async save(course: Course): Promise<Course> {
    const index = this.courses.findIndex((item) => item.id === course.id);

    if (index < 0) {
      throw new Error(`Cannot save unknown course ${course.id}`);
    }

    this.courses[index] = course;
    return course;
  }

  async delete(id: number): Promise<void> {
    this.courses = this.courses.filter((course) => course.id !== id);
  }
}

function createHarness() {
  const repository = new InMemoryCourseRepository();
  const save = vi.spyOn(repository, 'save');

  return {
    repository,
    save,
    useCase: new UpdateCourseUseCase(repository),
  };
}

describe('UpdateCourseUseCase', () => {
  it('updates and persists the course when the teacher owns it', async () => {
    const { repository, save, useCase } = createHarness();

    const result = await useCase.execute({
      courseId: COURSE_ID,
      changes: { title: 'NestJS avanzado', level: 'advanced' },
      actor: { id: OWNER_ID, role: UserRole.TEACHER },
    });

    expect(result).toMatchObject({
      id: COURSE_ID,
      title: 'NestJS avanzado',
      level: 'advanced',
      createdByUserId: OWNER_ID,
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(result);
    await expect(repository.findById(COURSE_ID)).resolves.toMatchObject({
      title: 'NestJS avanzado',
      level: 'advanced',
    });
  });

  it('keeps fields that the partial update does not mention', async () => {
    const { useCase } = createHarness();

    const result = await useCase.execute({
      courseId: COURSE_ID,
      changes: { title: 'Solo cambia el título' },
      actor: { id: OWNER_ID, role: UserRole.TEACHER },
    });

    expect(result).toMatchObject({
      title: 'Solo cambia el título',
      level: 'beginner',
      createdByUserId: OWNER_ID,
    });
  });

  it('rejects a teacher who does not own the course', async () => {
    const { repository, save, useCase } = createHarness();

    const attempt = useCase.execute({
      courseId: COURSE_ID,
      changes: { title: 'Cambio ajeno' },
      actor: { id: 8, role: UserRole.TEACHER },
    });

    await expect(attempt).rejects.toBeInstanceOf(CourseAccessDeniedError);
    await expect(attempt).rejects.toThrow(
      'You can only update your own courses',
    );
    expect(save).not.toHaveBeenCalled();
    await expect(repository.findById(COURSE_ID)).resolves.toMatchObject({
      title: 'NestJS',
    });
  });

  it('rejects a student even when the student id matches the owner', async () => {
    const { repository, save, useCase } = createHarness();

    await expect(
      useCase.execute({
        courseId: COURSE_ID,
        changes: { title: 'Cambio de estudiante' },
        actor: { id: OWNER_ID, role: UserRole.STUDENT },
      }),
    ).rejects.toBeInstanceOf(CourseAccessDeniedError);

    expect(save).not.toHaveBeenCalled();
    await expect(repository.findById(COURSE_ID)).resolves.toMatchObject({
      title: 'NestJS',
    });
  });

  it('allows an admin to update a course owned by someone else', async () => {
    const { save, useCase } = createHarness();

    const result = await useCase.execute({
      courseId: COURSE_ID,
      changes: { title: 'Actualización del admin' },
      actor: { id: 1, role: UserRole.ADMIN },
    });

    expect(result).toMatchObject({
      title: 'Actualización del admin',
      createdByUserId: OWNER_ID,
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('reports a missing course before applying the authorization rule', async () => {
    const { repository, save, useCase } = createHarness();
    const findById = vi.spyOn(repository, 'findById');

    const attempt = useCase.execute({
      courseId: 999,
      changes: { title: 'No existe' },
      actor: { id: 1, role: UserRole.ADMIN },
    });

    await expect(attempt).rejects.toBeInstanceOf(CourseNotFoundError);
    await expect(attempt).rejects.toThrow('Course 999 not found');
    expect(findById).toHaveBeenCalledWith(999);
    expect(save).not.toHaveBeenCalled();
  });

  it('cannot change the id or the owner through the update payload', async () => {
    const { useCase } = createHarness();
    const hostileChanges = {
      title: 'Título legítimo',
      id: 77,
      createdByUserId: 99,
    } as unknown as CourseChanges;

    const result = await useCase.execute({
      courseId: COURSE_ID,
      changes: hostileChanges,
      actor: { id: OWNER_ID, role: UserRole.TEACHER },
    });

    expect(result).toMatchObject({
      id: COURSE_ID,
      title: 'Título legítimo',
      createdByUserId: OWNER_ID,
    });
  });
});
