import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Doctor } from '../doctors/doctor.entity';
import { ScheduleSlot } from '../schedule/schedule-slot.entity';
import { AppointmentStatus } from './appointment-status.enum';
import { ConsultationType } from '../schedule/consultation-type.enum';

@Entity({ name: 'appointments' })
@Unique(['slot'])
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  patient: User;

  @ManyToOne(() => Doctor, { eager: true, onDelete: 'CASCADE' })
  doctor: Doctor;

  @ManyToOne(() => ScheduleSlot, { eager: true, onDelete: 'CASCADE' })
  slot: ScheduleSlot;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.CONFIRMED,
  })
  status: AppointmentStatus;

  @Column({
    type: 'enum',
    enum: ConsultationType,
    default: ConsultationType.IN_PERSON,
  })
  consultationType: ConsultationType;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt?: Date | null;
}

