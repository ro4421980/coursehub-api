import { Module } from '@nestjs/common';
import { EnrollmentsController } from './enrollments.controller.js';
import { EnrollmentsService } from './enrollments.service.js';
import { StudentsModule } from '../students/students.module.js';
import { CoursesModule } from '../courses/courses.module.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from './enrollment.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Course } from '../entity/course.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment, Student, Course]),
    StudentsModule,
    CoursesModule,
  ],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
