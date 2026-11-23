import type { UserRole } from '../../users/user-role.enum.js';

/**
 * Business model of a course. It intentionally contains no TypeORM decorators
 * and no HTTP metadata, so use cases can be read and tested in isolation.
 */
export type Course = {
  id: number;
  title: string;
  level: string;
  createdByUserId: number | null;
};

export type NewCourse = {
  title: string;
  level: string;
  createdByUserId: number;
};

export type CourseChanges = Partial<Pick<Course, 'title' | 'level'>>;

export type CourseActor = {
  id: number;
  role: UserRole;
};
