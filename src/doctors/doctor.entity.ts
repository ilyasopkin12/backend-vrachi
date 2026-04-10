import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Specialization } from './specialization.entity';

@Entity({ name: 'doctors' })
export class Doctor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;
  
  @Column()
  surname: string;

  @ManyToOne(
    () => Specialization,
    (specialization) => specialization.doctors,
    { eager: true },
  )
  specialization: Specialization;

  @Column()
  city: string;

  @Column({ type: 'int', default: 0 })
  experienceYears: number;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ default: true })
  isActive: boolean;

  // Relations with slots and appointments will be defined
  // in corresponding entities to avoid circular dependencies.
}

