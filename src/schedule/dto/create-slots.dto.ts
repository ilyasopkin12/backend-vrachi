import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConsultationType } from '../consultation-type.enum';

class SlotDefinitionDto {
  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsEnum(ConsultationType)
  consultationType?: ConsultationType;
}

export class CreateSlotsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SlotDefinitionDto)
  slots: SlotDefinitionDto[];
}

