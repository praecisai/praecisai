/**
 * Pure billing math. All amounts are integer PAISE, ex-GST unless the name
 * says otherwise. Server-side only: client math is never trusted.
 *
 * Pricing model:
 * - One-time onboarding: base ₹50,000 ex-GST which INCLUDES the first month's
 *   ₹5,000 subscription. A 5/10/15/20 percent coupon is compulsory and applies
 *   to the ₹50,000 total. After discount the ₹5,000 subscription component is
 *   fixed; the remainder is the setup component.
 * - Recurring: ₹5,000 ex-GST per month, debited on the 1st.
 * - GST 18% is added on top of the discounted ex-GST value.
 */

export const ONBOARDING_BASE_PAISE = 50000 * 100; // ₹50,000 ex-GST
export const SUBSCRIPTION_MONTHLY_PAISE = 5000 * 100; // ₹5,000 ex-GST
export const GST_RATE = 0.18;
export const SUBSCRIPTION_PLAN_PAISE_INCL_GST = Math.round(
  SUBSCRIPTION_MONTHLY_PAISE * (1 + GST_RATE),
); // ₹5,900 per month charged by the Razorpay plan

// 1-week paid trial: full platform access for 7 days, no coupon, no mandate
export const TRIAL_PAISE = 10000 * 100; // ₹10,000 ex-GST
export const TRIAL_DAYS = 7;

export interface TrialQuote {
  baseAmount: number; // ₹10,000 in paise, ex-GST
  gstAmount: number;
  totalAmount: number;
  days: number;
}

export function computeTrialQuote(): TrialQuote {
  const gstAmount = Math.round(TRIAL_PAISE * GST_RATE);
  return {
    baseAmount: TRIAL_PAISE,
    gstAmount,
    totalAmount: TRIAL_PAISE + gstAmount,
    days: TRIAL_DAYS,
  };
}

export const ALLOWED_COUPON_PERCENTS = [5, 10, 15, 20] as const;
export type CouponPercent = (typeof ALLOWED_COUPON_PERCENTS)[number];

export interface OnboardingQuote {
  /** ₹50,000 in paise, ex-GST */
  baseAmount: number;
  couponPercent: number;
  /** discount on the base, paise */
  discountAmount: number;
  /** base - discount, ex-GST paise */
  payableExGst: number;
  /** always ₹5,000 (first month), paise ex-GST */
  subscriptionComponent: number;
  /** payableExGst - subscriptionComponent, paise ex-GST */
  setupComponent: number;
  /** 18% of payableExGst, paise */
  gstAmount: number;
  /** payableExGst + gstAmount, paise: what the customer pays now */
  totalAmount: number;
}

export function isAllowedCouponPercent(p: number): p is CouponPercent {
  return (ALLOWED_COUPON_PERCENTS as readonly number[]).includes(p);
}

export function computeOnboardingQuote(couponPercent: number): OnboardingQuote {
  if (!isAllowedCouponPercent(couponPercent)) {
    throw new Error(`Invalid coupon percent: ${couponPercent}. Allowed: 5, 10, 15, 20`);
  }
  const baseAmount = ONBOARDING_BASE_PAISE;
  const discountAmount = Math.round((baseAmount * couponPercent) / 100);
  const payableExGst = baseAmount - discountAmount;
  const subscriptionComponent = SUBSCRIPTION_MONTHLY_PAISE;
  const setupComponent = payableExGst - subscriptionComponent;
  const gstAmount = Math.round(payableExGst * GST_RATE);
  const totalAmount = payableExGst + gstAmount;
  return {
    baseAmount,
    couponPercent,
    discountAmount,
    payableExGst,
    subscriptionComponent,
    setupComponent,
    gstAmount,
    totalAmount,
  };
}

/** GST on the monthly subscription, paise. */
export function monthlySubscriptionGstPaise(): number {
  return Math.round(SUBSCRIPTION_MONTHLY_PAISE * GST_RATE);
}

export type BillingAnchorMode = 'IMMEDIATE_NEXT_FIRST' | 'FIRST_AFTER_FULL_MONTH';

/**
 * First auto-debit date for a signup at `signup` (interpreted in IST):
 * - IMMEDIATE_NEXT_FIRST (default): the very next 1st after signup.
 *   Signup 27 May → 1 June. Signup 1 June → 1 July (the first month is
 *   already covered by the onboarding fee). Signup 31 Dec → 1 Jan.
 * - FIRST_AFTER_FULL_MONTH: the first 1st on or after signup + 1 month.
 *   Signup 27 May → covered till 27 June → 1 July. Signup 1 June → 1 July.
 *   Signup 31 Jan → (28 Feb) → 1 Mar.
 *
 * Returns a Date at 00:00 IST on the debit day (as a UTC instant).
 */
export function firstDebitDate(signup: Date, mode: BillingAnchorMode): Date {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const ist = new Date(signup.getTime() + IST_OFFSET_MS);
  let year = ist.getUTCFullYear();
  let month = ist.getUTCMonth(); // 0-based

  if (mode === 'FIRST_AFTER_FULL_MONTH') {
    // signup + 1 calendar month (clamped to the target month's last day),
    // then the first 1st on or after that date
    const day = ist.getUTCDate();
    let m = month + 1;
    let y = year;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    const daysInTarget = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const covered = new Date(Date.UTC(y, m, Math.min(day, daysInTarget)));
    if (covered.getUTCDate() === 1) {
      year = covered.getUTCFullYear();
      month = covered.getUTCMonth();
    } else {
      year = covered.getUTCMonth() === 11 ? covered.getUTCFullYear() + 1 : covered.getUTCFullYear();
      month = (covered.getUTCMonth() + 1) % 12;
    }
  } else {
    // IMMEDIATE_NEXT_FIRST: strictly after signup day, so always next month
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  // Midnight IST on the 1st, expressed as a UTC instant
  return new Date(Date.UTC(year, month, 1) - IST_OFFSET_MS);
}

/** Indian financial year prefix for invoice numbers: July 2026 → "26-27". */
export function financialYearCode(date: Date): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const startYear = ist.getUTCMonth() >= 3 ? y : y - 1; // FY starts in April
  const yy = String(startYear % 100).padStart(2, '0');
  const nn = String((startYear + 1) % 100).padStart(2, '0');
  return `${yy}-${nn}`;
}

/** "₹1,234.56" style formatting from paise, using Rs. for PDF safety. */
export function paiseToRupeeString(paise: number): string {
  const rupees = paise / 100;
  return rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
