import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../entity/course.entity.js';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Course])], // 1
  controllers: [CoursesController],
  providers: [CoursesService],
})
export class CoursesModule {}
