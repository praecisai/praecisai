/**
 * Re-run the post-call AI analysis on calls that have a transcript but no
 * outcome (disposition). Happens when OpenAI was unavailable when Bolna's
 * webhook arrived (e.g. the key ran out of credit), which leaves the Positive
 * / Negative reports empty.
 *
 *   npm run calls:backfill-analysis                          # dry run: counts only, no OpenAI calls
 *   npm run calls:backfill-analysis -- --apply --limit=5     # try a few first
 *   npm run calls:backfill-analysis -- --apply               # everything
 *   ... --business=<business id>                              # one tenant only
 *
 * Needs a working OPENAI_API_KEY. A key set in the shell wins over backend/.env.
 *
 * Writes ONLY data: call_summary, disposition, key_objection, language_used,
 * is_sensitive (+ cooldown from the call's date), promise_date/basis, and a
 * PromiseToPay row for promises. It never sends WhatsApps, schedules
 * re-dials, dials fallback numbers or charges credits: those belong to the
 * moment of the call, not to a backfill. Relative dates ("month end") are
 * resolved against the call's own date. Safe to re-run: only rows that still
 * have no disposition are picked up.
 */
import 'reflect-metadata';
import 'dotenv/config';
import { CallDisposition, CallLanguage, PrismaClient } from '@prisma/client';
import { CallExtractionService } from '../src/modules/calling/call-extraction.service';
import {
  computePromiseDate,
  promiseBasisLabel,
  PromiseIntent,
} from '../src/common/utils/promise-date.util';

const prisma = new PrismaClient();
const CONCURRENCY = 4;
const SENSITIVE_COOLDOWN_MS = 15 * 24 * 60 * 60 * 1000;

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  return hit.includes('=') ? hit.split('=').slice(1).join('=') : 'true';
}

// Same mapping as CallingService.mapPromiseIntent
function mapPromiseIntent(p: any): PromiseIntent {
  if (!p || !p.kind || p.kind === 'none') return { kind: 'none' };
  switch (p.kind) {
    case 'specific': {
      const at = p.datetime ? new Date(p.datetime) : null;
      return at && !isNaN(at.getTime()) ? { kind: 'specific', at } : { kind: 'none' };
    }
    case 'tomorrow':
      return { kind: 'tomorrow' };
    case 'relative_days':
      return { kind: 'relativeDays', days: Number(p.days) || 1 };
    case 'end_of_week':
      return { kind: 'endOfWeek' };
    case 'end_of_month':
      return { kind: 'endOfMonth' };
    default:
      return { kind: 'none' };
  }
}

async function main() {
  const apply = arg('apply') === 'true';
  const limit = arg('limit') ? parseInt(arg('limit')!, 10) : undefined;
  const businessId = arg('business');

  const where = {
    call_status: 'COMPLETED' as const,
    disposition: null,
    transcript: { not: null },
    ...(businessId ? { business_id: businessId } : {}),
  };

  const total = await prisma.callLog.count({ where });
  const perBusiness = await prisma.callLog.groupBy({ by: ['business_id'], where, _count: true });
  const names = await prisma.business.findMany({
    where: { id: { in: perBusiness.map((b) => b.business_id) } },
    select: { id: true, name: true },
  });
  console.log(`Calls with a transcript but no outcome: ${total}`);
  for (const b of perBusiness) {
    console.log(`  ${names.find((n) => n.id === b.business_id)?.name ?? b.business_id}: ${b._count}`);
  }

  if (!apply) {
    console.log('\nDry run: nothing analysed or written. Add --apply to run it.');
    return;
  }
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');

  const rows = await prisma.callLog.findMany({
    where,
    select: { id: true, business_id: true, customer_id: true, transcript: true, created_at: true },
    orderBy: { created_at: 'asc' },
    ...(limit ? { take: limit } : {}),
  });
  // Same 30-char floor as the extractor: "assistant: Hello .?" with no reply is
  // not a conversation, so there is nothing to classify (live calls leave
  // these without an outcome too).
  const shortCount = rows.filter((r) => (r.transcript ?? '').trim().length < 30).length;
  const toAnalyse = rows.filter((r) => (r.transcript ?? '').trim().length >= 30);
  console.log(`\nSkipping ${shortCount} call(s) with no real conversation.`);
  console.log(`Analysing ${toAnalyse.length} call(s), ${CONCURRENCY} at a time...`);

  const extractor = new CallExtractionService();
  const counts: Record<string, number> = {};
  let done = 0;
  let failed = 0;
  let promises = 0;

  // Fail fast if OpenAI rejects the key or has no credit, instead of
  // burning through every row with the same error.
  let consecutiveFailures = 0;

  const queue = [...toAnalyse];
  async function worker() {
    while (queue.length) {
      if (consecutiveFailures >= 5) return;
      const row = queue.shift()!;
      const ex = await extractor.extract(row.transcript ?? '', row.created_at);
      if (!ex) {
        failed++;
        consecutiveFailures++;
        continue;
      }
      consecutiveFailures = 0;

      const intent = mapPromiseIntent(ex.promise);
      const promiseDate = computePromiseDate(intent, row.created_at);
      const isSensitive = ex.is_sensitive ?? false;

      await prisma.callLog.update({
        where: { id: row.id },
        data: {
          call_summary: ex.call_summary,
          disposition: ex.disposition as CallDisposition,
          key_objection: ex.key_objection,
          language_used: ex.language_used as CallLanguage,
          is_sensitive: isSensitive,
          sensitive_cooldown_until: isSensitive
            ? new Date(row.created_at.getTime() + SENSITIVE_COOLDOWN_MS)
            : null,
          promise_date: promiseDate,
          promise_basis: promiseDate ? promiseBasisLabel(intent) : null,
        },
      });

      if (promiseDate) {
        const outstanding = await prisma.outstanding.findUnique({
          where: { customer_id: row.customer_id },
          select: { total_due: true },
        });
        await prisma.promiseToPay.create({
          data: {
            business_id: row.business_id,
            customer_id: row.customer_id,
            promised_amount: outstanding?.total_due ?? 0,
            promised_date: promiseDate,
            notes: `Backfilled from AI call: ${ex.call_summary ?? ''}`.slice(0, 500),
            created_at: row.created_at,
          },
        });
        promises++;
      }

      counts[ex.disposition] = (counts[ex.disposition] ?? 0) + 1;
      done++;
      if (done % 25 === 0) console.log(`  ${done}/${toAnalyse.length} done`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\nAnalysed: ${done} · failed: ${failed} · promises recorded: ${promises}`);
  console.log('Outcomes:', counts);
  if (consecutiveFailures >= 5) {
    console.log('\nStopped early: 5 analyses failed in a row. Check the OpenAI key / credit, then re-run.');
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
