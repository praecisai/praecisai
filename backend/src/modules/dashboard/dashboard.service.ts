import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(businessId: string) {
    const [
      totalCustomers,
      totalInvoices,
      activeCampaigns,
      outstandings,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { business_id: businessId } }),
      this.prisma.invoice.count({ where: { business_id: businessId } }),
      this.prisma.campaign.count({
        where: { business_id: businessId, status: { in: ['RUNNING', 'SCHEDULED'] } },
      }),
      this.prisma.outstanding.findMany({
        where: { business_id: businessId },
        select: { total_due: true, aging_bucket: true, segment: true, status: true },
      }),
    ]);

    // Total outstanding (active only)
    const totalOutstanding = outstandings
      .filter((o) => o.status === 'ACTIVE')
      .reduce((sum, o) => sum + o.total_due, 0);

    // Cleared total (recovery rate denominator)
    const totalCleared = outstandings
      .filter((o) => o.status === 'CLEARED')
      .reduce((sum, o) => sum + o.total_due, 0);

    const recoveryRate =
      totalOutstanding + totalCleared > 0
        ? Math.round((totalCleared / (totalOutstanding + totalCleared)) * 100)
        : 0;

    // Aging buckets
    const bucketLabels = ['0-60', '61-120', '121-180', '181+'];
    const bucketNames = ['Soft Reminder', 'Follow-up', 'Strong Follow-up', 'Escalation'];

    const aging_buckets = bucketLabels.map((bucket, i) => {
      const rows = outstandings.filter((o) => o.aging_bucket === bucket && o.status === 'ACTIVE');
      return {
        label: bucketNames[i],
        range: bucket,
        amount: rows.reduce((s, r) => s + r.total_due, 0),
        count: rows.length,
      };
    });

    // Segment distribution
    const segments = ['Soft Reminder', 'Follow-up', 'Strong Follow-up', 'Escalation', 'Cleared', 'Credit Note'];
    const segment_distribution = segments.map((seg) => {
      const rows = outstandings.filter((o) => o.segment === seg);
      return {
        segment: seg,
        count: rows.length,
        amount: rows.reduce((s, r) => s + r.total_due, 0),
      };
    });

    return {
      total_outstanding: totalOutstanding,
      total_customers: totalCustomers,
      total_invoices: totalInvoices,
      active_campaigns: activeCampaigns,
      recovery_rate: recoveryRate,
      aging_buckets,
      segment_distribution,
    };
  }

  async getRecentActivity(businessId: string, limit = 10) {
    const [recentImports, recentInvoices, recentCalls, recentWhatsapp] = await Promise.all([
      this.prisma.importHistory.findMany({
        where: { business_id: businessId },
        take: limit,
        orderBy: { created_at: 'desc' },
        select: { id: true, file_name: true, status: true, records_imported: true, created_at: true },
      }),
      this.prisma.invoice.findMany({
        where: { business_id: businessId },
        take: limit,
        orderBy: { created_at: 'desc' },
        select: { id: true, invoice_number: true, due_amount: true, status: true, created_at: true,
          customer: { select: { customer_name: true } } },
      }),
      this.prisma.callLog.findMany({
        where: { business_id: businessId },
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true, call_status: true, disposition: true, call_summary: true,
          promise_date: true, duration_seconds: true, created_at: true, next_call_at: true,
          customer: { select: { id: true, customer_name: true } },
        },
      }),
      this.prisma.whatsAppLog.findMany({
        where: { business_id: businessId },
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true, message: true, delivery_status: true, created_at: true,
          customer: { select: { id: true, customer_name: true } },
        },
      }),
    ]);

    return {
      recent_imports: recentImports,
      recent_invoices: recentInvoices,
      recent_calls: recentCalls,
      recent_whatsapp: recentWhatsapp,
    };
  }
}
