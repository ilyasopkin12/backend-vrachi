import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleSlot } from './schedule-slot.entity';
import { ScheduleService } from './schedule.service';
import { ScheduleController } from './schedule.controller';
import { Doctor } from '../doctors/doctor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ScheduleSlot, Doctor])],
  providers: [ScheduleService],
  controllers: [ScheduleController],
  exports: [TypeOrmModule, ScheduleService],
})
export class ScheduleModule {}

