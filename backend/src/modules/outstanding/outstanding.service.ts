import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { IsOptional } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { getSegment, getAgingBucket, parseSegmentRules } from '../../common/utils/segment.util';
import { PdcService } from '../pdc/pdc.service';

export class OutstandingFiltersDto {
  @IsOptional() segment?: string;
  @IsOptional() aging_bucket?: string;
  @IsOptional() status?: string;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
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

    const [invoices, business] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { business_id: businessId, customer_id: customerId },
      }),
      this.prisma.business.findUnique({
        where: { id: businessId },
        select: { segment_rules: true },
      }),
    ]);
    const rules = parseSegmentRules(business?.segment_rules);

    const totalDue = invoices.reduce((sum, inv) => {
      return inv.due_amount > 0 ? sum + inv.due_amount : sum;
    }, 0);

    const maxDaysOverdue = invoices.reduce((max, inv) => {
      return inv.due_amount > 0 ? Math.max(max, inv.days_overdue) : max;
    }, 0);

    const segment = getSegment(maxDaysOverdue, totalDue, rules);
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
   * Set-based recalc for many customers at once (used by import).
   * 2 reads + chunked parallel upserts instead of 4+ queries per customer.
   * PDC cheque detection still runs, but only for the customers whose due
   * actually decreased — on a fresh import that is nobody.
   */
  async bulkRecalculate(businessId: string, customerIds: string[]): Promise<number> {
    if (customerIds.length === 0) return 0;

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { segment_rules: true },
    });
    const rules = parseSegmentRules(business?.segment_rules);

    const prev = await this.prisma.outstanding.findMany({
      where: { business_id: businessId, customer_id: { in: customerIds } },
      select: { customer_id: true, total_due: true },
    });
    const prevDueByCustomer = new Map(prev.map((o) => [o.customer_id, o.total_due]));

    const grouped = await this.prisma.invoice.groupBy({
      by: ['customer_id'],
      where: {
        business_id: businessId,
        customer_id: { in: customerIds },
        due_amount: { gt: 0 },
      },
      _sum: { due_amount: true },
      _max: { days_overdue: true },
    });
    const totalsByCustomer = new Map(
      grouped.map((g) => [
        g.customer_id,
        { totalDue: g._sum.due_amount ?? 0, maxDays: g._max.days_overdue ?? 0 },
      ]),
    );

    const CHUNK = 25;
    let updated = 0;
    const decreased: Array<{ customerId: string; prevDue: number; newDue: number }> = [];

    for (let i = 0; i < customerIds.length; i += CHUNK) {
      const chunk = customerIds.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map(async (customerId) => {
          const totals = totalsByCustomer.get(customerId) ?? { totalDue: 0, maxDays: 0 };
          const segment = getSegment(totals.maxDays, totals.totalDue, rules);
          const agingBucket = getAgingBucket(totals.maxDays);
          const status = totals.totalDue === 0 ? 'CLEARED' : 'ACTIVE';

          await this.prisma.outstanding.upsert({
            where: { customer_id: customerId },
            create: {
              business_id: businessId,
              customer_id: customerId,
              total_due: totals.totalDue,
              aging_bucket: agingBucket,
              segment,
              status: status as any,
            },
            update: {
              total_due: totals.totalDue,
              aging_bucket: agingBucket,
              segment,
              status: status as any,
            },
          });
          updated++;

          const prevDue = prevDueByCustomer.get(customerId) ?? 0;
          if (prevDue > 0 && totals.totalDue < prevDue) {
            decreased.push({ customerId, prevDue, newDue: totals.totalDue });
          }
        }),
      );
    }

    for (const d of decreased) {
      try {
        await this.pdcService.detectClearedCheques(businessId, d.customerId, d.prevDue, d.newDue);
      } catch {
        // non-blocking — PDC detection failure should not break import
      }
    }

    return updated;
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

  /**
   * Per-segment totals for the Outstandings header cards — segments are the
   * only grouping concept the product exposes (their day ranges are the
   * business's own segment_rules).
   */
  async getSegmentBreakdown(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { segment_rules: true },
    });
    const order = parseSegmentRules(business?.segment_rules).map((r) => r.segment);

    const grouped = await this.prisma.outstanding.groupBy({
      by: ['segment'],
      where: { business_id: businessId, status: 'ACTIVE' },
      _count: { _all: true },
      _sum: { total_due: true },
    });

    const bySegment = new Map(grouped.map((g) => [g.segment, g]));
    return order.map((segment) => ({
      segment,
      count: bySegment.get(segment)?._count._all ?? 0,
      amount: bySegment.get(segment)?._sum.total_due ?? 0,
    }));
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
