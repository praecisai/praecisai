/**
 * Pure billing math. All amounts are integer PAISE.
 * Server-side only: client math is never trusted.
 *
 * Pricing model (NO GST: the listed price is exactly what is charged):
 * - One-time onboarding: base ₹50,000 which INCLUDES the first month's
 *   ₹5,000 subscription. An OPTIONAL 5/10/15/20 percent coupon applies to the
 *   ₹50,000 total (no coupon = full price). After discount the ₹5,000
 *   subscription component is fixed; the remainder is the setup component.
 * - Trial credit: a customer who already paid the ₹10,000 trial gets that
 *   amount deducted AFTER the coupon discount, so they pay ₹40,000 at full
 *   price (less any coupon).
 * - Recurring: ₹5,000 per month, debited on the 1st.
 */

export const ONBOARDING_BASE_PAISE = 50000 * 100; // ₹50,000
export const SUBSCRIPTION_MONTHLY_PAISE = 5000 * 100; // ₹5,000
// Kept for the Razorpay plan amount: no GST is added, so this is the plain
// monthly price. (Name retained to avoid churn in the Razorpay plan wiring.)
export const SUBSCRIPTION_PLAN_PAISE_INCL_GST = SUBSCRIPTION_MONTHLY_PAISE;

// Paid trial: full platform access for 10 days, no coupon, no mandate.
// Non-refundable; adjusted against onboarding if the customer continues.
export const TRIAL_PAISE = 10000 * 100; // ₹10,000
export const TRIAL_DAYS = 10;

export interface TrialQuote {
  baseAmount: number; // ₹10,000 in paise
  gstAmount: number; // always 0: kept so existing records/DTOs stay valid
  totalAmount: number;
  days: number;
}

export function computeTrialQuote(): TrialQuote {
  return {
    baseAmount: TRIAL_PAISE,
    gstAmount: 0,
    totalAmount: TRIAL_PAISE,
    days: TRIAL_DAYS,
  };
}

export const ALLOWED_COUPON_PERCENTS = [0, 5, 10, 15, 20, 25, 30] as const;
export type CouponPercent = (typeof ALLOWED_COUPON_PERCENTS)[number];

export interface OnboardingQuote {
  /** ₹50,000 in paise */
  baseAmount: number;
  couponPercent: number;
  /** discount on the base, paise */
  discountAmount: number;
  /** ₹10,000 already paid for the trial, deducted after the discount (0 if no trial) */
  trialCreditAmount: number;
  /** base - discount - trialCredit, paise */
  payableExGst: number;
  /** always ₹5,000 (first month), paise */
  subscriptionComponent: number;
  /** payableExGst - subscriptionComponent, paise */
  setupComponent: number;
  /** always 0: no GST is charged (field kept so stored records stay valid) */
  gstAmount: number;
  /** what the customer pays now, paise */
  totalAmount: number;
}

export function isAllowedCouponPercent(p: number): p is CouponPercent {
  return (ALLOWED_COUPON_PERCENTS as readonly number[]).includes(p);
}

/**
 * @param couponPercent optional discount on the ₹50,000 base (0 = full price)
 * @param trialAlreadyPaid true when the tenant already paid the ₹10,000 trial:
 *        that amount is credited AFTER the discount
 */
export function computeOnboardingQuote(
  couponPercent: number,
  trialAlreadyPaid = false,
): OnboardingQuote {
  if (!isAllowedCouponPercent(couponPercent)) {
    throw new Error(
      `Invalid coupon percent: ${couponPercent}. Allowed: ${ALLOWED_COUPON_PERCENTS.join(', ')}`,
    );
  }
  const baseAmount = ONBOARDING_BASE_PAISE;
  const discountAmount = Math.round((baseAmount * couponPercent) / 100);
  const afterDiscount = baseAmount - discountAmount;
  // Never credit more than what is payable, and never go below the first
  // month's subscription: the ₹5,000 component always has to be collected.
  const trialCreditAmount = trialAlreadyPaid
    ? Math.min(TRIAL_PAISE, Math.max(0, afterDiscount - SUBSCRIPTION_MONTHLY_PAISE))
    : 0;
  const payableExGst = afterDiscount - trialCreditAmount;
  const subscriptionComponent = SUBSCRIPTION_MONTHLY_PAISE;
  const setupComponent = payableExGst - subscriptionComponent;
  return {
    baseAmount,
    couponPercent,
    discountAmount,
    trialCreditAmount,
    payableExGst,
    subscriptionComponent,
    setupComponent,
    gstAmount: 0,
    totalAmount: payableExGst,
  };
}

/** GST on the monthly subscription: always 0, no GST is charged. */
export function monthlySubscriptionGstPaise(): number {
  return 0;
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
