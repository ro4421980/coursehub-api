import { UserRole } from '../../../users/user-role.enum.js';
import type { Course, NewCourse } from '../../domain/course.js';
import type { CourseRepository } from '../ports/course.repository.js';
import { CreateCourseUseCase } from './create-course.use-case.js';

class RecordingCourseRepository implements CourseRepository {
  create = vi.fn<(course: NewCourse) => Promise<Course>>(async (course) => ({
    id: 10,
    ...course,
  }));

  async findPage() {
    return { items: [], total: 0 };
  }

  async findById(): Promise<Course | null> {
    return null;
  }

  async save(course: Course): Promise<Course> {
    return course;
  }

  async delete(): Promise<void> {}
}

describe('CreateCourseUseCase', () => {
  it('records the authenticated actor as the owner', async () => {
    const repository = new RecordingCourseRepository();
    const useCase = new CreateCourseUseCase(repository);

    const result = await useCase.execute({
      title: 'NestJS',
      level: 'beginner',
      actor: { id: 7, role: UserRole.TEACHER },
    });

    expect(repository.create).toHaveBeenCalledWith({
      title: 'NestJS',
      level: 'beginner',
      createdByUserId: 7,
    });
    expect(result.createdByUserId).toBe(7);
  });
});
