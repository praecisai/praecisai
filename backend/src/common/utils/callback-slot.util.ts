// ─── Callback slot scheduling for bulk recovery calls ────────────────────────
// This business (Aeromen) only ever dials in two daily bulk windows:
//   12:00 IST (noon slot) and 16:00 IST (4 PM slot).
// When a customer asks to be called back, we snap their request to the correct
// slot. The ONLY exception is a genuinely specific date/time, which we honour
// as given.
//
// Rules (as specified by the business):
//  - "baadme call karo" (later, no time given):
//       called in the NOON slot   -> today 16:00
//       called in the EVENING slot-> tomorrow 12:00
//       (i.e. always the NEXT bulk window)
//  - "kal call karo" (tomorrow, no time) -> tomorrow 12:00
//  - "X din baad" with X <= 15          -> that date at 12:00
//  - "ek ghante baad" (relative hours)  -> now + N hours (honoured exactly)
//  - specific date and/or time          -> honoured as given (date-only -> 12:00)
//  - MISCHIEF: any delay > 15 days ("bees din baad", "chhe mahine baad")
//       -> ignored; snapped to the NEXT bulk window instead.
//
// All wall-clock reasoning is done in IST regardless of server timezone.

const IST_OFFSET_MIN = 330; // UTC+5:30
const NOON_SLOT_HOUR = 12;
const EVENING_SLOT_HOUR = 16;

/** Beyond this many days a "call me later" is treated as mischief. */
export const MAX_HONOURED_DAYS = 15;

export type CallbackIntent =
  | { kind: 'later' } // "baadme", no time
  | { kind: 'tomorrow' } // "kal", no time
  | { kind: 'relativeHours'; hours: number } // "ek ghante baad"
  | { kind: 'relativeDays'; days: number } // "do din baad" / "X din baad"
  | { kind: 'specific'; at: Date; hasTime: boolean } // explicit date/time
  | { kind: 'none' };

/** A Date whose UTC getters read as IST wall-clock. */
function toIstWall(now: Date): Date {
  return new Date(now.getTime() + IST_OFFSET_MIN * 60_000);
}

/** Build the real UTC instant for a given IST wall-clock time. */
function istInstant(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute = 0,
): Date {
  return new Date(Date.UTC(year, monthIndex, day, hour, minute) - IST_OFFSET_MIN * 60_000);
}

/**
 * The next bulk window strictly ahead of `now`:
 *   before 12:00 IST -> today 12:00
 *   12:00–15:59 IST  -> today 16:00   (noon slot -> 4 PM)
 *   16:00 IST onward -> tomorrow 12:00 (4 PM slot -> next day noon)
 */
export function nextBulkSlot(now: Date = new Date()): Date {
  const wall = toIstWall(now);
  const y = wall.getUTCFullYear();
  const mo = wall.getUTCMonth();
  const d = wall.getUTCDate();
  const hour = wall.getUTCHours();

  if (hour < NOON_SLOT_HOUR) return istInstant(y, mo, d, NOON_SLOT_HOUR);
  if (hour < EVENING_SLOT_HOUR) return istInstant(y, mo, d, EVENING_SLOT_HOUR);
  return istInstant(y, mo, d + 1, NOON_SLOT_HOUR);
}

/** The noon slot `daysAhead` days from today (IST). */
function noonSlotDaysAhead(now: Date, daysAhead: number): Date {
  const wall = toIstWall(now);
  return istInstant(
    wall.getUTCFullYear(),
    wall.getUTCMonth(),
    wall.getUTCDate() + daysAhead,
    NOON_SLOT_HOUR,
  );
}

/**
 * Resolve a callback intent into the actual instant to re-dial, or null if the
 * customer gave nothing usable (caller then falls back to the next bulk run).
 */
export function computeCallbackTime(
  intent: CallbackIntent,
  now: Date = new Date(),
): Date | null {
  switch (intent.kind) {
    case 'none':
      return null;

    // "call me later" / mischief long delays both go to the next bulk window.
    case 'later':
      return nextBulkSlot(now);

    case 'tomorrow':
      return noonSlotDaysAhead(now, 1);

    case 'relativeHours': {
      const h = Number(intent.hours);
      if (!Number.isFinite(h) || h <= 0) return nextBulkSlot(now);
      return new Date(now.getTime() + h * 3_600_000);
    }

    case 'relativeDays': {
      const n = Math.round(Number(intent.days));
      if (!Number.isFinite(n) || n <= 0) return nextBulkSlot(now);
      // Mischief: more than 15 days out -> ignore, use next bulk window.
      if (n > MAX_HONOURED_DAYS) return nextBulkSlot(now);
      return noonSlotDaysAhead(now, n);
    }

    case 'specific': {
      if (!(intent.at instanceof Date) || isNaN(intent.at.getTime())) {
        return nextBulkSlot(now);
      }
      // A specific date that is itself absurdly far out is still mischief.
      const daysOut = (intent.at.getTime() - now.getTime()) / 86_400_000;
      if (daysOut > MAX_HONOURED_DAYS) return nextBulkSlot(now);
      if (daysOut < 0) return nextBulkSlot(now); // a past time -> next window
      if (intent.hasTime) return intent.at;
      // Date-only -> anchor to the noon slot of that IST date.
      const wall = toIstWall(intent.at);
      return istInstant(
        wall.getUTCFullYear(),
        wall.getUTCMonth(),
        wall.getUTCDate(),
        NOON_SLOT_HOUR,
      );
    }

    default:
      return nextBulkSlot(now);
  }
}
