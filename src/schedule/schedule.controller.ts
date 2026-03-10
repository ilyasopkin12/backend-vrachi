import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { QuerySlotsDto } from './dto/query-slots.dto';
import { CreateSlotsDto } from './dto/create-slots.dto';
import { JwtAuthGuard } from '../shared/jwt-auth.guard';
import { RolesGuard } from '../shared/roles.guard';
import { Roles } from '../shared/roles.decorator';
import { UserRole } from '../users/user-role.enum';

@Controller()
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get('doctors/:id/slots')
  async getDoctorSlots(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: QuerySlotsDto,
  ) {
    return this.scheduleService.getDoctorFreeSlots(id, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin/doctors/:id/slots')
  async createSlots(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateSlotsDto,
  ) {
    return this.scheduleService.createSlotsForDoctor(id, dto);
  }
}

