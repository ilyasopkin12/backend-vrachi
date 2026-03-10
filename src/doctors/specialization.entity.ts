import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Doctor } from './doctor.entity';

@Entity({ name: 'specializations' })
export class Specialization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => Doctor, (doctor) => doctor.specialization)
  doctors: Doctor[];
}

