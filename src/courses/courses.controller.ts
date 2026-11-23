import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { RequestWithUser } from '../auth/types/request-with-user.type.js';
import { UserRole } from '../users/user-role.enum.js';
import type { CourseChanges } from './domain/course.js';
import { CreateCourseUseCase } from './application/use-cases/create-course.use-case.js';
import { DeleteCourseUseCase } from './application/use-cases/delete-course.use-case.js';
import { GetCourseUseCase } from './application/use-cases/get-course.use-case.js';
import { ListCoursesUseCase } from './application/use-cases/list-courses.use-case.js';
import { UpdateCourseUseCase } from './application/use-cases/update-course.use-case.js';
import { CreateCourseDto } from './dto/create-courses.dto.js';
import { CoursesQueryDto } from './dto/courses-query.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';

/**
 * Copies only the fields accepted by the update contract. The validation pipe
 * already strips unknown properties, but this explicit mapping keeps the same
 * guarantee when the controller is called directly in a unit test.
 */
function pickCourseChanges(dto: UpdateCourseDto): CourseChanges {
  const changes: CourseChanges = {};

  if (dto.title !== undefined) {
    changes.title = dto.title;
  }

  if (dto.level !== undefined) {
    changes.level = dto.level;
  }

  return changes;
}

/**
 * HTTP adapter: it only translates requests into use-case calls. It contains
 * no persistence code and no business decisions.
 */
@Controller('courses')
export class CoursesController {
  constructor(
    private readonly listCourses: ListCoursesUseCase,
    private readonly getCourse: GetCourseUseCase,
    private readonly createCourse: CreateCourseUseCase,
    private readonly updateCourse: UpdateCourseUseCase,
    private readonly deleteCourse: DeleteCourseUseCase,
  ) {}

  @Get()
  findAll(@Query() query: CoursesQueryDto) {
    return this.listCourses.execute(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.getCourse.execute(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createCourseDto: CreateCourseDto,
    @Req() request: RequestWithUser,
  ) {
    return this.createCourse.execute({
      title: createCourseDto.title,
      level: createCourseDto.level,
      actor: request.user,
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCourseDto,
    @Req() request: RequestWithUser,
  ) {
    return this.updateCourse.execute({
      courseId: id,
      changes: pickCourseChanges(body),
      actor: request.user,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.deleteCourse.execute(id);
  }
}
