import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export class Course {
  /** @type {number} */
  id;

  /** @type {string} */
  title;

  /** @type {string} */
  level;
}

PrimaryGeneratedColumn()(Course.prototype, 'id');
Column({ type: 'varchar' })(Course.prototype, 'title');
Column({ type: 'varchar' })(Course.prototype, 'level');
Entity('courses')(Course);