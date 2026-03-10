import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { IsUUID } from 'class-validator';

export class CreateDoctorDto {
  @IsString()
  fullName: string;

  @IsUUID()
  specializationId: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  experienceYears?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

