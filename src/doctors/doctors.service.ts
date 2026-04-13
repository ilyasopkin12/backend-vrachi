import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './doctor.entity';
import { QueryDoctorsDto } from './dto/query-doctors.dto';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { Specialization } from './specialization.entity';
import { DoctorPresence } from './doctor-presence.enum';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorsRepository: Repository<Doctor>,
    @InjectRepository(Specialization)
    private readonly specializationsRepository: Repository<Specialization>,
  ) {}

  async findAll(query: QueryDoctorsDto) {
    const qb = this.doctorsRepository.createQueryBuilder('doctor');
    qb.leftJoinAndSelect('doctor.specialization', 'specialization');

    if (query.specializationId) {
      qb.andWhere('specialization.id = :specializationId', {
        specializationId: query.specializationId,
      });
    }

    if (query.city) {
      qb.andWhere('LOWER(doctor.city) = LOWER(:city)', { city: query.city });
    }

    if (query.name) {
      qb.andWhere('LOWER(doctor.fullName) LIKE LOWER(:name)', {
        name: `%${query.name}%`,
      });
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const doctor = await this.doctorsRepository.findOne({
      where: { id },
      relations: ['specialization'],
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    return doctor;
  }

  async create(dto: CreateDoctorDto) {
    const specialization = await this.specializationsRepository.findOne({
      where: { id: dto.specializationId },
    });
    if (!specialization) {
      throw new NotFoundException('Specialization not found');
    }

    const doctor = this.doctorsRepository.create({
      name: dto.name,
      surname: dto.surname,
      specialization,
      city: dto.city,
      experienceYears: dto.experienceYears ?? 0,
      description: dto.description,
      isActive: dto.isActive ?? true,
      visitCount: 0,
      clinic: dto.clinic ?? '',
      cabinet: dto.cabinet ?? '',
      presence: dto.presence ?? DoctorPresence.OFFLINE,
    });
    return this.doctorsRepository.save(doctor);
  }

  async update(id: string, dto: UpdateDoctorDto) {
    const doctor = await this.doctorsRepository.findOne({ where: { id } });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (dto.specializationId) {
      const specialization = await this.specializationsRepository.findOne({
        where: { id: dto.specializationId },
      });
      if (!specialization) {
        throw new NotFoundException('Specialization not found');
      }
      doctor.specialization = specialization;
    }

    if (dto.name !== undefined) doctor.name = dto.name;
    if (dto.surname !== undefined) doctor.surname = dto.surname
    if (dto.city !== undefined) doctor.city = dto.city;
    if (dto.experienceYears !== undefined)
      doctor.experienceYears = dto.experienceYears;
    if (dto.description !== undefined) doctor.description = dto.description;
    if (dto.isActive !== undefined) doctor.isActive = dto.isActive;
    if (dto.clinic !== undefined) doctor.clinic = dto.clinic;
    if (dto.cabinet !== undefined) doctor.cabinet = dto.cabinet;
    if (dto.visitCount !== undefined) doctor.visitCount = dto.visitCount;
    if (dto.presence !== undefined) doctor.presence = dto.presence;

    return this.doctorsRepository.save(doctor);
  }

  async findAllForAdmin() {
    return this.doctorsRepository.find({
      order: { name: 'ASC' , surname : 'ASC'},
    });
  }
}

