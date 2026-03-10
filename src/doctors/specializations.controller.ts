import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Specialization } from './specialization.entity';

@Controller('specializations')
export class SpecializationsController {
  constructor(
    @InjectRepository(Specialization)
    private readonly specializationsRepository: Repository<Specialization>,
  ) {}

  @Get()
  async findAll() {
    return this.specializationsRepository.find({
      order: { name: 'ASC' },
    });
  }
}

