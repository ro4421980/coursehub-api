import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Course } from '../entity/course.entity.js';
import { COURSE_REPOSITORY } from './application/ports/course.repository.js';
import { CreateCourseUseCase } from './application/use-cases/create-course.use-case.js';
import { DeleteCourseUseCase } from './application/use-cases/delete-course.use-case.js';
import { GetCourseUseCase } from './application/use-cases/get-course.use-case.js';
import { ListCoursesUseCase } from './application/use-cases/list-courses.use-case.js';
import { UpdateCourseUseCase } from './application/use-cases/update-course.use-case.js';
import { CoursesController } from './courses.controller.js';
import { TypeOrmCourseRepository } from './infrastructure/typeorm-course.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([Course]), AuthModule],
  controllers: [CoursesController],
  providers: [
    {
      provide: COURSE_REPOSITORY,
      useClass: TypeOrmCourseRepository,
    },
    ListCoursesUseCase,
    GetCourseUseCase,
    CreateCourseUseCase,
    UpdateCourseUseCase,
    DeleteCourseUseCase,
  ],
})
export class CoursesModule {}
