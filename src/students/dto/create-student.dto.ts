import { IsString, IsEmail, IsInt, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsInt()
  @Min(1)
  age: number;

  @IsString()
  career: string;

  @IsInt()
  @Min(1)
  semester: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
