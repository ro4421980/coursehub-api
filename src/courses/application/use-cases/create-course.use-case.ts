import { Inject, Injectable } from '@nestjs/common';
import type { Course, CourseActor } from '../../domain/course.js';
import {
  COURSE_REPOSITORY,
  type CourseRepository,
} from '../ports/course.repository.js';

export type CreateCourseInput = {
  title: string;
  level: string;
  actor: CourseActor;
};

@Injectable()
export class CreateCourseUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY)
    private readonly courses: CourseRepository,
  ) {}

  execute(input: CreateCourseInput): Promise<Course> {
    return this.courses.create({
      title: input.title,
      level: input.level,
      createdByUserId: input.actor.id,
    });
  }
}
