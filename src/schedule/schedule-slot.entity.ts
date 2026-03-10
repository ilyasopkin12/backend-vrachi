import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Doctor } from '../doctors/doctor.entity';

@Entity({ name: 'schedule_slots' })
@Index(['doctor', 'startTime'], { unique: true })
export class ScheduleSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Doctor, { eager: true, onDelete: 'CASCADE' })
  doctor: Doctor;

  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  @Column({ default: false })
  isBooked: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

