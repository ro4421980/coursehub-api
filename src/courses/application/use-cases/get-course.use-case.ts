import { Inject, Injectable } from '@nestjs/common';
import type { Course } from '../../domain/course.js';
import { CourseNotFoundError } from '../../domain/course.errors.js';
import {
  COURSE_REPOSITORY,
  type CourseRepository,
} from '../ports/course.repository.js';

@Injectable()
export class GetCourseUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY)
    private readonly courses: CourseRepository,
  ) {}

  async execute(id: number): Promise<Course> {
    const course = await this.courses.findById(id);

    if (!course) {
      throw new CourseNotFoundError(id);
    }

    return course;
  }
}
