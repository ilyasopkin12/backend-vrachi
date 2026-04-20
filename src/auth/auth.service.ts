import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Appointment } from '../appointments/appointment.entity';
import { AppointmentStatus } from '../appointments/appointment-status.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Appointment)
    private readonly appointmentsRepository: Repository<Appointment>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.usersRepository.create({
      email: dto.email,
      passwordHash,
      name: dto.name,
      surname: dto.surname,
      phone: dto.phone,
      totalVisits: 0,
      upcomingVisits: 0,
    });
    await this.usersRepository.save(user);

    const token = await this.signAccessToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        phone: user.phone,
        totalVisits: user.totalVisits,
        upcomingVisits: user.upcomingVisits,
      },
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueAuthTokens(user);
  }

  async refreshAccessToken(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessToken = await this.signAccessToken(user);
    return { accessToken };
  }

  async logout(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.refreshTokenHash = null;
    await this.usersRepository.save(user);
    return { success: true };
  }

  async getMe(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const realTotal = await this.appointmentsRepository.count({
      where: { patient: { id: user.id }, status: AppointmentStatus.CONFIRMED },
    });
    const realUpcoming = await this.appointmentsRepository
      .createQueryBuilder('a')
      .innerJoin('a.slot', 'slot')
      .where('a.patientId = :pid', { pid: user.id })
      .andWhere('a.status = :st', { st: AppointmentStatus.CONFIRMED })
      .andWhere('slot.startTime > :now', { now })
      .getCount();

    let dirty = false;
    if (user.totalVisits !== realTotal) {
      user.totalVisits = realTotal;
      dirty = true;
    }
    if (user.upcomingVisits !== realUpcoming) {
      user.upcomingVisits = realUpcoming;
      dirty = true;
    }
    if (dirty) {
      await this.usersRepository.save(user);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      surname: user.surname,
      phone: user.phone,
      role: user.role,
      totalVisits: user.totalVisits,
      upcomingVisits: user.upcomingVisits,
    };
  }

  private async issueAuthTokens(user: User) {
    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.signRefreshToken(user);
    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.save(user);

    return { accessToken, refreshToken };
  }

  private async signAccessToken(user: User): Promise<string> {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return this.jwtService.signAsync(payload);
  }

  private async signRefreshToken(user: User): Promise<string> {
    const payload = { sub: user.id };
    const refreshSecret =
      process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret';
    return this.jwtService.signAsync(payload, {
      secret: refreshSecret,
      expiresIn: '7d',
    });
  }

  private async verifyRefreshToken(refreshToken: string): Promise<{ sub: string }> {
    const refreshSecret =
      process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret';
    try {
      return await this.jwtService.verifyAsync<{ sub: string }>(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}

