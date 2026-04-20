import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserRole } from './user-role.enum';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  name: string;

  @Column()
  surname: string;

  @Column({type: 'varchar', nullable: true })
  phone?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.PATIENT,
  })
  role: UserRole;

  @Column({ type: 'varchar', nullable: true })
  refreshTokenHash?: string | null;

  /**
   * Последняя активность на сайте (пинг WebSocket / heartbeat).
   * «Онлайн» на фронте обычно: now - lastSeenAt < порога (например 1–2 мин).
   */
  @Column({ type: 'timestamptz', nullable: true })
  lastSeenAt?: Date | null;

  /** Подтверждённые приёмы (без отменённых): прошедшие и предстоящие со статусом CONFIRMED. */
  @Column({ type: 'int', default: 0 })
  totalVisits: number;

  /** Актуальные предстоящие приёмы (CONFIRMED, слот в будущем); при чтении профиля сверяется с БД. */
  @Column({ type: 'int', default: 0 })
  upcomingVisits: number;

  @CreateDateColumn()
  createdAt: Date;
}
