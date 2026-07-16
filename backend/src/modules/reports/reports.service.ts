import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CallDisposition } from '@prisma/client';

// ─── Recovery report classification ──────────────────────────────────────────
// Positive report  = customers responding well to calls.
// Negative report  = customers the AI cannot recover — needs human action.
//
// Rules (per business owner's spec):
//   INTERESTED                     → positive (acknowledged debt, willing)
//   PTP with < 4 promises          → positive (promised a payment date)
//   PTP with >= 4 promises         → negative (serial promiser, never pays)
//   NOT_INTERESTED  > 6 in a row   → negative (keeps refusing)
//   CALLBACK        > 6 in a row   → negative (keeps deflecting)
//   NO_ANSWER       > 6 in a row   → negative (unreachable)
//   UNKNOWN         > 6 in a row   → negative (calls going nowhere)
//   DISPUTE                        → excluded for now (handling TBD)

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
  reason: string;
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

      // Total promises made across the whole history
      const ptpCount = logs.filter((l) => l.disposition === 'PTP').length;

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
      };

      // DISPUTE handling is TBD — excluded from both reports for now
      if (latest === 'DISPUTE') continue;

      // ── Negative rules first (they override) ──
      if (ptpCount >= PTP_LIMIT) {
        negative.push({
          ...base,
          label: DISPOSITION_LABELS.PTP,
          reason: `Promised to pay ${ptpCount} times but has not paid`,
        });
        continue;
      }
      if (latest === 'NOT_INTERESTED' && streak > CONSECUTIVE_LIMIT) {
        negative.push({ ...base, reason: `Refused to pay on ${streak} calls in a row` });
        continue;
      }
      if (latest === 'CALLBACK' && streak > CONSECUTIVE_LIMIT) {
        negative.push({ ...base, reason: `Asked to call back ${streak} times in a row — avoiding payment` });
        continue;
      }
      if (latest === 'NO_ANSWER' && streak > CONSECUTIVE_LIMIT) {
        negative.push({ ...base, reason: `Did not pick up ${streak} calls in a row` });
        continue;
      }
      if (latest === 'UNKNOWN' && streak > CONSECUTIVE_LIMIT) {
        negative.push({ ...base, reason: `${streak} calls in a row with no clear outcome` });
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

    // Biggest amounts first — that is what the owner acts on
    positive.sort((a, b) => b.total_due - a.total_due);
    negative.sort((a, b) => b.total_due - a.total_due);

    return {
      positive,
      negative,
      summary: {
        positive_count: positive.length,
        positive_amount: positive.reduce((s, e) => s + e.total_due, 0),
        negative_count: negative.length,
        negative_amount: negative.reduce((s, e) => s + e.total_due, 0),
        customers_with_calls: logsByCustomer.size,
      },
    };
  }
}
