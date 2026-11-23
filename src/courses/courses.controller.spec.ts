import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { JwtStrategy } from '../auth/strategies/jwt.strategy.js';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter.js';
import { UserRole } from '../users/user-role.enum.js';
import { COURSE_REPOSITORY } from './application/ports/course.repository.js';
import { CreateCourseUseCase } from './application/use-cases/create-course.use-case.js';
import { DeleteCourseUseCase } from './application/use-cases/delete-course.use-case.js';
import { GetCourseUseCase } from './application/use-cases/get-course.use-case.js';
import { ListCoursesUseCase } from './application/use-cases/list-courses.use-case.js';
import { UpdateCourseUseCase } from './application/use-cases/update-course.use-case.js';
import { CoursesController } from './courses.controller.js';
import type { Course, NewCourse } from './domain/course.js';

describe('CoursesController', () => {
  let controller: CoursesController;
  let app: INestApplication;
  const jwtSecret = 'test-secret-with-at-least-32-characters';
  let storedCourse: Course | null;

  const courseRepository = {
    findPage: vi.fn(async () => ({
      items: storedCourse ? [storedCourse] : [],
      total: storedCourse ? 1 : 0,
    })),
    findById: vi.fn(async (id: number) =>
      storedCourse?.id === id ? storedCourse : null,
    ),
    create: vi.fn(async (course: NewCourse) => {
      storedCourse = { id: 5, ...course };
      return storedCourse;
    }),
    save: vi.fn(async (course: Course) => {
      storedCourse = course;
      return course;
    }),
    delete: vi.fn(async (id: number) => {
      if (storedCourse?.id === id) {
        storedCourse = null;
      }
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    storedCourse = {
      id: 5,
      title: 'NestJS',
      level: 'beginner',
      createdByUserId: 2,
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({}),
        JwtModule.register({ secret: jwtSecret }),
      ],
      controllers: [CoursesController],
      providers: [
        ListCoursesUseCase,
        GetCourseUseCase,
        CreateCourseUseCase,
        UpdateCourseUseCase,
        DeleteCourseUseCase,
        {
          provide: COURSE_REPOSITORY,
          useValue: courseRepository,
        },
        JwtAuthGuard,
        RolesGuard,
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => jwtSecret },
        },
      ],
    }).compile();

    controller = module.get<CoursesController>(CoursesController);
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  async function createToken(role: UserRole, id = 1): Promise<string> {
    return app.get(JwtService).signAsync({
      sub: id,
      email: `user${id}@example.test`,
      role,
    });
  }

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('requires a valid bearer token before creating a course', async () => {
    await request(app.getHttpServer())
      .post('/courses')
      .send({ title: 'NestJS', level: 'beginner' })
      .expect(401);

    expect(courseRepository.create).not.toHaveBeenCalled();
  });

  it('creates a course with its authenticated creator', async () => {
    const token = await createToken(UserRole.TEACHER);

    const response = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'NestJS', level: 'beginner' })
      .expect(201);

    expect(response.body.createdByUserId).toBe(1);
    expect(courseRepository.create).toHaveBeenCalledWith({
      title: 'NestJS',
      level: 'beginner',
      createdByUserId: 1,
    });
  });

  it('validates the course DTO after authenticating the request', async () => {
    const token = await createToken(UserRole.TEACHER);

    const response = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '', level: 'invalid' })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      path: '/courses',
    });
    expect(response.body).not.toHaveProperty('stack');
    expect(courseRepository.create).not.toHaveBeenCalled();
  });

  it('returns 401 for PATCH without a valid identity', async () => {
    await request(app.getHttpServer())
      .patch('/courses/5')
      .send({ title: 'Updated' })
      .expect(401);
  });

  it('returns 403 for a student attempting to update a course', async () => {
    const token = await createToken(UserRole.STUDENT, 2);

    const response = await request(app.getHttpServer())
      .patch('/courses/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated' })
      .expect(403);

    expect(response.body).toMatchObject({
      statusCode: 403,
      error: 'Forbidden',
      path: '/courses/5',
    });
    expect(courseRepository.save).not.toHaveBeenCalled();
  });

  it('returns 403 when a teacher attempts to update another teacher course', async () => {
    const token = await createToken(UserRole.TEACHER, 3);

    const response = await request(app.getHttpServer())
      .patch('/courses/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated' })
      .expect(403);

    expect(response.body).toMatchObject({
      statusCode: 403,
      error: 'Forbidden',
      message: 'You can only update your own courses',
      path: '/courses/5',
      requestId: expect.any(String),
      timestamp: expect.any(String),
    });
    expect(response.body).not.toHaveProperty('stack');
    expect(courseRepository.save).not.toHaveBeenCalled();
  });

  it('allows the teacher who owns a course to update it', async () => {
    const token = await createToken(UserRole.TEACHER, 2);

    const response = await request(app.getHttpServer())
      .patch('/courses/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated' })
      .expect(200);

    expect(response.body).toMatchObject({
      id: 5,
      title: 'Updated',
      createdByUserId: 2,
    });
    expect(courseRepository.save).toHaveBeenCalledOnce();
  });

  it('allows an admin to update another teacher course', async () => {
    const token = await createToken(UserRole.ADMIN);

    await request(app.getHttpServer())
      .patch('/courses/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Admin update' })
      .expect(200);
  });

  it('returns a consistent 400 for an invalid course id', async () => {
    const token = await createToken(UserRole.ADMIN);

    const response = await request(app.getHttpServer())
      .patch('/courses/not-a-number')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated' })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed (numeric string is expected)',
      path: '/courses/not-a-number',
      requestId: expect.any(String),
      timestamp: expect.any(String),
    });
    expect(response.body).not.toHaveProperty('stack');
  });

  it('returns a consistent 404 for a course that does not exist', async () => {
    const token = await createToken(UserRole.ADMIN);

    const response = await request(app.getHttpServer())
      .patch('/courses/999')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated' })
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      message: 'Course 999 not found',
      path: '/courses/999',
      requestId: expect.any(String),
      timestamp: expect.any(String),
    });
    expect(response.body).not.toHaveProperty('stack');
  });

  it('returns 401 for DELETE without a valid identity', async () => {
    await request(app.getHttpServer()).delete('/courses/5').expect(401);
  });

  it('returns 403 for a teacher attempting to delete a course', async () => {
    const token = await createToken(UserRole.TEACHER);

    await request(app.getHttpServer())
      .delete('/courses/5')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(courseRepository.delete).not.toHaveBeenCalled();
  });

  it('allows an admin to delete a course', async () => {
    const token = await createToken(UserRole.ADMIN);

    await request(app.getHttpServer())
      .delete('/courses/5')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(courseRepository.delete).toHaveBeenCalledOnce();
  });
});
