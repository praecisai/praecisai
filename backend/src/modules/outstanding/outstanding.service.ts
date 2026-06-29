import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getSegment, getAgingBucket, DEFAULT_SEGMENT_RULES } from '../../common/utils/segment.util';
import { PdcService } from '../pdc/pdc.service';

export class OutstandingFiltersDto {
  segment?: string;
  aging_bucket?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class OutstandingService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => PdcService)) private pdcService: PdcService,
  ) {}

  async findAll(businessId: string, filters: OutstandingFiltersDto = {}) {
    const { segment, aging_bucket, status, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { business_id: businessId };
    if (segment) where.segment = segment;
    if (aging_bucket) where.aging_bucket = aging_bucket;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.outstanding.findMany({
        where, skip, take: limit,
        orderBy: { total_due: 'desc' },
        include: {
          customer: { select: { id: true, customer_name: true, phone: true, city: true } },
        },
      }),
      this.prisma.outstanding.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findByCustomer(businessId: string, customerId: string) {
    return this.prisma.outstanding.findFirst({
      where: { business_id: businessId, customer_id: customerId },
    });
  }

  /**
   * Recalculate outstanding for a single customer based on their invoices.
   * Called after import or invoice update.
   */
  async recalculateForCustomer(businessId: string, customerId: string) {
    // Snapshot previous outstanding before recalc (for PDC detection)
    const prevOutstanding = await this.prisma.outstanding.findUnique({
      where: { customer_id: customerId },
      select: { total_due: true },
    });
    const prevDue = prevOutstanding?.total_due ?? 0;

    const invoices = await this.prisma.invoice.findMany({
      where: { business_id: businessId, customer_id: customerId },
    });

    const totalDue = invoices.reduce((sum, inv) => {
      return inv.due_amount > 0 ? sum + inv.due_amount : sum;
    }, 0);

    const maxDaysOverdue = invoices.reduce((max, inv) => {
      return inv.due_amount > 0 ? Math.max(max, inv.days_overdue) : max;
    }, 0);

    const segment = getSegment(maxDaysOverdue, totalDue, DEFAULT_SEGMENT_RULES);
    const agingBucket = getAgingBucket(maxDaysOverdue);
    const status = totalDue === 0 ? 'CLEARED' : 'ACTIVE';

    const result = await this.prisma.outstanding.upsert({
      where: { customer_id: customerId },
      create: {
        business_id: businessId,
        customer_id: customerId,
        total_due: totalDue,
        aging_bucket: agingBucket,
        segment,
        status: status as any,
      },
      update: {
        total_due: totalDue,
        aging_bucket: agingBucket,
        segment,
        status: status as any,
      },
    });

    // Detect PDC cheque clearing if outstanding amount decreased
    if (prevDue > 0 && totalDue < prevDue) {
      try {
        await this.pdcService.detectClearedCheques(businessId, customerId, prevDue, totalDue);
      } catch (e) {
        // non-blocking — PDC detection failure should not break import
      }
    }

    return result;
  }

  /**
   * Batch recalculate all customers for a business.
   */
  async recalculateAll(businessId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { business_id: businessId },
      select: { id: true },
    });

    const results = await Promise.allSettled(
      customers.map((c) => this.recalculateForCustomer(businessId, c.id)),
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return { succeeded, failed, total: customers.length };
  }

  async getAgingBreakdown(businessId: string) {
    const buckets = ['0-60', '61-120', '121-180', '181+'];

    const results = await Promise.all(
      buckets.map(async (bucket) => {
        const rows = await this.prisma.outstanding.findMany({
          where: { business_id: businessId, aging_bucket: bucket, status: 'ACTIVE' },
          select: { total_due: true },
        });
        return {
          bucket,
          count: rows.length,
          amount: rows.reduce((s, r) => s + r.total_due, 0),
        };
      }),
    );

    return results;
  }
}
