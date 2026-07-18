import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CallDisposition } from '@prisma/client';
import { parseSegmentRules } from '../../common/utils/segment.util';

// ─── Recovery report classification ──────────────────────────────────────────
// Positive report  = customers responding well to calls.
// Negative report  = customers the AI cannot recover: needs human action.
//
// Rules (per business owner's spec):
//   INTERESTED                     → positive (acknowledged debt, willing)
//   PTP with < 4 promises          → positive (promised a payment date)
//   PTP with >= 4 promises         → negative (serial promiser, never pays)
//   NOT_INTERESTED (latest call)   → negative IMMEDIATELY (an outright
//     refusal is a serious signal; the row shows total refusals so far).
//     A later better outcome (promise/interest) moves them back out.
//   CALLBACK        > 6 in a row   → negative (keeps deflecting)
//   NO_ANSWER       > 6 in a row   → negative (unreachable)
//   UNKNOWN         > 6 in a row   → negative (calls going nowhere)
//   DISPUTE         > 6 in a row   → negative (dispute never resolves).
//     Every call to a disputing customer starts with a "did it get sorted?"
//     check (dispute_note in calling.service); a resolved dispute ends the
//     streak because that call's disposition is no longer DISPUTE.

const CONSECUTIVE_LIMIT = 6; // "more than 6 continuous calls"
const PTP_LIMIT = 4; // 4+ promises without paying = negative

// Plain-English labels a non-technical user understands at a glance
export const DISPOSITION_LABELS: Record<string, string> = {
  INTERESTED: 'Willing to Pay',
  PTP: 'Promised to Pay',
  NOT_INTERESTED: 'Refused to Pay',
  CALLBACK: 'Keeps Asking to Call Later',
  NO_ANSWER: 'Not Answering Calls',
  DISPUTE: 'Disputed the Bill',
  UNKNOWN: 'Unclear Response',
};

export interface ReportEntry {
  customer_id: string;
  customer_name: string;
  city: string | null;
  phone: string | null;
  agent: string | null;
  total_due: number;
  total_calls: number;
  last_call_at: Date | null;
  last_disposition: string;
  label: string;
  streak: number;
  ptp_count: number;
  // Total "refused to pay" calls across the whole history (shown per row
  // in the negative report)
  refusal_count: number;
  reason: string;
  // Which negative rule caught this customer (undefined on positive entries)
  category?: string;
}

// Plain-English names of the negative rules, used for the per-rule counts
export const NEGATIVE_CATEGORIES = {
  PTP: 'Promised 4+ times',
  NOT_INTERESTED: 'Refused to pay',
  CALLBACK: 'Call-later on 7+ calls in a row',
  NO_ANSWER: 'No answer on 7+ calls in a row',
  UNKNOWN: 'Unclear on 7+ calls in a row',
  DISPUTE: 'Dispute unresolved on 7+ calls in a row',
} as const;

export interface EscalationEntry {
  customer_id: string;
  customer_name: string;
  city: string | null;
  phone: string | null;
  agent: string | null;
  total_due: number;
  days_overdue: number;
  total_calls: number;
  last_label: string;
  last_call_at: Date | null;
}

