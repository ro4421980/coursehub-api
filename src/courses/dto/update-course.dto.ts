import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseDto } from './create-courses.dto.js';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}
