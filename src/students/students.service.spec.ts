import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Student } from './entities/student.entity.js';
import { StudentsService } from './students.service.js';

describe('StudentsService', () => {
  let service: StudentsService;
  const studentsRepository = {
    find: vi.fn(),
    findOneBy: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StudentsService(
      studentsRepository as unknown as Repository<Student>,
    );
  });

  it('persists a new student using the database repository', async () => {
    const dto = {
      name: 'Test Student',
      email: ' Student@Example.Test ',
      age: 20,
      career: 'Engineering',
      semester: 2,
    };
    const student = { id: 1, ...dto } as Student;
    studentsRepository.findOneBy.mockResolvedValue(null);
    const persistedStudent = { ...student, email: 'student@example.test' };
    studentsRepository.create.mockReturnValue(persistedStudent);
    studentsRepository.save.mockResolvedValue(persistedStudent);

    await expect(service.create(dto)).resolves.toBe(persistedStudent);
    expect(studentsRepository.create).toHaveBeenCalledWith({
      ...dto,
      email: 'student@example.test',
    });
    expect(studentsRepository.save).toHaveBeenCalledWith(persistedStudent);
  });

  it('rejects duplicate student emails', async () => {
    studentsRepository.findOneBy.mockResolvedValue({ id: 1 } as Student);

    await expect(
      service.create({
        name: 'Test Student',
        email: 'student@example.test',
        age: 20,
        career: 'Engineering',
        semester: 2,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(studentsRepository.save).not.toHaveBeenCalled();
  });

  it('returns a not-found error for unknown student ids', async () => {
    studentsRepository.findOneBy.mockResolvedValue(null);

    await expect(service.findOne(55)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('applies database filters for student listings', async () => {
    studentsRepository.find.mockResolvedValue([]);

    await service.findAll({
      career: 'engineering',
      semester: 2,
      isActive: false,
    });

    expect(studentsRepository.find).toHaveBeenCalledWith({
      where: {
        career: expect.anything(),
        semester: 2,
        isActive: false,
      },
      order: { id: 'ASC' },
    });
  });
});