export interface SegmentOverviewSection {
  segment: string;
  range: string;
  count: number;
  amount: number;
  share: number; // % of total active outstanding
  entries: Array<{
    customer_id: string;
    customer_name: string;
    city: string | null;
    phone: string | null;
    agent: string | null;
    total_due: number;
    days_overdue: number;
  }>;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Classify every customer that has analyzed calls AND an active outstanding
   * into positive / negative / neither. Streaks are counted over the most
   * recent calls (consecutive same outcome, no gap).
   */
  async getRecoveryReport(businessId: string) {
    const [customers, callLogs] = await Promise.all([
      this.prisma.customer.findMany({
        where: {
          business_id: businessId,
          outstanding: { is: { status: 'ACTIVE', total_due: { gt: 0 } } },
        },
        select: {
          id: true,
          customer_name: true,
          city: true,
          phone: true,
          assigned_agent: true,
          outstanding: { select: { total_due: true } },
        },
      }),
      this.prisma.callLog.findMany({
        where: { business_id: businessId, disposition: { not: null } },
        select: { customer_id: true, disposition: true, created_at: true },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    // Group call dispositions per customer, newest first
    const logsByCustomer = new Map<string, { disposition: CallDisposition; created_at: Date }[]>();
    for (const log of callLogs) {
      const list = logsByCustomer.get(log.customer_id) ?? [];
      list.push({ disposition: log.disposition!, created_at: log.created_at });
      logsByCustomer.set(log.customer_id, list);
    }

    const positive: ReportEntry[] = [];
    const negative: ReportEntry[] = [];

    for (const c of customers) {
      const logs = logsByCustomer.get(c.id);
      if (!logs || logs.length === 0) continue;

      const latest = logs[0].disposition;

      // Consecutive streak of the latest disposition (continuous, no gap)
      let streak = 0;
      for (const l of logs) {
        if (l.disposition === latest) streak++;
        else break;
      }

      // Totals across the whole history
      const ptpCount = logs.filter((l) => l.disposition === 'PTP').length;
      const refusalCount = logs.filter((l) => l.disposition === 'NOT_INTERESTED').length;

      const base: Omit<ReportEntry, 'reason'> = {
        customer_id: c.id,
        customer_name: c.customer_name,
        city: c.city,
        phone: c.phone,
        agent: c.assigned_agent,
        total_due: c.outstanding?.total_due ?? 0,
        total_calls: logs.length,
        last_call_at: logs[0].created_at,
        last_disposition: latest,
        label: DISPOSITION_LABELS[latest] ?? latest,
        streak,
        ptp_count: ptpCount,
        refusal_count: refusalCount,
      };

      // DISPUTE: still under resolution while the streak is short; a customer
      // who keeps saying "issue abhi bhi hai" call after call is stalling
      if (latest === 'DISPUTE') {
        if (streak > CONSECUTIVE_LIMIT) {
          negative.push({
            ...base,
            category: NEGATIVE_CATEGORIES.DISPUTE,
            reason: `Says the bill is disputed on ${streak} calls in a row: needs manual resolution`,
          });
        }
        continue;
      }

      // ── Negative rules first (they override) ──
      // An outright refusal is negative IMMEDIATELY: no streak needed.
      // The reason carries the running total of refusals up to today.
      if (latest === 'NOT_INTERESTED') {
        negative.push({
          ...base,
          category: NEGATIVE_CATEGORIES.NOT_INTERESTED,
          reason: `Refused to pay ${refusalCount} time${refusalCount === 1 ? '' : 's'} so far${streak > 1 ? ` (${streak} in a row)` : ''}`,
        });
        continue;
      }
      if (ptpCount >= PTP_LIMIT) {
        negative.push({
          ...base,
          label: DISPOSITION_LABELS.PTP,
          category: NEGATIVE_CATEGORIES.PTP,
          reason: `Promised to pay ${ptpCount} times but has not paid`,
        });
        continue;
      }
      if (latest === 'CALLBACK' && streak > CONSECUTIVE_LIMIT) {
        negative.push({ ...base, category: NEGATIVE_CATEGORIES.CALLBACK, reason: `Asked to call back ${streak} times in a row: avoiding payment` });
        continue;
      }
      if (latest === 'NO_ANSWER' && streak > CONSECUTIVE_LIMIT) {
        negative.push({ ...base, category: NEGATIVE_CATEGORIES.NO_ANSWER, reason: `Did not pick up ${streak} calls in a row` });
        continue;
      }
      if (latest === 'UNKNOWN' && streak > CONSECUTIVE_LIMIT) {
        negative.push({ ...base, category: NEGATIVE_CATEGORIES.UNKNOWN, reason: `${streak} calls in a row with no clear outcome` });
        continue;
      }

      // ── Positive rules ──
      if (latest === 'INTERESTED') {
        positive.push({ ...base, reason: 'Acknowledged the amount and is willing to pay' });
        continue;
      }
      if (latest === 'PTP') {
        positive.push({
          ...base,
          reason: `Gave a payment promise (${ptpCount} promise${ptpCount === 1 ? '' : 's'} so far)`,
        });
        continue;
      }
      // Everyone else (streak below the limit) is still "in progress" —
      // they belong to neither report yet.
    }

    // Biggest amounts first: that is what the owner acts on
    positive.sort((a, b) => b.total_due - a.total_due);
    negative.sort((a, b) => b.total_due - a.total_due);

    // Per-rule counts so the owner sees WHY customers went negative at a glance
    const negative_breakdown = Object.values(NEGATIVE_CATEGORIES)
      .map((category) => {
        const rows = negative.filter((e) => e.category === category);
        return {
          category,
          count: rows.length,
          amount: rows.reduce((s, e) => s + e.total_due, 0),
        };
      })
      .filter((b) => b.count > 0);

    return {
      positive,
      negative,
      summary: {
        positive_count: positive.length,
        positive_amount: positive.reduce((s, e) => s + e.total_due, 0),
        negative_count: negative.length,
        negative_amount: negative.reduce((s, e) => s + e.total_due, 0),
        customers_with_calls: logsByCustomer.size,
        negative_breakdown,
      },
    };
  }

  /**
   * Every ACTIVE party currently in the Escalation range, with the age of
   * their oldest unpaid bill and how the AI calls have been going.
   */
  async getEscalationReport(businessId: string): Promise<EscalationEntry[]> {
    const outs = await this.prisma.outstanding.findMany({
      where: { business_id: businessId, status: 'ACTIVE', segment: 'Escalation' },
      include: {
        customer: {
          select: { id: true, customer_name: true, city: true, phone: true, assigned_agent: true },
        },
      },
      orderBy: { total_due: 'desc' },
    });
    const ids = outs.map((o) => o.customer_id);
    if (ids.length === 0) return [];

    const [maxDays, callLogs] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['customer_id'],
        where: { business_id: businessId, customer_id: { in: ids }, due_amount: { gt: 0 } },
        _max: { days_overdue: true },
      }),
      this.prisma.callLog.findMany({
        where: { business_id: businessId, customer_id: { in: ids }, disposition: { not: null } },
        select: { customer_id: true, disposition: true, created_at: true },
        orderBy: { created_at: 'desc' },
      }),
    ]);
    const daysByCustomer = new Map(maxDays.map((d) => [d.customer_id, d._max.days_overdue ?? 0]));
    const callsByCustomer = new Map<string, { count: number; latest: CallDisposition; at: Date }>();
    for (const log of callLogs) {
      const cur = callsByCustomer.get(log.customer_id);
      if (cur) cur.count++;
      else callsByCustomer.set(log.customer_id, { count: 1, latest: log.disposition!, at: log.created_at });
    }

    return outs.map((o) => {
      const calls = callsByCustomer.get(o.customer_id);
      return {
        customer_id: o.customer_id,
        customer_name: o.customer.customer_name,
        city: o.customer.city,
        phone: o.customer.phone,
        agent: o.customer.assigned_agent,
        total_due: o.total_due,
        days_overdue: daysByCustomer.get(o.customer_id) ?? 0,
        total_calls: calls?.count ?? 0,
        last_label: calls ? DISPOSITION_LABELS[calls.latest] ?? calls.latest : 'Not called yet',
        last_call_at: calls?.at ?? null,
      };
    });
  }

