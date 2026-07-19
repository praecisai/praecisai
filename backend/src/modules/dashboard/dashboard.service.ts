import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantKeysService } from '../billing/tenant-keys.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private tenantKeys: TenantKeysService,
  ) {}

  async getStats(businessId: string) {
    const [
      totalCustomers,
      totalInvoices,
      outstandings,
      creditNotes,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { business_id: businessId } }),
      this.prisma.invoice.count({ where: { business_id: businessId } }),
      this.prisma.outstanding.findMany({
        where: { business_id: businessId },
        select: { total_due: true, aging_bucket: true, segment: true, status: true },
      }),
      // Credit notes (negative dues) are kept out of per-customer total_due;
      // netting them here makes the headline match Tally's GRAND TOTALS
      this.prisma.invoice.aggregate({
        where: { business_id: businessId, due_amount: { lt: 0 } },
        _sum: { due_amount: true },
      }),
    ]);

    // Total outstanding (active only)
    const totalOutstanding = outstandings
      .filter((o) => o.status === 'ACTIVE')
      .reduce((sum, o) => sum + o.total_due, 0);
    const creditNoteSum = creditNotes._sum.due_amount ?? 0;
    const netOutstanding = totalOutstanding + creditNoteSum;

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
      total_outstanding: netOutstanding,
      credit_note_total: creditNoteSum,
      total_customers: totalCustomers,
      total_invoices: totalInvoices,
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
          promise_date: true, duration_seconds: true, created_at: true,
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

  // Per-business cache: tenants hold their OWN Bolna accounts
  private creditsCache = new Map<string, { data: object; fetchedAt: number }>();

  async getCredits(businessId: string) {
    const cached = this.creditsCache.get(businessId);
    if (cached && Date.now() - cached.fetchedAt < 60_000) {
      return cached.data;
    }

    // Tenant-record key first, platform env fallback (pre-migration tenants)
    const { apiKey, agentId } = await this.tenantKeys.getBolnaKeys(businessId);
    if (!apiKey) throw new Error('No Bolna account connected for this business');

    const headers = { Authorization: `Bearer ${apiKey}` };
    const meRes = await fetch('https://api.bolna.dev/me', { headers });
    if (!meRes.ok) throw new Error('Could not fetch Bolna credits');
    const me = await meRes.json();
    const balanceUsd = Math.round(me.wallet) / 100;

    let avgCallCostUsd: number | null = null;
    try {
      const exRes = await fetch(
        `https://api.bolna.dev/v2/agent/${agentId}/executions?page_size=5`,
        { headers },
      );
      if (exRes.ok) {
        const ex = await exRes.json();
        const items: any[] = Array.isArray(ex) ? ex : (ex?.data ?? []);
        const costs = items
          .map((e) => e?.total_cost)
          .filter((c): c is number => typeof c === 'number' && c > 0);
        if (costs.length) {
          avgCallCostUsd = costs.reduce((s, c) => s + c, 0) / costs.length / 100;
        }
      }
    } catch { }

    let deepgramUsd: number | null = null;
    const dgKey = process.env.DEEPGRAM_API_KEY;
    if (dgKey) {
      try {
        const dgHeaders = { Authorization: `Token ${dgKey}` };
        const projRes = await fetch('https://api.deepgram.com/v1/projects', { headers: dgHeaders });
        if (projRes.ok) {
          const projects = (await projRes.json())?.projects ?? [];
          if (projects[0]?.project_id) {
            const balRes = await fetch(
              `https://api.deepgram.com/v1/projects/${projects[0].project_id}/balances`,
              { headers: dgHeaders },
            );
            if (balRes.ok) {
              const balances: any[] = (await balRes.json())?.balances ?? [];
              deepgramUsd =
                Math.round(balances.reduce((s, b) => s + (Number(b?.amount) || 0), 0) * 100) / 100;
            }
          }
        }
      } catch { }
    }

    const data = {
      balanceUsd,
      avgCallCostUsd: avgCallCostUsd !== null ? Math.round(avgCallCostUsd * 1000) / 1000 : null,
      estCallsLeft:
        avgCallCostUsd !== null && avgCallCostUsd > 0
          ? Math.max(0, Math.floor(balanceUsd / avgCallCostUsd))
          : null,
      deepgramUsd,
    };
    this.creditsCache.set(businessId, { data, fetchedAt: Date.now() });
    return data;
  }
}
