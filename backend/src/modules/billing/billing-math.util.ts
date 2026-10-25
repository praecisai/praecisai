/**
 * Pure billing math. All amounts are integer PAISE.
 * Server-side only: client math is never trusted.
 *
 * Pricing model (NO GST: the listed price is exactly what is charged).
 * There is NO setup fee. The customer picks one of two plans:
 * - MONTHLY: ₹5,000 now for the first month, then ₹5,000 auto-debited on the
 *   1st of every month.
 * - YEARLY: ₹40,000 now for 12 months (instead of 12 × ₹5,000 = ₹60,000),
 *   then ₹40,000 auto-debited once a year.
 * The first payment is still recorded as the ONBOARDING payment (that is what
 * unlocks the account); its whole amount is the subscription component.
 * - An OPTIONAL coupon percent applies to the first payment only.
 * - Trial credit: a customer who already paid for a trial gets THAT amount
 *   deducted AFTER the coupon, but at least one month (₹5,000) is always
 *   collected, so in practice the credit only applies to the yearly plan.
 */

export type BillingPlan = 'MONTHLY' | 'YEARLY';
export const BILLING_PLANS: BillingPlan[] = ['MONTHLY', 'YEARLY'];
export function isBillingPlan(v: unknown): v is BillingPlan {
  return v === 'MONTHLY' || v === 'YEARLY';
}

export const SUBSCRIPTION_MONTHLY_PAISE = 5000 * 100; // ₹5,000
export const SUBSCRIPTION_YEARLY_PAISE = 40000 * 100; // ₹40,000
/** Struck-through "was" price for the yearly plan: 12 × ₹5,000. */
export const SUBSCRIPTION_YEARLY_LIST_PAISE = 12 * SUBSCRIPTION_MONTHLY_PAISE; // ₹60,000

export function planAmountPaise(plan: BillingPlan): number {
  return plan === 'YEARLY' ? SUBSCRIPTION_YEARLY_PAISE : SUBSCRIPTION_MONTHLY_PAISE;
}

/**
 * Which plan a stored subscription is on. Recovered from its plan_amount so no
 * new column is needed: ₹40,000 is yearly, anything else (₹5,000, and the
 * legacy onboarding-era subscriptions) is monthly.
 */
export function planFromAmount(planAmountPaise: number | null | undefined): BillingPlan {
  return planAmountPaise === SUBSCRIPTION_YEARLY_PAISE ? 'YEARLY' : 'MONTHLY';
}

// Legacy names kept so older imports keep compiling: the onboarding base is
// now simply the yearly plan price, shown against its ₹60,000 list price.
export const ONBOARDING_LIST_PAISE = SUBSCRIPTION_YEARLY_LIST_PAISE;
export const ONBOARDING_BASE_PAISE = SUBSCRIPTION_YEARLY_PAISE;
// Kept for the Razorpay plan amount: no GST is added, so this is the plain
// monthly price. (Name retained to avoid churn in the Razorpay plan wiring.)
export const SUBSCRIPTION_PLAN_PAISE_INCL_GST = SUBSCRIPTION_MONTHLY_PAISE;

/**
 * Paid trials: full platform access for a fixed window, no coupon, no mandate.
 * Non-refundable; the amount paid is credited against onboarding if the
 * customer continues.
 */
export const TRIAL_PLANS = {
  STARTER: { id: 'STARTER', paise: 5000 * 100, days: 15 },
  STANDARD: { id: 'STANDARD', paise: 10000 * 100, days: 10 },
} as const;

export type TrialTier = keyof typeof TRIAL_PLANS;
export const TRIAL_TIERS = Object.keys(TRIAL_PLANS) as TrialTier[];
export const DEFAULT_TRIAL_TIER: TrialTier = 'STANDARD';

export function isTrialTier(v: unknown): v is TrialTier {
  return typeof v === 'string' && (TRIAL_TIERS as string[]).includes(v);
}

// Back-compat: the original single-tier constants map to the ₹10,000 plan.
export const TRIAL_PAISE = TRIAL_PLANS.STANDARD.paise;
export const TRIAL_DAYS = TRIAL_PLANS.STANDARD.days;

/**
 * Trial length for an already-captured payment. The tier is recovered from the
 * amount charged so no extra column is needed on billing_payments (and so old
 * ₹10,000 rows keep resolving to 10 days).
 */
export function trialDaysForAmount(totalPaise: number): number {
  const match = TRIAL_TIERS.map((t) => TRIAL_PLANS[t]).find((p) => p.paise === totalPaise);
  return match?.days ?? TRIAL_PLANS.STANDARD.days;
}

