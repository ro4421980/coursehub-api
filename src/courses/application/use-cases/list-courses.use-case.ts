import { Inject, Injectable } from '@nestjs/common';
import type { Course } from '../../domain/course.js';
import {
  COURSE_REPOSITORY,
  type CourseRepository,
} from '../ports/course.repository.js';

export type ListCoursesInput = {
  level?: string;
  page: number;
  limit: number;
  sortBy: 'id' | 'title' | 'level';
  order: 'ASC' | 'DESC';
};

export type ListCoursesResult = {
  items: Course[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

@Injectable()
export class ListCoursesUseCase {
  constructor(
    @Inject(COURSE_REPOSITORY)
    private readonly courses: CourseRepository,
  ) {}

  async execute(input: ListCoursesInput): Promise<ListCoursesResult> {
    const { items, total } = await this.courses.findPage({
      level: input.level,
      sortBy: input.sortBy,
      order: input.order,
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    });

    return {
      items,
      meta: {
        total,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(total / input.limit),
      },
    };
  }
}
