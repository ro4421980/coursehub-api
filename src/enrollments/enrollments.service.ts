import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from './enrollment.entity.js';
import { Student } from '../students/entities/student.entity.js';
import { Course } from '../entity/course.entity.js';
import { CreateEnrollmentDto } from './create-enrollment.dto.js';
import { EnrollmentsQueryDto } from './dto/enrollments-query.dto.js';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async create(createEnrollmentDto: CreateEnrollmentDto): Promise<Enrollment> {
    const { studentId, courseId } = createEnrollmentDto;

    // Regla 1: Validar existencia del estudiante
    const student = await this.studentRepository.findOneBy({ id: studentId });
    if (!student) {
      throw new NotFoundException(`El estudiante con ID ${studentId} no existe.`);
    }

    // Regla 2: Validar que el estudiante esté activo
    if (!student.isActive) {
      throw new BadRequestException(`El estudiante con ID ${studentId} está inactivo y no puede matricularse.`);
    }

    // Regla 3: Validar existencia del curso
    const course = await this.courseRepository.findOneBy({ id: courseId });
    if (!course) {
      throw new NotFoundException(`El curso con ID ${courseId} no existe.`);
    }

    // Regla 4: Validar duplicado previo en la base de datos
    const existingEnrollment = await this.enrollmentRepository.findOne({
      where: {
        student: { id: studentId },
        course: { id: courseId },
      },
    });

    if (existingEnrollment) {
      throw new ConflictException(`El estudiante ya se encuentra matriculado en este curso.`);
    }

    // Creación y persistencia
    try {
      const enrollment = this.enrollmentRepository.create({
        student,
        course,
      });

      return await this.enrollmentRepository.save(enrollment);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        throw new ConflictException('El estudiante ya está matriculado en este curso.');
      }
      throw error;
    }
  }

  async findAll(query: EnrollmentsQueryDto) {
    const queryBuilder = this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('enrollment.course', 'course');

    const search = query.search?.trim();
    if (search) {
      queryBuilder.andWhere(
        '(student.name ILIKE :search OR course.title ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (query.studentId !== undefined) {
      queryBuilder.andWhere('student.id = :studentId', {
        studentId: query.studentId,
      });
    }

    if (query.activeOnly === 'true') {
      queryBuilder.andWhere('student.isActive = :active', { active: true });
    }

    queryBuilder
      .orderBy('enrollment.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await queryBuilder.getManyAndCount();
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

  async findByCourse(courseId: number): Promise<Enrollment[]> {
    return await this.enrollmentRepository.find({
      where: { course: { id: courseId } },
      relations: { student: true },
    });
  }

  async remove(id: number): Promise<void> {
    const result = await this.enrollmentRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException(`La matrícula con ID ${id} no existe.`);
    }
  }
}
