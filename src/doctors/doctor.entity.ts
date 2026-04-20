import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Specialization } from './specialization.entity';
import { DoctorPresence } from './doctor-presence.enum';
import { User } from '../users/user.entity';

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

  /** Сколько раз пациенты записывались к врачу (увеличивается при создании записи, уменьшается при отмене). */
  @Column({ type: 'int', default: 0 })
  visitCount: number;

  @Column({ type: 'varchar', length: 255, default: '' })
  clinic: string;

  @Column({ type: 'varchar', length: 64, default: '' })
  cabinet: string;

  /** ONLINE — врач ведёт онлайн-консультации; OFFLINE — только очный приём. */
  @Column({
    type: 'enum',
    enum: DoctorPresence,
    default: DoctorPresence.OFFLINE,
  })
  presence: DoctorPresence;

  /**
   * Последняя активность врача (кабинет / отдельная сессия по doctorId).
   * Когда появится вход врача как User, можно дублировать пинг в users.lastSeenAt.
   */
  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt?: Date | null;

  /**
   * Связь с учёткой пользователя (будущий вход врача на сайт).
   * Пока null — присутствие обновляется только по doctorId.
   */
  @Index('UQ_doctors_userId', { unique: true })
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User | null;

  // Relations with slots and appointments will be defined
  // in corresponding entities to avoid circular dependencies.
}

