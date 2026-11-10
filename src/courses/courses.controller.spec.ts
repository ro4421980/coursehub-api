import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { JwtStrategy } from '../auth/strategies/jwt.strategy.js';
import { Course } from '../entity/course.entity.js';
import { UserRole } from '../users/user-role.enum.js';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';

describe('CoursesController', () => {
  let controller: CoursesController;
  let app: INestApplication;
  const jwtSecret = 'test-secret-with-at-least-32-characters';
  const courseRepository = {
    findAndCount: vi.fn(),
    findOneBy: vi.fn(),
    create: vi.fn((course: Record<string, unknown>) => course),
    save: vi.fn(async (course: Record<string, unknown>) => course),
    remove: vi.fn(async (course: Record<string, unknown>) => course),
  };
  let storedCourse: {
    id: number;
    title: string;
    level: string;
    createdByUserId: number | null;
  };

  beforeEach(async () => {
    storedCourse = {
      id: 5,
      title: 'NestJS',
      level: 'beginner',
      createdByUserId: 2,
    };
    courseRepository.findOneBy.mockImplementation(
      async ({ id }: { id: number }) =>
        id === storedCourse.id ? storedCourse : null,
    );

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({}),
        JwtModule.register({ secret: jwtSecret }),
      ],
      controllers: [CoursesController],
      providers: [
        CoursesService,
        {
          provide: getRepositoryToken(Course),
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

    expect(courseRepository.save).not.toHaveBeenCalled();
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

    await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '', level: 'invalid' })
      .expect(400);

    expect(courseRepository.save).not.toHaveBeenCalled();
  });

  it('returns 401 for PATCH without a valid identity', async () => {
    await request(app.getHttpServer())
      .patch('/courses/5')
      .send({ title: 'Updated' })
      .expect(401);
  });

  it('returns 403 for a student attempting to update a course', async () => {
    const token = await createToken(UserRole.STUDENT, 2);

    await request(app.getHttpServer())
      .patch('/courses/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated' })
      .expect(403);

    expect(courseRepository.findOneBy).not.toHaveBeenCalled();
  });

  it('returns 403 when a teacher attempts to update another teacher course', async () => {
    const token = await createToken(UserRole.TEACHER, 3);

    await request(app.getHttpServer())
      .patch('/courses/5')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated' })
      .expect(403);

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

  it('returns 401 for DELETE without a valid identity', async () => {
    await request(app.getHttpServer()).delete('/courses/5').expect(401);
  });

  it('returns 403 for a teacher attempting to delete a course', async () => {
    const token = await createToken(UserRole.TEACHER);

    await request(app.getHttpServer())
      .delete('/courses/5')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(courseRepository.remove).not.toHaveBeenCalled();
  });

  it('allows an admin to delete a course', async () => {
    const token = await createToken(UserRole.ADMIN);

    await request(app.getHttpServer())
      .delete('/courses/5')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(courseRepository.remove).toHaveBeenCalledOnce();
  });
});