export interface TrialQuote {
  tier: TrialTier;
  baseAmount: number;
  gstAmount: number; // always 0: kept so existing records/DTOs stay valid
  totalAmount: number;
  days: number;
}

export function computeTrialQuote(tier: TrialTier = DEFAULT_TRIAL_TIER): TrialQuote {
  const plan = TRIAL_PLANS[tier];
  if (!plan) throw new Error(`Unknown trial tier: ${tier}`);
  return {
    tier,
    baseAmount: plan.paise,
    gstAmount: 0,
    totalAmount: plan.paise,
    days: plan.days,
  };
}

export const ALLOWED_COUPON_PERCENTS = [0, 5, 10, 15, 20, 25, 30] as const;
export type CouponPercent = (typeof ALLOWED_COUPON_PERCENTS)[number];

export interface OnboardingQuote {
  plan: BillingPlan;
  /** Struck-through list price: ₹60,000 for yearly, ₹5,000 for monthly */
  listAmount: number;
  /** Plan price for the first period (₹5,000 or ₹40,000) in paise */
  baseAmount: number;
  couponPercent: number;
  /** discount on the base, paise */
  discountAmount: number;
  /** what the tenant already paid for a trial, deducted after the discount (0 if none) */
  trialCreditAmount: number;
  /** base - discount - trialCredit, paise */
  payableExGst: number;
  /** the whole payable amount: the first month or year of the plan, paise */
  subscriptionComponent: number;
  /** always 0: there is no setup fee (field kept so stored records stay valid) */
  setupComponent: number;
  /** what is auto-debited after the first period, paise */
  recurringAmount: number;
  /** always 0: no GST is charged (field kept so stored records stay valid) */
  gstAmount: number;
  /** what the customer pays now, paise */
  totalAmount: number;
}

export function isAllowedCouponPercent(p: number): p is CouponPercent {
  return (ALLOWED_COUPON_PERCENTS as readonly number[]).includes(p);
}

/**
 * @param couponPercent optional discount on the first payment (0 = full price)
 * @param trialAlreadyPaid the trial amount in paise already paid by this tenant
 *        (credited AFTER the discount). `true` is accepted for back-compat and
 *        means the ₹10,000 standard trial; `false`/`0` means no trial.
 */
export function computeOnboardingQuote(
  couponPercent: number,
  trialAlreadyPaid: boolean | number = false,
  plan: BillingPlan = 'YEARLY',
): OnboardingQuote {
  if (!isAllowedCouponPercent(couponPercent)) {
    throw new Error(
      `Invalid coupon percent: ${couponPercent}. Allowed: ${ALLOWED_COUPON_PERCENTS.join(', ')}`,
    );
  }
  const baseAmount = planAmountPaise(plan);
  const discountAmount = Math.round((baseAmount * couponPercent) / 100);
  const afterDiscount = baseAmount - discountAmount;
  // `true` keeps the old boolean call sites working as the ₹10,000 tier.
  const trialPaid =
    trialAlreadyPaid === true
      ? TRIAL_PAISE
      : trialAlreadyPaid === false
        ? 0
        : Math.max(0, trialAlreadyPaid);
  // Never credit more than what is payable, and never go below the first
  // month's subscription: the ₹5,000 component always has to be collected.
  const trialCreditAmount = trialPaid
    ? Math.min(trialPaid, Math.max(0, afterDiscount - SUBSCRIPTION_MONTHLY_PAISE))
    : 0;
  const payableExGst = afterDiscount - trialCreditAmount;
  return {
    plan,
    listAmount: plan === 'YEARLY' ? SUBSCRIPTION_YEARLY_LIST_PAISE : SUBSCRIPTION_MONTHLY_PAISE,
    baseAmount,
    couponPercent,
    discountAmount,
    trialCreditAmount,
    payableExGst,
    subscriptionComponent: payableExGst,
    setupComponent: 0,
    recurringAmount: baseAmount,
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

/**
 * Yearly plan: the first auto-debit is the same calendar day one year after
 * signup (29 Feb clamps to 28 Feb). Returns 00:00 IST on that day.
 */
export function firstYearlyDebitDate(signup: Date): Date {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const ist = new Date(signup.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear() + 1;
  const m = ist.getUTCMonth();
  const daysInTarget = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(ist.getUTCDate(), daysInTarget)) - IST_OFFSET_MS);
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
