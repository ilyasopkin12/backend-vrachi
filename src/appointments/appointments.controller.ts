import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { JwtAuthGuard } from '../shared/jwt-auth.guard';
import { CurrentUser } from '../shared/current-user.decorator';
import type { RequestUser } from '../auth/jwt.strategy';

@UseGuards(JwtAuthGuard)
@Controller()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post('appointments')
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.createForPatient(user, dto);
  }

  @Get('appointments/:id')
  async getOne(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.appointmentsService.getByIdForUser(user, id);
  }

  @Post('appointments/:id/cancel')
  async cancel(
    @CurrentUser() user: RequestUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.appointmentsService.cancelForUser(user, id);
  }

  @Get('me/appointments')
  async myAppointments(@CurrentUser() user: RequestUser) {
    return this.appointmentsService.getMyAppointments(user);
  }
}

