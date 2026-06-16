export interface SegmentRule {
  min_days: number;
  max_days: number | null;
  segment: string;
}

export const DEFAULT_SEGMENT_RULES: SegmentRule[] = [
  { min_days: 0, max_days: 60, segment: 'Soft Reminder' },
  { min_days: 61, max_days: 120, segment: 'Follow-up' },
  { min_days: 121, max_days: 180, segment: 'Strong Follow-up' },
  { min_days: 181, max_days: null, segment: 'Escalation' },
];

/**
 * Pure function to calculate the segment for a customer's outstanding.
 * NEVER trust the segment from uploaded files — always recalculate.
 *
 * @param daysOverdue - Number of days the invoice is overdue
 * @param dueAmount - The outstanding amount (negative = credit note)
 * @param rules - Configurable segment rules (defaults provided)
 * @returns Segment string
 */
export function getSegment(
  daysOverdue: number,
  dueAmount: number,
  rules: SegmentRule[] = DEFAULT_SEGMENT_RULES,
): string {
  // Credit note — negative amount, not overdue
  if (dueAmount < 0) return 'Credit Note';

  // Fully cleared
  if (dueAmount === 0) return 'Cleared';

  // Sort rules by min_days ascending for proper evaluation
  const sortedRules = [...rules].sort((a, b) => a.min_days - b.min_days);

  for (const rule of sortedRules) {
    const withinMin = daysOverdue >= rule.min_days;
    const withinMax = rule.max_days === null || daysOverdue <= rule.max_days;

    if (withinMin && withinMax) {
      return rule.segment;
    }
  }

  // Default fallback — extreme overdue
  return 'Escalation';
}

/**
 * Determine the aging bucket label for a number of overdue days.
 */
export function getAgingBucket(daysOverdue: number): string {
  if (daysOverdue <= 60) return '0-60';
  if (daysOverdue <= 120) return '61-120';
  if (daysOverdue <= 180) return '121-180';
  return '181+';
}

/**
 * Normalize Indian mobile number to E.164-like format.
 * Input examples: 918291485811 (with country code, no +)
 * Output: +91XXXXXXXXXX
 */
export function normalizePhone(raw: string | number): string {
  const str = String(raw).replace(/\D/g, '');
  if (str.startsWith('91') && str.length === 12) {
    return `+${str}`;
  }
  if (str.length === 10) {
    return `+91${str}`;
  }
  return `+${str}`;
}

/**
 * Parse Indian date format DD/MM/YYYY to JS Date.
 */
export function parseIndianDate(raw: string): Date | null {
  if (!raw) return null;
  const cleaned = raw.trim();

  // DD/MM/YYYY
  const indianMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (indianMatch) {
    const [, day, month, year] = indianMatch;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
    );
  }

  // Fallback: try native Date parsing
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
}
