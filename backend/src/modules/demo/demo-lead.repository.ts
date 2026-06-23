import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DemoLeadRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.DemoLeadCreateInput) {
    return this.prisma.demoLead.create({ data });
  }

  async findByPhone(phone: string) {
    return this.prisma.demoLead.findUnique({ where: { phone } });
  }

  async findById(id: string) {
    return this.prisma.demoLead.findUnique({ where: { id } });
  }

  async update(id: string, data: Prisma.DemoLeadUpdateInput) {
    return this.prisma.demoLead.update({ where: { id }, data });
  }

  async createRun(data: Prisma.DemoRunCreateInput) {
    return this.prisma.demoRun.create({ data });
  }

  async findRunsByLeadId(leadId: string) {
    return this.prisma.demoRun.findMany({
      where: { demo_lead_id: leadId },
      select: { party_name: true, demo_type: true, status: true },
      orderBy: { created_at: 'asc' },
    });
  }
}