  /**
   * Owner's overview: every segment with its day range, customer count,
   * amount, share of the total, and the full party list per segment.
   */
  async getSegmentOverview(businessId: string) {
    const [business, outs, clearedCount] = await Promise.all([
      this.prisma.business.findUnique({
        where: { id: businessId },
        select: { segment_rules: true },
      }),
      this.prisma.outstanding.findMany({
        where: { business_id: businessId, status: 'ACTIVE' },
        include: {
          customer: {
            select: { id: true, customer_name: true, city: true, phone: true, assigned_agent: true },
          },
        },
        orderBy: { total_due: 'desc' },
      }),
      this.prisma.outstanding.count({ where: { business_id: businessId, status: 'CLEARED' } }),
    ]);

    const ids = outs.map((o) => o.customer_id);
    const maxDays = ids.length
      ? await this.prisma.invoice.groupBy({
          by: ['customer_id'],
          where: { business_id: businessId, customer_id: { in: ids }, due_amount: { gt: 0 } },
          _max: { days_overdue: true },
        })
      : [];
    const daysByCustomer = new Map(maxDays.map((d) => [d.customer_id, d._max.days_overdue ?? 0]));

    const rules = [...parseSegmentRules(business?.segment_rules)].sort((a, b) => a.min_days - b.min_days);
    const totalOutstanding = outs.reduce((s, o) => s + o.total_due, 0);

    const segments: SegmentOverviewSection[] = rules.map((rule) => {
      const rows = outs.filter((o) => o.segment === rule.segment);
      const amount = rows.reduce((s, o) => s + o.total_due, 0);
      return {
        segment: rule.segment,
        range: rule.max_days === null ? `${rule.min_days}+ days` : `${rule.min_days} - ${rule.max_days} days`,
        count: rows.length,
        amount,
        share: totalOutstanding > 0 ? Math.round((amount / totalOutstanding) * 100) : 0,
        entries: rows.map((o) => ({
          customer_id: o.customer_id,
          customer_name: o.customer.customer_name,
          city: o.customer.city,
          phone: o.customer.phone,
          agent: o.customer.assigned_agent,
          total_due: o.total_due,
          days_overdue: daysByCustomer.get(o.customer_id) ?? 0,
        })),
      };
    });

    return {
      segments,
      total_outstanding: totalOutstanding,
      total_customers: outs.length,
      cleared_count: clearedCount,
    };
  }
}
