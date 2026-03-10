import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleSlot } from './schedule-slot.entity';
import { Doctor } from '../doctors/doctor.entity';
import { QuerySlotsDto } from './dto/query-slots.dto';
import { CreateSlotsDto } from './dto/create-slots.dto';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(ScheduleSlot)
    private readonly slotsRepository: Repository<ScheduleSlot>,
    @InjectRepository(Doctor)
    private readonly doctorsRepository: Repository<Doctor>,
  ) {}

  async getDoctorFreeSlots(doctorId: string, query: QuerySlotsDto) {
    const doctor = await this.doctorsRepository.findOne({ where: { id: doctorId } });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const qb = this.slotsRepository
      .createQueryBuilder('slot')
      .where('slot.doctorId = :doctorId', { doctorId })
      .andWhere('slot.isBooked = false')
      .andWhere('slot.startTime > NOW()');

    if (query.from) {
      qb.andWhere('slot.startTime >= :from', { from: query.from });
    }

    if (query.to) {
      qb.andWhere('slot.startTime <= :to', { to: query.to });
    }

    qb.orderBy('slot.startTime', 'ASC');

    return qb.getMany();
  }

  async createSlotsForDoctor(doctorId: string, dto: CreateSlotsDto) {
    const doctor = await this.doctorsRepository.findOne({ where: { id: doctorId } });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const now = new Date();
    const slots = dto.slots.map((s) => {
      const start = new Date(s.startTime);
      const end = new Date(s.endTime);

      if (!(start instanceof Date) || isNaN(start.getTime())) {
        throw new BadRequestException('Invalid startTime');
      }
      if (!(end instanceof Date) || isNaN(end.getTime())) {
        throw new BadRequestException('Invalid endTime');
      }
      if (end <= start) {
        throw new BadRequestException('endTime must be after startTime');
      }
      if (end <= now) {
        throw new BadRequestException('Slots must be in the future');
      }

      const slot = new ScheduleSlot();
      slot.doctor = doctor;
      slot.startTime = start;
      slot.endTime = end;
      slot.isBooked = false;
      return slot;
    });

    try {
      return await this.slotsRepository.save(slots);
    } catch (e) {
      throw new BadRequestException('Failed to create slots (possibly duplicates)');
    }
  }
}

