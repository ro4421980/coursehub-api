import { IsInt, IsPositive } from 'class-validator';

export class CreateEnrollmentDto {
  @IsInt({ message: 'studentId debe ser un número entero' })
  @IsPositive({ message: 'studentId debe ser un número positivo' })
  studentId: number;

  @IsInt({ message: 'courseId debe ser un número entero' })
  @IsPositive({ message: 'courseId debe ser un número positivo' })
  courseId: number;
}