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

function callPack(tier: ModelTier, idx: number): CreditPack {
  const units = CALL_PACK_MINUTES[idx];
  const rate = CALL_RATES_RUPEES[tier][idx];
  const pricePaise = Math.round(units * rate * 100);
  return {
    id: `CALL_${tier}_${units}`,
    kind: 'CALL',
    tier,
    units,
    pricePaise,
    ratePaise: Math.round(rate * 100),
    autopayEligible: pricePaise <= AUTOPAY_MAX_PAISE,
  };
}

function whatsappPack(idx: number): CreditPack {
  const p = WHATSAPP_PACKS_RUPEES[idx];
  const pricePaise = p.price * 100;
  return {
    id: `WA_${p.messages}`,
    kind: 'WHATSAPP',
    tier: null,
    units: p.messages,
    pricePaise,
    ratePaise: Math.round(pricePaise / p.messages),
    autopayEligible: pricePaise <= AUTOPAY_MAX_PAISE,
  };
}

export function callPacks(tier: ModelTier): CreditPack[] {
  return CALL_PACK_MINUTES.map((_, i) => callPack(tier, i));
}

export function whatsappPacks(): CreditPack[] {
  return WHATSAPP_PACKS_RUPEES.map((_, i) => whatsappPack(i));
}

/** Every pack for every model, for lookups by id. */
export function allPacks(): CreditPack[] {
  return [...MODEL_TIERS.flatMap((t) => callPacks(t)), ...whatsappPacks()];
}

export function findPack(id: string | null | undefined): CreditPack | null {
  if (!id) return null;
  return allPacks().find((p) => p.id === id) ?? null;
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
