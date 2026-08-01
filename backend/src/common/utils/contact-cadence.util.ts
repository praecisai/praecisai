/**
 * Comparison key for "is this the same handset?".
 *
 * Deliberately looser than `normalizePhone`, which is used for dialling and
 * must stay conservative. Ledger exports carry the same number as 9321477780,
 * 09321477780, +919321477780 and 919321477780; for dedup all four have to
 * collapse to one key, so we reduce to the trailing 10 subscriber digits.
 * Anything shorter is returned as-is rather than guessed at.
 */
export function phoneKey(raw: string | number): string {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * How often an automated WhatsApp statement may go to the same party, per
 * segment. Soft Reminder is deliberately the slowest: those parties are barely
 * overdue and are the most likely to report a message they did not ask for,
 * which is what drags a WhatsApp number's quality rating down.
 *
 * A business can override these in `Business.whatsapp_cadence_days`.
 */
export const DEFAULT_WHATSAPP_CADENCE_DAYS: Record<string, number> = {
  'Soft Reminder': 15,
  'Follow-up': 7,
  'Strong Follow-up': 7,
  Escalation: 7,
};

/** Segments an automated run may contact at all. */
export const CONTACTABLE_SEGMENTS = [
  'Soft Reminder',
  'Follow-up',
  'Strong Follow-up',
  'Escalation',
] as const;

/**
 * Read a per-business cadence override, falling back to the defaults for any
 * segment the override does not mention. Anything that is not a positive number
 * is ignored rather than trusted: a bad value here would mean messaging a party
 * every single day.
 */
export function parseCadenceDays(raw: unknown): Record<string, number> {
  const merged = { ...DEFAULT_WHATSAPP_CADENCE_DAYS };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return merged;

  for (const [segment, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!(segment in merged)) continue;
    const days = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(days) && days >= 1 && days <= 365) merged[segment] = Math.floor(days);
  }
  return merged;
}

/** The instant before which a party is due another message. */
export function cadenceCutoff(days: number, now = new Date()): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Collapse a list to one entry per physical phone number.
 *
 * Several parties in the same ledger routinely share one number (a group's
 * accountant, a proprietor with three firms, or a test file where every row
 * carries the same mobile). Without this, one bulk run rings or messages that
 * single handset once per party — the exact pattern that gets a number reported
 * and a WhatsApp sender's quality rating cut.
 *
 * Order is preserved, so the caller decides which party wins (pass the list
 * sorted by whatever should take priority, e.g. oldest bill first).
 */
export function dedupeByPhone<T>(items: T[], getPhone: (item: T) => string | null | undefined) {
  const seen = new Map<string, T>();
  const duplicates: T[] = [];

  for (const item of items) {
    const raw = getPhone(item);
    if (!raw) continue;
    const key = phoneKey(raw);
    if (!key) continue;
    if (seen.has(key)) {
      duplicates.push(item);
      continue;
    }
    seen.set(key, item);
  }

  return { unique: [...seen.values()], duplicates };
}
