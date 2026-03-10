import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { QueryDoctorsDto } from './dto/query-doctors.dto';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  async findAll(@Query() query: QueryDoctorsDto) {
    return this.doctorsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.doctorsService.findOne(id);
  }
}

