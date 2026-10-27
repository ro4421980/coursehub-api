import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { Course } from '../entity/course.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Enrollment } from './enrollment.entity.js';
import { EnrollmentsQueryDto } from './dto/enrollments-query.dto.js';
import { EnrollmentsService } from './enrollments.service.js';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let queryBuilder: {
    leftJoinAndSelect: ReturnType<typeof vi.fn>;
    andWhere: ReturnType<typeof vi.fn>;
    orderBy: ReturnType<typeof vi.fn>;
    skip: ReturnType<typeof vi.fn>;
    take: ReturnType<typeof vi.fn>;
    getManyAndCount: ReturnType<typeof vi.fn>;
  };
  let enrollmentRepository: {
    createQueryBuilder: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: vi.fn(),
      andWhere: vi.fn(),
      orderBy: vi.fn(),
      skip: vi.fn(),
      take: vi.fn(),
      getManyAndCount: vi.fn(),
    };
    queryBuilder.leftJoinAndSelect.mockReturnValue(queryBuilder);
    queryBuilder.andWhere.mockReturnValue(queryBuilder);
    queryBuilder.orderBy.mockReturnValue(queryBuilder);
    queryBuilder.skip.mockReturnValue(queryBuilder);
    queryBuilder.take.mockReturnValue(queryBuilder);
    enrollmentRepository = {
      createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
      delete: vi.fn(),
    };

    service = new EnrollmentsService(
      enrollmentRepository as unknown as Repository<Enrollment>,
      {} as Repository<Student>,
      {} as Repository<Course>,
    );
  });

  it('joins student and course, filters and paginates enrollments', async () => {
    const items = [{ id: 4 } as Enrollment];
    queryBuilder.getManyAndCount.mockResolvedValue([items, 21]);

    const result = await service.findAll({
      search: '  NestJS  ',
      studentId: 7,
      activeOnly: 'true',
      page: 2,
      limit: 10,
    });

    expect(enrollmentRepository.createQueryBuilder).toHaveBeenCalledWith(
      'enrollment',
    );
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
      1,
      'enrollment.student',
      'student',
    );
    expect(queryBuilder.leftJoinAndSelect).toHaveBeenNthCalledWith(
      2,
      'enrollment.course',
      'course',
    );
    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
      1,
      '(student.name ILIKE :search OR course.title ILIKE :search)',
      { search: '%NestJS%' },
    );
    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
      2,
      'student.id = :studentId',
      { studentId: 7 },
    );
    expect(queryBuilder.andWhere).toHaveBeenNthCalledWith(
      3,
      'student.isActive = :active',
      { active: true },
    );
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('enrollment.id', 'ASC');
    expect(queryBuilder.skip).toHaveBeenCalledWith(10);
    expect(queryBuilder.take).toHaveBeenCalledWith(10);
    expect(result).toEqual({
      items,
      meta: { total: 21, page: 2, limit: 10, totalPages: 3 },
    });
  });

  it('keeps SQL-like search text as a parameter value', async () => {
    const search = "' OR 1=1 --";
    queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

    const result = await service.findAll({
      search,
      page: 1,
      limit: 10,
    } as EnrollmentsQueryDto);

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      '(student.name ILIKE :search OR course.title ILIKE :search)',
      { search: `%${search}%` },
    );
    expect(queryBuilder.getManyAndCount).toHaveBeenCalledOnce();
    expect(result).toEqual({
      items: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });
  });

  it('does not add optional filters when they are omitted', async () => {
    queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

    await service.findAll({ page: 1, limit: 5 } as EnrollmentsQueryDto);

    expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    expect(queryBuilder.take).toHaveBeenCalledWith(5);
  });

  it('deletes a persisted enrollment by id', async () => {
    enrollmentRepository.delete.mockResolvedValue({ affected: 1 });

    await expect(service.remove(12)).resolves.toBeUndefined();
    expect(enrollmentRepository.delete).toHaveBeenCalledWith(12);
  });

  it('reports when the enrollment to delete does not exist', async () => {
    enrollmentRepository.delete.mockResolvedValue({ affected: 0 });

    await expect(service.remove(12)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('preserves unexpected database errors when creating an enrollment', async () => {
    const databaseError = new Error('database unavailable');
    const student = { id: 7, isActive: true } as Student;
    const course = { id: 4 } as Course;
    const studentRepository = {
      findOneBy: vi.fn().mockResolvedValue(student),
    };
    const courseRepository = {
      findOneBy: vi.fn().mockResolvedValue(course),
    };
    const enrollmentRepository = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockReturnValue({ student, course }),
      save: vi.fn().mockRejectedValue(databaseError),
      createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
      delete: vi.fn(),
    };
    const createService = new EnrollmentsService(
      enrollmentRepository as unknown as Repository<Enrollment>,
      studentRepository as unknown as Repository<Student>,
      courseRepository as unknown as Repository<Course>,
    );

    await expect(
      createService.create({ studentId: 7, courseId: 4 }),
    ).rejects.toBe(databaseError);
  });
});
