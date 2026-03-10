import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from './doctor.entity';
import { Specialization } from './specialization.entity';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { SpecializationsController } from './specializations.controller';
import { AdminDoctorsController } from './admin-doctors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, Specialization])],
  providers: [DoctorsService],
  controllers: [
    DoctorsController,
    SpecializationsController,
    AdminDoctorsController,
  ],
  exports: [DoctorsService, TypeOrmModule],
})
export class DoctorsModule {}

