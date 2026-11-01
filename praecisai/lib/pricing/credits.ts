/**
 * Prepaid credit packs, for DISPLAY only (marketing pages, plan screens).
 * Mirrors backend/src/modules/billing/credit-packs.util.ts, which decides what
 * is actually charged. Keep the two in sync.
 *
 * 1 call credit = 1 minute of AI calling (charged per second).
 * 1 WhatsApp credit = 1 message sent.
 */

export type ModelTier = 'A' | 'B' | 'C';

export const MODEL_NAMES: Record<ModelTier, { name: string; short: string }> = {
  A: { name: 'Plan A', short: 'Plan A' },
  B: { name: 'Plan B', short: 'Plan B' },
  C: { name: 'Plan C', short: 'Plan C' },
};

export const CALL_PACK_MINUTES = [100, 1000, 5000, 15000] as const;

/** Rupees per minute, aligned with CALL_PACK_MINUTES. */
export const CALL_RATES: Record<ModelTier, readonly number[]> = {
  A: [8.85, 8.82, 8.8, 8.75],
  B: [5.97, 5.94, 5.92, 5.88],
  C: [5.28, 5.25, 5.22, 5.17],
};

export const WHATSAPP_PACKS = [
  { messages: 100, price: 150 },
  { messages: 1000, price: 1200 },
  { messages: 5000, price: 5000 },
  { messages: 10000, price: 8000 },
] as const;

export function callPackPrice(tier: ModelTier, idx: number): number {
  return Math.round(CALL_PACK_MINUTES[idx] * CALL_RATES[tier][idx] * 100) / 100;
}

export function rupees(n: number, decimals = 0): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function credits(n: number): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
