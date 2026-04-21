import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { IsUUID } from 'class-validator';
import { DoctorPresence } from '../doctor-presence.enum';

export class CreateDoctorDto {
  @IsString()
  name: string;
  @IsString()
  surname: string;

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

  @IsOptional()
  @IsString()
  clinic?: string;

  @IsOptional()
  @IsString()
  cabinet?: string;

  @IsOptional()
  @IsEnum(DoctorPresence)
  presence?: DoctorPresence;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  ratingStars?: number;
}

