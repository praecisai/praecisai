/**
 * Escalation-only daily call ceiling.
 *
 * A business may let Escalation parties (the oldest dues) be rung more than
 * once a day. The ceilings below are deliberately conservative: RBI's recovery
 * conduct rules (calls only 08:00-19:00, no persistent calling) are the yardstick
 * courts and regulators apply, and operators flag a CLI that rings the same
 * handset repeatedly. Nothing here is configurable past these bounds.
 */

export const ESCALATION_SEGMENT = 'Escalation';

export const ESCALATION_MAX_CALLS_PER_DAY = 3;
export const ESCALATION_MIN_GAP_HOURS = 2;
export const ESCALATION_MAX_GAP_HOURS = 6;

/** Earliest IST hour a capped Escalation dial may start. */
export const ESCALATION_WINDOW_START_HOUR = 8;
/** Latest IST hour a capped Escalation dial may start, so it ends before 19:00. */
export const ESCALATION_WINDOW_LAST_HOUR = 18;

/**
 * Rows this close together are ONE attempt: a no-answer falls through to the
 * party's alternate numbers within seconds, and each of those dials is its own
 * CallLog row. Well under the minimum gap, so separate attempts never merge.
 */
const SAME_ATTEMPT_MINUTES = 30;

/**
 * The gap is measured from when a call was queued, but the worker paces dials
 * 5s apart, so a large batch actually rings a little later than its row says.
 * Without this slack a 3-hour gap anchored at 12:00 would miss the 15:00 run by
 * seconds and slip a whole hour.
 */
const GAP_SLACK_MINUTES = 15;

export interface EscalationCallRow {
  created_at: Date;
  call_status: string;
  disposition: string | null;
  next_call_at: Date | null;
}

/** UTC instant of today's 00:00 IST. */
export function istDayStart(now = new Date()): Date {
  const ist = new Date(now.getTime() + 330 * 60000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 330 * 60000);
}

export function istHour(now = new Date()): number {
  return new Date(now.getTime() + 330 * 60000).getUTCHours();
}

export function withinEscalationWindow(now = new Date()): boolean {
  const h = istHour(now);
  return h >= ESCALATION_WINDOW_START_HOUR && h <= ESCALATION_WINDOW_LAST_HOUR;
}

/** Stored value → effective cap, or null when the limit is off / malformed. */
export function parseEscalationCap(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isInteger(raw)) return null;
  if (raw < 1) return null;
  return Math.min(raw, ESCALATION_MAX_CALLS_PER_DAY);
}

export function parseEscalationGap(raw: unknown): number {
  const n = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : 3;
  return Math.min(Math.max(n, ESCALATION_MIN_GAP_HOURS), ESCALATION_MAX_GAP_HOURS);
}

/** Today's attempts: rows clustered so an alternate-number fallback isn't a new call. */
export function countAttempts(rows: EscalationCallRow[]): number {
  const times = rows.map((r) => r.created_at.getTime()).sort((a, b) => a - b);
  let attempts = 0;
  let attemptStart = -Infinity;
  for (const t of times) {
    if (t - attemptStart > SAME_ATTEMPT_MINUTES * 60000) {
      attempts++;
      attemptStart = t;
    }
  }
  return attempts;
}

/**
 * May this party get another capped Escalation dial right now?
 * `rows` are the party's CallLog rows since today's 00:00 IST.
 * Returns null when allowed, otherwise the reason shown in the skipped list.
 */
export function escalationSkipReason(
  rows: EscalationCallRow[],
  cap: number,
  gapHours: number,
  opts: { followUpOnly?: boolean } = {},
  now = new Date(),
): string | null {
  const attempts = countAttempts(rows);

  // Follow-up runs only add to a day the business's own schedule started;
  // they never make the first call of the day.
  if (opts.followUpOnly && attempts === 0) return 'Not called yet today';

  if (attempts >= cap) {
    return `Reached today's Escalation limit (${cap} call${cap !== 1 ? 's' : ''})`;
  }

  // Once the party has actually spoken to the agent, the day's chase is over:
  // repeating the same call after a conversation is what reads as harassment.
  const spoke = rows.some(
    (r) => r.call_status === 'COMPLETED' && r.disposition !== 'NO_ANSWER',
  );
  if (spoke) return 'Already spoke to the agent today';

  // A callback the party asked for is already booked; that call covers it.
  if (rows.some((r) => r.next_call_at && r.next_call_at.getTime() > now.getTime())) {
    return 'A callback they asked for is already scheduled';
  }

  const last = rows.reduce((m, r) => Math.max(m, r.created_at.getTime()), 0);
  if (last > 0) {
    const elapsedMin = (now.getTime() - last) / 60000;
    if (elapsedMin < gapHours * 60 - GAP_SLACK_MINUTES) {
      return `Last called ${Math.floor(elapsedMin / 60)}h ${Math.round(elapsedMin % 60)}m ago: minimum gap is ${gapHours}h`;
    }
  }

  return null;
}
