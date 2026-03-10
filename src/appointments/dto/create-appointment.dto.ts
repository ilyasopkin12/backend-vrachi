import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  doctorId: string;

  @IsUUID()
  slotId: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

