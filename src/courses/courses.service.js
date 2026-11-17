import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from '../entity/course.entity.js';

/** @typedef {import('typeorm').Repository<Course>} CourseRepository */
/** @typedef {import('./dto/create-courses.dto.js').CreateCourseDto} CreateCourseDto */
/** @typedef {import('./dto/courses-query.dto.js').CoursesQueryDto} CoursesQueryDto */
/** @typedef {import('../auth/types/jwt-payload.type.js').AuthenticatedUser} AuthenticatedUser */
/** @typedef {import('../users/user-role.enum.js').UserRole} UserRole */

export class CoursesService {
  /** @param {CourseRepository} coursesRepository */
  constructor(coursesRepository) {
    this.coursesRepository = coursesRepository;
  }

  /**
   * @param {CoursesQueryDto} query
   * @returns {Promise<{items: Course[], meta: {total: number, page: number, limit: number, totalPages: number}}>}
   */
  async findAll(query) {
    const [items, total] = await this.coursesRepository.findAndCount({
      where: query.level ? { level: query.level } : {},
      order: { [query.sortBy]: query.order, id: query.order },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      items,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  /** @param {number} id @returns {Promise<Course>} */
  async findOne(id) {
    const course = await this.coursesRepository.findOneBy({ id });
    if (!course) throw new NotFoundException(`Course ${id} not found`);
    return course;
  }

  /**
   * @param {CreateCourseDto} dto
   * @param {AuthenticatedUser} actor
   * @returns {Promise<Course>}
   */
  create(dto, actor) {
    const course = this.coursesRepository.create({
      ...dto,
      createdByUserId: actor.id,
    });
    return this.coursesRepository.save(course);
  }

  /**
   * @param {number} id
   * @param {Partial<Pick<Course, 'title' | 'level'>>} dto
   * @param {AuthenticatedUser} actor
   * @returns {Promise<Course>}
   */
  async update(id, dto, actor) {
    const course = await this.findOne(id);
    if (
      actor.role !== 'admin' &&
      (actor.role !== 'teacher' || course.createdByUserId !== actor.id)
    ) {
      throw new ForbiddenException('You can only update your own courses');
    }

    Object.assign(course, dto);
    return this.coursesRepository.save(course);
  }

  /** @param {number} id @returns {Promise<Course>} */
  async remove(id) {
    const course = await this.findOne(id);
    await this.coursesRepository.remove(course);
    return course;
  }
}

InjectRepository(Course)(CoursesService, undefined, 0);
Injectable()(CoursesService);