import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Enrollment } from '../enrollments/enrollment.entity.js';

export class Course {
  /** @type {number} */
  id;

  /** @type {string} */
  title;

  /** @type {string} */
  level;

  /** @type {Enrollment[]} */
  enrollments;
}

PrimaryGeneratedColumn()(Course.prototype, 'id');
Column({ type: 'varchar' })(Course.prototype, 'title');
Column({ type: 'varchar' })(Course.prototype, 'level');
OneToMany(() => Enrollment, (enrollment) => enrollment.course)(Course.prototype, 'enrollments');
Entity('courses')(Course);