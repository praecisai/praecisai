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

/** Smallest and largest custom amount (credits) in one purchase. */
export const MIN_CUSTOM_CREDITS = 100;
export const MAX_CUSTOM_CREDITS = 100000;
/** Most a single autopay debit may be, in rupees. */
export const AUTOPAY_MAX_RUPEES = 15000;

/**
 * Rupees per credit for any amount: pack rates are fixed points and amounts in
 * between slide linearly to the next pack's rate; past the largest pack the
 * best rate holds. Mirrors credit-packs.util.ts interpolatedRate.
 */
function interpolatedRate(sizes: readonly number[], rates: readonly number[], units: number): number {
  if (units <= sizes[0]) return rates[0];
  for (let i = 0; i < sizes.length - 1; i++) {
    if (units <= sizes[i + 1]) {
      const t = (units - sizes[i]) / (sizes[i + 1] - sizes[i]);
      return rates[i] + t * (rates[i + 1] - rates[i]);
    }
  }
  return rates[rates.length - 1];
}

/** Price in whole rupees for any number of call minutes or WhatsApp messages. */
export function customPrice(kind: 'CALL' | 'WHATSAPP', tier: ModelTier, units: number): number {
  const rate =
    kind === 'CALL'
      ? interpolatedRate(CALL_PACK_MINUTES, CALL_RATES[tier], units)
      : interpolatedRate(
          WHATSAPP_PACKS.map((p) => p.messages),
          WHATSAPP_PACKS.map((p) => p.price / p.messages),
          units,
        );
  return Math.round(units * rate);
}

/** The pack id the backend accepts for a custom amount ("CALL_A_750", "WA_250"). */
export function customPackId(kind: 'CALL' | 'WHATSAPP', tier: ModelTier, units: number): string {
  return kind === 'CALL' ? `CALL_${tier}_${units}` : `WA_${units}`;
}
