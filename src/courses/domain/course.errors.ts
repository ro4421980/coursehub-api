import { ApplicationError } from '../../common/errors/application.error.js';

export class CourseNotFoundError extends ApplicationError {
  readonly code = 'COURSE_NOT_FOUND';

  constructor(id: number) {
    super(`Course ${id} not found`);
  }
}

export class CourseAccessDeniedError extends ApplicationError {
  readonly code = 'COURSE_ACCESS_DENIED';

  constructor() {
    super('You can only update your own courses');
  }
}
