import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Student } from './entities/student.entity.js';
import { CreateStudentDto } from './dto/create-student.dto.js';
import { UpdateStudentDto } from './dto/update-student.dto.js';
import { FilterStudentDto } from './dto/filter-student.dto.js';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
  ) {}

  findAll(filters?: FilterStudentDto): Promise<Student[]> {
    const where: FindOptionsWhere<Student> = {};

    if (filters?.career) {
      where.career = ILike(`%${filters.career}%`);
    }
    if (filters?.semester !== undefined) {
      where.semester = filters.semester;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.studentsRepository.find({ where, order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Student> {
    const student = await this.studentsRepository.findOneBy({ id });
    if (!student) {
      throw new NotFoundException(`El estudiante con ID "${id}" no existe`);
    }
    return student;
  }

  async create(createStudentDto: CreateStudentDto): Promise<Student> {
    const email = createStudentDto.email.trim().toLowerCase();
    const emailExists = await this.studentsRepository.findOneBy({
      email: ILike(email),
    });
    if (emailExists) {
      throw new ConflictException(
        `El correo "${createStudentDto.email}" ya se encuentra registrado`,
      );
    }

    const student = this.studentsRepository.create({
      ...createStudentDto,
      email,
    });
    try {
      return await this.studentsRepository.save(student);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException(
          `El correo "${email}" ya se encuentra registrado`,
        );
      }
      throw error;
    }
  }

  async update(
    id: number,
    updateStudentDto: UpdateStudentDto,
  ): Promise<Student> {
    const student = await this.findOne(id);
    const email = updateStudentDto.email?.trim().toLowerCase();

    if (
      email &&
      email !== student.email.toLowerCase()
    ) {
      const emailExists = await this.studentsRepository.findOneBy({
        email: ILike(email),
      });
      if (emailExists && emailExists.id !== id) {
        throw new ConflictException(
          `El correo "${email}" ya pertenece a otro estudiante`,
        );
      }
    }

    Object.assign(student, updateStudentDto, email ? { email } : {});
    try {
      return await this.studentsRepository.save(student);
    } catch (error) {
      if (
        email &&
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException(
          `El correo "${email}" ya pertenece a otro estudiante`,
        );
      }
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    const student = await this.findOne(id);

    if (!student.isActive) {
      throw new ConflictException(
        'No se puede eliminar un estudiante que se encuentre inactivo',
      );
    }

    await this.studentsRepository.remove(student);
  }

  async toggleStatus(id: number): Promise<Student> {
    const student = await this.findOne(id);
    student.isActive = !student.isActive;
    return this.studentsRepository.save(student);
  }
}
