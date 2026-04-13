import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Doctor } from '../doctors/doctor.entity';
import { ConsultationType } from './consultation-type.enum';

@Entity({ name: 'schedule_slots' })
@Index(['doctor', 'startTime'], { unique: true })
export class ScheduleSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column()
  doctorId: string;

  @ManyToOne(() => Doctor, {  onDelete: 'CASCADE' })
  doctor: Doctor;

  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  @Column({ default: false })
  isBooked: boolean;

  @Column({
    type: 'enum',
    enum: ConsultationType,
    default: ConsultationType.IN_PERSON,
  })
  consultationType: ConsultationType;

  @CreateDateColumn()
  createdAt: Date;
}

