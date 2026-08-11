/**
 * Retry ladder for SCHEDULED WhatsApp statement sends.
 *
 * AiSensy/Meta sends fail intermittently (policy checks, template throttling,
 * provider hiccups). A tenant whose weekly run lands on a bad minute would
 * otherwise silently miss that party for the whole week, so a failed scheduled
 * send climbs this ladder:
 *
 *   attempt 1  the scheduled time itself
 *   attempt 2  SAME day, +3.5 hours: only if it still lands inside the sending
 *              window (08:00-20:00 IST) on the same calendar day
 *   attempt 3  NEXT day at the ORIGINAL scheduled time
 *   after that give up; the party rolls into the next weekly run via the
 *              normal cadence
 *
 * Everything is computed in IST because the sending window and the tenant's
 * configured hours are IST.
 */

const IST_OFFSET_MS = 330 * 60_000;

// Same window the auto-WhatsApp scheduler runs in (AUTO_WHATSAPP_CRON).
export const SEND_WINDOW_START_HOUR = 8;
export const SEND_WINDOW_END_HOUR = 20;

export const SAME_DAY_RETRY_MS = 3.5 * 60 * 60 * 1000; // 3h30m: the "3-4 hours" rule
export const MAX_ATTEMPTS = 3;

/** A Date seen through IST, so getUTC* reads as IST wall-clock. */
function toIst(d: Date): Date {
  return new Date(d.getTime() + IST_OFFSET_MS);
}

function fromIst(ist: Date): Date {
  return new Date(ist.getTime() - IST_OFFSET_MS);
}

/**
 * When should the next attempt fire?
 *
 * @param attempt    the attempt that just FAILED (1 = the scheduled send)
 * @param originalAt when the cycle was originally scheduled to send
 * @param now        current time (injectable for tests)
 * @returns the next attempt time, or null when the ladder is exhausted
 */
export function nextWhatsappRetryAt(
  attempt: number,
  originalAt: Date,
  now: Date = new Date(),
): Date | null {
  if (attempt >= MAX_ATTEMPTS) return null;

  const originalIst = toIst(originalAt);

  if (attempt === 1) {
    // Same day, +3.5h from the ORIGINAL slot (not from `now`, so a late worker
    // pickup cannot push the retry past the window).
    const candidate = new Date(originalAt.getTime() + SAME_DAY_RETRY_MS);
    const candidateIst = toIst(candidate);

    const sameDay =
      candidateIst.getUTCFullYear() === originalIst.getUTCFullYear() &&
      candidateIst.getUTCMonth() === originalIst.getUTCMonth() &&
      candidateIst.getUTCDate() === originalIst.getUTCDate();
    const insideWindow =
      candidateIst.getUTCHours() >= SEND_WINDOW_START_HOUR &&
      candidateIst.getUTCHours() <= SEND_WINDOW_END_HOUR;

    // Only worth scheduling if it is still in the future
    if (sameDay && insideWindow && candidate.getTime() > now.getTime()) {
      return candidate;
    }
    // No room left today: fall through to the next-day attempt
    return nextDayAtOriginalTime(originalIst, now);
  }

  // attempt === 2 -> next day at the original time
  return nextDayAtOriginalTime(originalIst, now);
}

/** Next calendar day (IST) at the original slot's IST wall-clock time. */
function nextDayAtOriginalTime(originalIst: Date, now: Date): Date {
  const next = new Date(originalIst.getTime());
  next.setUTCDate(next.getUTCDate() + 1);
  let candidate = fromIst(next);

  // If that instant already passed (e.g. a very delayed worker), roll forward
  // day by day until it is in the future, capped so we never loop unbounded.
  for (let i = 0; i < 7 && candidate.getTime() <= now.getTime(); i++) {
    next.setUTCDate(next.getUTCDate() + 1);
    candidate = fromIst(next);
  }
  return candidate;
}

/** Which ladder step a given attempt represents, for logs and the dashboard. */
export function retryStageLabel(attempt: number): string {
  if (attempt <= 1) return 'scheduled send';
  if (attempt === 2) return 'same-day retry';
  return 'next-day retry';
}
