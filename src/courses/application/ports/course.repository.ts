import type { Course, NewCourse } from '../../domain/course.js';

export const COURSE_REPOSITORY = Symbol('COURSE_REPOSITORY');

export type CoursePageQuery = {
  level?: string;
  sortBy: 'id' | 'title' | 'level';
  order: 'ASC' | 'DESC';
  skip: number;
  take: number;
};

export type CoursePage = {
  items: Course[];
  total: number;
};

/**
 * Small port owned by the application layer. Use cases only know these five
 * operations; TypeORM, SQL and the entity mapping stay in the adapter.
 */
export interface CourseRepository {
  findPage(query: CoursePageQuery): Promise<CoursePage>;
  findById(id: number): Promise<Course | null>;
  create(course: NewCourse): Promise<Course>;
  save(course: Course): Promise<Course>;
  delete(id: number): Promise<void>;
}
