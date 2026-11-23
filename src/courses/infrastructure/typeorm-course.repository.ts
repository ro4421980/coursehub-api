import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsOrder } from 'typeorm';
import { Repository } from 'typeorm';
import { Course } from '../../entity/course.entity.js';
import type { Course as CourseModel, NewCourse } from '../domain/course.js';
import type {
  CoursePage,
  CoursePageQuery,
  CourseRepository,
} from '../application/ports/course.repository.js';

/**
 * TypeORM adapter for the CourseRepository port. All ORM-specific details
 * (query options, entity instances, generated SQL) are confined to this file.
 */
@Injectable()
export class TypeOrmCourseRepository implements CourseRepository {
  constructor(
    @InjectRepository(Course)
    private readonly repository: Repository<Course>,
  ) {}

  async findPage(query: CoursePageQuery): Promise<CoursePage> {
    const order: FindOptionsOrder<Course> = {
      [query.sortBy]: query.order,
      id: query.order,
    };

    const [items, total] = await this.repository.findAndCount({
      where: query.level ? { level: query.level } : {},
      order,
      skip: query.skip,
      take: query.take,
    });

    return { items, total };
  }

  findById(id: number): Promise<CourseModel | null> {
    return this.repository.findOneBy({ id });
  }

  async create(course: NewCourse): Promise<CourseModel> {
    return this.repository.save(this.repository.create(course));
  }

  save(course: CourseModel): Promise<CourseModel> {
    return this.repository.save(course);
  }

  async delete(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
