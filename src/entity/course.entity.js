import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Enrollment } from '../enrollments/enrollment.entity.js';

export class Course {
  /** @type {number} */
  id;

  /** @type {string} */
  title;

  /** @type {string} */
  level;

  /** @type {number | null} */
  createdByUserId;

  /** @type {Enrollment[]} */
  enrollments;
}

PrimaryGeneratedColumn()(Course.prototype, 'id');
Column({ type: 'varchar' })(Course.prototype, 'title');
Column({ type: 'varchar' })(Course.prototype, 'level');
Column({ name: 'created_by_user_id', type: 'integer', nullable: true })(
  Course.prototype,
  'createdByUserId',
);
OneToMany(() => Enrollment, (enrollment) => enrollment.course)(Course.prototype, 'enrollments');
Entity('courses')(Course);