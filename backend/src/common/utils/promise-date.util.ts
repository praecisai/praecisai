// ─── Promise-to-Pay date computation ─────────────────────────────────────────
// The extraction LLM returns only INTENT ("end of the month", "+7 days"); the
// actual calendar date is computed HERE, deterministically, using today's IST
// wall-clock. LLMs miscompute relative dates (they turned "end of the month"
// into the call date), so no date arithmetic is ever left to the model.

const IST_OFFSET_MIN = 330; // UTC+5:30
const PROMISE_HOUR_IST = 12; // store promises at noon IST to avoid date rollover

export type PromiseIntent =
  | { kind: 'none' }
  | { kind: 'specific'; at: Date } // a concrete date the customer stated
  | { kind: 'tomorrow' }
  | { kind: 'relativeDays'; days: number } // "ek hafte mein" (7), "do din mein" (2)
  | { kind: 'endOfWeek' } // "is hafte ke end tak"
  | { kind: 'endOfMonth' }; // "mahine ke end tak"

/** A Date whose UTC getters read as IST wall-clock. */
function toIstWall(now: Date): Date {
  return new Date(now.getTime() + IST_OFFSET_MIN * 60_000);
}

/** Real UTC instant for a given IST wall-clock date at noon. Day overflow
 *  (e.g. day 32) rolls into the next month, exactly like Date.UTC. */
function istNoon(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day, PROMISE_HOUR_IST, 0) - IST_OFFSET_MIN * 60_000);
}

/**
 * Short human label for WHY a promise date was set, shown in the dashboard next
 * to the resolved date. Null when nothing was promised.
 */
export function promiseBasisLabel(intent: PromiseIntent): string | null {
  switch (intent.kind) {
    case 'specific':
      return 'specific date';
    case 'tomorrow':
      return 'tomorrow';
    case 'relativeDays':
      return `in ${Math.max(1, Math.round(intent.days))} days`;
    case 'endOfWeek':
      return 'week end';
    case 'endOfMonth':
      return 'month end';
    default:
      return null;
  }
}

/**
 * Resolve a promise intent to a concrete Date, or null when nothing was
 * promised. `now` is injectable for testing.
 */
export function computePromiseDate(intent: PromiseIntent, now: Date = new Date()): Date | null {
  if (intent.kind === 'none') return null;

  const wall = toIstWall(now);
  const y = wall.getUTCFullYear();
  const m = wall.getUTCMonth();
  const d = wall.getUTCDate();

  switch (intent.kind) {
    case 'specific':
      return isNaN(intent.at.getTime()) ? null : intent.at;
    case 'tomorrow':
      return istNoon(y, m, d + 1);
    case 'relativeDays':
      return istNoon(y, m, d + Math.max(1, Math.round(intent.days)));
    case 'endOfWeek': {
      // End of the current week = upcoming Sunday (0=Sun … 6=Sat in IST).
      const dow = wall.getUTCDay();
      const daysToSunday = (7 - dow) % 7; // 0 when today is already Sunday
      return istNoon(y, m, d + daysToSunday);
    }
    case 'endOfMonth': {
      // Day 0 of next month = last day of the current month (28/29/30/31).
      const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      return istNoon(y, m, lastDay);
    }
    default:
      return null;
  }
}
