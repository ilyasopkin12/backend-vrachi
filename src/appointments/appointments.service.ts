import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Appointment } from './appointment.entity';
import { ScheduleSlot } from '../schedule/schedule-slot.entity';
import { Doctor } from '../doctors/doctor.entity';
import { User } from '../users/user.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentStatus } from './appointment-status.enum';
import { ConsultationType } from '../schedule/consultation-type.enum';
import { DoctorPresence } from '../doctors/doctor-presence.enum';
import { RequestUser } from '../auth/jwt.strategy';
import { UserRole } from '../users/user-role.enum';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
    @InjectRepository(ScheduleSlot)
    private readonly slotsRepository: Repository<ScheduleSlot>,
    @InjectRepository(Doctor)
    private readonly doctorsRepository: Repository<Doctor>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async createForPatient(current: RequestUser, dto: CreateAppointmentDto) {
    const patient = await this.usersRepository.findOne({
      where: { id: current.userId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return this.dataSource.transaction(async (manager) => {
      const slotRepo = manager.getRepository(ScheduleSlot);
      const doctorRepo = manager.getRepository(Doctor);
      const appointmentRepo = manager.getRepository(Appointment);

      const slot = await slotRepo.findOne({
        where: { id: dto.slotId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!slot) {
        throw new NotFoundException('Slot not found');
      }

      if (slot.isBooked) {
        throw new ForbiddenException('Slot is already booked');
      }

      if (slot.doctorId !== dto.doctorId) {
        throw new ForbiddenException('Slot does not belong to this doctor');
      }

      const now = new Date();
      if (slot.startTime <= now) {
        throw new ForbiddenException('Cannot book past slot');
      }

      const doctor = await doctorRepo.findOne({
        where: { id: dto.doctorId },
      });
      if (!doctor) {
        throw new NotFoundException('Doctor not found');
      }

      const consultationType =
        slot.consultationType ?? ConsultationType.IN_PERSON;
      if (
        consultationType === ConsultationType.ONLINE &&
        doctor.presence !== DoctorPresence.ONLINE
      ) {
        throw new ForbiddenException(
          'Doctor is not available for online consultation',
        );
      }

      slot.isBooked = true;
      await slotRepo.save(slot);

      const appointment = appointmentRepo.create({
        patient,
        doctor,
        slot,
        comment: dto.comment,
        status: AppointmentStatus.CONFIRMED,
        consultationType,
      });
      const saved = await appointmentRepo.save(appointment);
      await doctorRepo.increment({ id: doctor.id }, 'visitCount', 1);
      return saved;
    });
  }

  async getByIdForUser(current: RequestUser, id: string) {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id },
      relations: ['patient']
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (
      current.role !== UserRole.ADMIN &&
      appointment.patient.id !== current.userId
    ) {
      throw new ForbiddenException();
    }
    return appointment;
  }

  async cancelForUser(current: RequestUser, id: string) {
    const appointment = await this.appointmentsRepository.findOne({
      where: { id },
      relations: ['slot', 'patient', 'doctor'],
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    const isOwner = appointment.patient.id === current.userId;
    const isAdmin = current.role === UserRole.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException();
    }

    const cancelStatus = isAdmin
      ? AppointmentStatus.CANCELLED_BY_ADMIN
      : AppointmentStatus.CANCELLED_BY_PATIENT;

    await this.dataSource.transaction(async (manager) => {
      const appointmentRepo = manager.getRepository(Appointment);
      const slotRepo = manager.getRepository(ScheduleSlot);
      const doctorRepo = manager.getRepository(Doctor);

      const appt = await appointmentRepo.findOne({
        where: { id: appointment.id },
        relations: ['doctor'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!appt) {
        throw new NotFoundException('Appointment not found');
      }

      if (appt.status === AppointmentStatus.CONFIRMED && appt.doctor) {
        const d = await doctorRepo.findOne({
          where: { id: appt.doctor.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (d) {
          d.visitCount = Math.max(0, d.visitCount - 1);
          await doctorRepo.save(d);
        }
      }

      appt.status = cancelStatus;
      appt.cancelledAt = new Date();
      await appointmentRepo.save(appt);

      const slot = await slotRepo.findOne({
        where: { id: appointment.slot.id },
      });
      if (slot) {
        slot.isBooked = false;
        await slotRepo.save(slot);
      }
    });

    return { success: true };
  }

  async getMyAppointments(current: RequestUser) {
    return this.appointmentsRepository.find({
      where: { patient: { id: current.userId } },
      order: { createdAt: 'DESC' },
    });
  }
}

