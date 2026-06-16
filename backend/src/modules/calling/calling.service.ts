import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// STUB: Retell AI / Voice API not yet implemented

@Injectable()
export class CallingService {
  constructor(private prisma: PrismaService) {}

  async getLogs(businessId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.callLog.findMany({
        where: { business_id: businessId }, skip, take: limit,
        orderBy: { created_at: 'desc' },
        include: { customer: { select: { id: true, customer_name: true } } },
      }),
      this.prisma.callLog.count({ where: { business_id: businessId } }),
    ]);
    return { data, total, page, limit };
  }

  async createLog(businessId: string, dto: any) {
    return this.prisma.callLog.create({ data: { business_id: businessId, ...dto } });
  }
}
