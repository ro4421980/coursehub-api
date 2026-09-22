import { Injectable } from '@nestjs/common';
import { CreateEnrollmentDto } from './create-enrollment.dto.js';

export type Enrollment = {
  id: number;
  studentId: number;
  courseId: number;
};

@Injectable()
export class EnrollmentsService {
  private enrollments: Enrollment[] = [];
  private nextId = 1;

  create(dto: CreateEnrollmentDto): Enrollment {
    const enrollment: Enrollment = {
      id: this.nextId++,
      ...dto,
    };

    this.enrollments.push(enrollment);
    return enrollment;
  }

  findAll(studentId?: number, courseId?: number): Enrollment[] {
    let result = this.enrollments;

    if (studentId !== undefined) {
      result = result.filter((enrollment) => enrollment.studentId === studentId);
    }

    if (courseId !== undefined) {
      result = result.filter((enrollment) => enrollment.courseId === courseId);
    }

    return result;
  }

  remove(id: number): Enrollment | undefined {
    const index = this.enrollments.findIndex((enrollment) => enrollment.id === id);

    if (index === -1) {
      return undefined;
    }

    const [removedEnrollment] = this.enrollments.splice(index, 1);
    return removedEnrollment;
  }
}
