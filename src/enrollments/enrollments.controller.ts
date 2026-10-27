import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service.js';
import { CreateEnrollmentDto } from './create-enrollment.dto.js';
import { EnrollmentsQueryDto } from './dto/enrollments-query.dto.js';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  create(@Body() dto: CreateEnrollmentDto) {
    return this.enrollmentsService.create(dto);
  }

  @Get()
  findAll(@Query() query: EnrollmentsQueryDto) {
    return this.enrollmentsService.findAll(query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.enrollmentsService.remove(id);
  }
}
