import { UserRole } from '../../../users/user-role.enum.js';
import type { Course, NewCourse } from '../../domain/course.js';
import {
  CourseAccessDeniedError,
  CourseNotFoundError,
} from '../../domain/course.errors.js';
import type { CourseRepository } from '../ports/course.repository.js';
import { UpdateCourseUseCase } from './update-course.use-case.js';

class InMemoryCourseRepository implements CourseRepository {
  constructor(private courses: Course[] = []) {}

  async findPage() {
    return { items: this.courses, total: this.courses.length };
  }

  async findById(id: number): Promise<Course | null> {
    return this.courses.find((course) => course.id === id) ?? null;
  }

  async create(course: NewCourse): Promise<Course> {
    const created = { id: this.courses.length + 1, ...course };
    this.courses.push(created);
    return created;
  }

  async save(course: Course): Promise<Course> {
    const index = this.courses.findIndex((item) => item.id === course.id);

    if (index >= 0) {
      this.courses[index] = course;
    }

    return course;
  }

  async delete(id: number): Promise<void> {
    this.courses = this.courses.filter((course) => course.id !== id);
  }
}

function createRepository(): InMemoryCourseRepository {
  return new InMemoryCourseRepository([
    {
      id: 5,
      title: 'NestJS',
      level: 'beginner',
      createdByUserId: 2,
    },
  ]);
}

describe('UpdateCourseUseCase', () => {
  it('allows a teacher to update their own course', async () => {
    const repository = createRepository();
    const useCase = new UpdateCourseUseCase(repository);

    const result = await useCase.execute({
      courseId: 5,
      changes: { title: 'NestJS avanzado' },
      actor: { id: 2, role: UserRole.TEACHER },
    });

    expect(result.title).toBe('NestJS avanzado');
    await expect(repository.findById(5)).resolves.toMatchObject({
      title: 'NestJS avanzado',
    });
  });

  it('rejects a teacher who does not own the course', async () => {
    const repository = createRepository();
    const save = vi.spyOn(repository, 'save');
    const useCase = new UpdateCourseUseCase(repository);

    await expect(
      useCase.execute({
        courseId: 5,
        changes: { title: 'Changed by another teacher' },
        actor: { id: 8, role: UserRole.TEACHER },
      }),
    ).rejects.toBeInstanceOf(CourseAccessDeniedError);

    expect(save).not.toHaveBeenCalled();
    await expect(repository.findById(5)).resolves.toMatchObject({
      title: 'NestJS',
    });
  });

  it('rejects students even when they own the course', async () => {
    const repository = createRepository();
    const useCase = new UpdateCourseUseCase(repository);

    await expect(
      useCase.execute({
        courseId: 5,
        changes: { title: 'Changed by student' },
        actor: { id: 2, role: UserRole.STUDENT },
      }),
    ).rejects.toBeInstanceOf(CourseAccessDeniedError);
  });

  it('allows an admin to update a course owned by someone else', async () => {
    const repository = createRepository();
    const useCase = new UpdateCourseUseCase(repository);

    const result = await useCase.execute({
      courseId: 5,
      changes: { title: 'Admin update' },
      actor: { id: 1, role: UserRole.ADMIN },
    });

    expect(result.title).toBe('Admin update');
  });

  it('throws a domain error when the course does not exist', async () => {
    const useCase = new UpdateCourseUseCase(createRepository());

    await expect(
      useCase.execute({
        courseId: 999,
        changes: { title: 'Missing' },
        actor: { id: 1, role: UserRole.ADMIN },
      }),
    ).rejects.toBeInstanceOf(CourseNotFoundError);
  });
});
