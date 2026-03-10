import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SlotDefinitionDto {
  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}

export class CreateSlotsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SlotDefinitionDto)
  slots: SlotDefinitionDto[];
}

