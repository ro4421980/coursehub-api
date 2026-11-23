import { Inject, Injectable } from '@nestjs/common';
import type {
  Course,
  CourseActor,
  CourseChanges,
} from '../../domain/course.js';
import {
  CourseAccessDeniedError,
  CourseNotFoundError,
} from '../../domain/course.errors.js';
import { UserRole } from '../../../users/user-role.enum.js';
import {
  COURSE_REPOSITORY,
  type CourseRepository,
} from '../ports/course.repository.js';

export type UpdateCourseInput = {
  courseId: number;
  changes: CourseChanges;
  actor: CourseActor;
};

@Injectable()
export class UpdateCourseUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY)
    private readonly courses: CourseRepository,
  ) {}

  async execute(input: UpdateCourseInput): Promise<Course> {
    const course = await this.courses.findById(input.courseId);

    if (!course) {
      throw new CourseNotFoundError(input.courseId);
    }

    // Ownership is part of the business rule, not a route-level concern.
    // Admins may update any course; teachers only their own; students never.
    const isAdmin = input.actor.role === UserRole.ADMIN;
    const isOwner = course.createdByUserId === input.actor.id;
    const isTeacher = input.actor.role === UserRole.TEACHER;

    if (!isAdmin && !(isTeacher && isOwner)) {
      throw new CourseAccessDeniedError();
    }

    Object.assign(course, input.changes);

    return this.courses.save(course);
  }
}
