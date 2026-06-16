import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// STUB: LLM integration (OpenAI/Claude) not yet implemented

@Injectable()
export class AiAnalysisService {
  constructor(private prisma: PrismaService) {}

  async findByCustomer(businessId: string, customerId: string) {
    return this.prisma.aIAnalysis.findMany({
      where: { business_id: businessId, customer_id: customerId },
      orderBy: { created_at: 'desc' },
    });
  }

  async create(businessId: string, dto: any) {
    return this.prisma.aIAnalysis.create({ data: { business_id: businessId, ...dto } });
  }
}
