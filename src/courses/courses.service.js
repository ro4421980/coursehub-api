import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Course } from '../entity/course.entity.js';

/** @typedef {import('typeorm').Repository<Course>} CourseRepository */
/** @typedef {import('./dto/create-courses.dto.js').CreateCourseDto} CreateCourseDto */
/** @typedef {import('./dto/courses-query.dto.js').CoursesQueryDto} CoursesQueryDto */

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

  /** @param {CreateCourseDto} dto @returns {Promise<Course>} */
  create(dto) {
    const course = this.coursesRepository.create(dto);
    return this.coursesRepository.save(course);
  }

  /** @param {number} id @param {Partial<Pick<Course, 'title' | 'level'>>} dto @returns {Promise<Course>} */
  async update(id, dto) {
    const course = await this.findOne(id);
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