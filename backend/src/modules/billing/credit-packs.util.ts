/**
 * Prepaid credit packs. All amounts are integer PAISE, no GST.
 *
 * - 1 call credit = 1 minute of AI calling. Calls are charged per second
 *   (a 45-second call uses 0.75 credits); unanswered calls cost nothing.
 * - 1 WhatsApp credit = 1 message sent. Failed sends cost nothing.
 *
 * The per-minute rate depends on the AI model the business calls with
 * (A best, B 2nd best, C 3rd best) and falls as the pack gets bigger. These
 * rates are the source of truth; the frontend mirrors them for display only.
 */

export type CreditKind = 'CALL' | 'WHATSAPP';
export type ModelTier = 'A' | 'B' | 'C';
export const MODEL_TIERS: ModelTier[] = ['A', 'B', 'C'];

export function isModelTier(v: unknown): v is ModelTier {
  return v === 'A' || v === 'B' || v === 'C';
}
export function isCreditKind(v: unknown): v is CreditKind {
  return v === 'CALL' || v === 'WHATSAPP';
}

/** Minutes per call pack, smallest first. */
export const CALL_PACK_MINUTES = [100, 1000, 5000, 15000] as const;

/** Rupees per minute for each model, aligned with CALL_PACK_MINUTES. */
export const CALL_RATES_RUPEES: Record<ModelTier, readonly number[]> = {
  A: [8.85, 8.82, 8.8, 8.75],
  B: [5.97, 5.94, 5.92, 5.88],
  C: [5.28, 5.25, 5.22, 5.17],
};

/** WhatsApp packs: messages and the pack price in rupees. */
export const WHATSAPP_PACKS_RUPEES = [
  { messages: 100, price: 150 },
  { messages: 1000, price: 1200 },
  { messages: 5000, price: 5000 },
  { messages: 10000, price: 8000 },
] as const;

/**
 * Most a single automatic (autopay) debit may be. Indian auto-debit rules let
 * UPI Autopay and card mandates debit up to ₹15,000 without the customer
 * approving each payment, so larger packs can only be bought manually.
 */
export const AUTOPAY_MAX_PAISE = 15000 * 100;

export interface CreditPack {
  id: string; // "CALL_A_1000" | "WA_1000"
  kind: CreditKind;
  tier: ModelTier | null; // call packs only
  units: number; // minutes or messages
  pricePaise: number;
  /** price per credit in paise (per minute / per message) */
  ratePaise: number;
  autopayEligible: boolean;
}

/**
 * Free trial every new credit-billed customer gets once, on us: enough to
 * hear the AI on a few real calls and send a few statements before buying.
 */
export const FREE_TRIAL_CALL_MINUTES = 10;
export const FREE_TRIAL_WHATSAPP_MESSAGES = 10;

/** Smallest and largest amount a customer may buy (or autopay) in one go. */
export const MIN_CUSTOM_CREDITS = 100;
export const MAX_CUSTOM_CREDITS = 100000;

/**
 * Rupees per credit for any amount: the pack rates are fixed points and an
 * amount between two packs slides linearly from one rate to the next, so a
 * bigger purchase is always a little cheaper per credit. Past the largest
 * pack the best rate holds.
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

function makePack(kind: CreditKind, tier: ModelTier | null, units: number, rateRupees: number): CreditPack {
  // Whole rupees, so the pack sizes keep their exact list prices
  const pricePaise = Math.round(units * rateRupees) * 100;
  return {
    id: kind === 'CALL' ? `CALL_${tier}_${units}` : `WA_${units}`,
    kind,
    tier,
    units,
    pricePaise,
    ratePaise: Math.round(pricePaise / units),
    autopayEligible: pricePaise <= AUTOPAY_MAX_PAISE,
  };
}

/** A call pack of any size from MIN_CUSTOM_CREDITS to MAX_CUSTOM_CREDITS minutes. */
export function callPackFor(tier: ModelTier, minutes: number): CreditPack {
  return makePack('CALL', tier, minutes, interpolatedRate(CALL_PACK_MINUTES, CALL_RATES_RUPEES[tier], minutes));
}

/** A WhatsApp pack of any size from MIN_CUSTOM_CREDITS to MAX_CUSTOM_CREDITS messages. */
export function whatsappPackFor(messages: number): CreditPack {
  const sizes = WHATSAPP_PACKS_RUPEES.map((p) => p.messages);
  const rates = WHATSAPP_PACKS_RUPEES.map((p) => p.price / p.messages);
  return makePack('WHATSAPP', null, messages, interpolatedRate(sizes, rates, messages));
}

export function callPacks(tier: ModelTier): CreditPack[] {
  return CALL_PACK_MINUTES.map((m) => callPackFor(tier, m));
}

export function whatsappPacks(): CreditPack[] {
  return WHATSAPP_PACKS_RUPEES.map((p) => whatsappPackFor(p.messages));
}

/** The standard packs for every model, for listing. */
export function allPacks(): CreditPack[] {
  return [...MODEL_TIERS.flatMap((t) => callPacks(t)), ...whatsappPacks()];
}

/**
 * Pack ids carry their size ("CALL_A_750", "WA_250"), so any whole amount
 * inside the allowed range resolves, not just the listed packs.
 */
export function findPack(id: string | null | undefined): CreditPack | null {
  if (!id) return null;
  const m = /^(?:CALL_([ABC])|WA)_(\d+)$/.exec(id);
  if (!m) return null;
  const units = Number(m[2]);
  if (!Number.isSafeInteger(units) || units < MIN_CUSTOM_CREDITS || units > MAX_CUSTOM_CREDITS) return null;
  return m[1] ? callPackFor(m[1] as ModelTier, units) : whatsappPackFor(units);
}

/**
 * Call credits used by a call: per second, rounded to 2 decimals. A call with
 * no recorded duration (never connected) uses nothing.
 */
export function callCreditsForSeconds(
  seconds: number | null | undefined,
): number {
  if (!seconds || seconds <= 0) return 0;
  return Math.round((seconds / 60) * 100) / 100;
}

/** Rounds a balance to 2 decimals so float drift never shows up in the UI. */
export function roundCredits(n: number): number {
  return Math.round(n * 100) / 100;
}
