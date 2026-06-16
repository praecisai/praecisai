import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// STUB: WhatsApp Cloud API integration not yet implemented
// Logs are stored for future use when API is integrated

@Injectable()
export class WhatsappService {
  constructor(private prisma: PrismaService) {}

  async getLogs(businessId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.whatsAppLog.findMany({
        where: { business_id: businessId }, skip, take: limit,
        orderBy: { created_at: 'desc' },
        include: { customer: { select: { id: true, customer_name: true } } },
      }),
      this.prisma.whatsAppLog.count({ where: { business_id: businessId } }),
    ]);
    return { data, total, page, limit };
  }

  async createLog(businessId: string, dto: any) {
    return this.prisma.whatsAppLog.create({
      data: { business_id: businessId, ...dto },
    });
  }
}
