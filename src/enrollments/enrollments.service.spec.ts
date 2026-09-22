import { EnrollmentsService } from './enrollments.service.js';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;

  beforeEach(() => {
    service = new EnrollmentsService();
  });

  it('should create, filter and remove enrollments', () => {
    const created = service.create({ studentId: 1, courseId: 2 });

    expect(created).toMatchObject({ studentId: 1, courseId: 2 });
    expect(service.findAll(1, 2)).toHaveLength(1);

    service.remove(created.id);
    expect(service.findAll(1, 2)).toEqual([]);
  });
});
