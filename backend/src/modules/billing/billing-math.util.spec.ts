import {
  computeOnboardingQuote,
  firstDebitDate,
  financialYearCode,
  monthlySubscriptionGstPaise,
  SUBSCRIPTION_PLAN_PAISE_INCL_GST,
} from './billing-math.util';

describe('computeOnboardingQuote', () => {
  // Base ₹50,000 ex-GST includes the first month's ₹5,000. Coupon applies to
  // the base; the ₹5,000 subscription component is fixed after discount.
  const CASES = [
    // [percent, discount, payable, setup, gst, total] (all rupees)
    [5, 2500, 47500, 42500, 8550, 56050],
    [10, 5000, 45000, 40000, 8100, 53100],
    [15, 7500, 42500, 37500, 7650, 50150],
    [20, 10000, 40000, 35000, 7200, 47200],
  ] as const;

  it.each(CASES)(
    '%i%% coupon → discount %i, payable %i, setup %i, gst %i, total %i',
    (percent, discount, payable, setup, gst, total) => {
      const q = computeOnboardingQuote(percent);
      expect(q.baseAmount).toBe(50000 * 100);
      expect(q.discountAmount).toBe(discount * 100);
      expect(q.payableExGst).toBe(payable * 100);
      expect(q.subscriptionComponent).toBe(5000 * 100);
      expect(q.setupComponent).toBe(setup * 100);
      expect(q.gstAmount).toBe(gst * 100);
      expect(q.totalAmount).toBe(total * 100);
      // Internal consistency: components + GST always reassemble the total
      expect(q.setupComponent + q.subscriptionComponent + q.gstAmount).toBe(q.totalAmount);
      expect(q.baseAmount - q.discountAmount).toBe(q.payableExGst);
    },
  );

  it('spec example: 10% coupon → ₹45,000 = ₹5,000 subscription + ₹40,000 setup', () => {
    const q = computeOnboardingQuote(10);
    expect(q.payableExGst).toBe(4500000);
    expect(q.subscriptionComponent).toBe(500000);
    expect(q.setupComponent).toBe(4000000);
  });

  it('rejects percents outside 5/10/15/20', () => {
    for (const bad of [0, 1, 25, 50, -5, 7]) {
      expect(() => computeOnboardingQuote(bad)).toThrow();
    }
  });

  it('all amounts are integer paise (no fractional paise)', () => {
    for (const p of [5, 10, 15, 20] as const) {
      const q = computeOnboardingQuote(p);
      for (const v of Object.values(q)) {
        expect(Number.isInteger(v)).toBe(true);
      }
    }
  });
});

describe('monthly subscription amounts', () => {
  it('₹5,000 + 18% GST = ₹5,900 plan', () => {
    expect(monthlySubscriptionGstPaise()).toBe(90000);
    expect(SUBSCRIPTION_PLAN_PAISE_INCL_GST).toBe(590000);
  });
});

describe('firstDebitDate: IMMEDIATE_NEXT_FIRST (default)', () => {
  // Dates constructed at noon IST to avoid timezone edge ambiguity
  const istNoon = (y: number, m: number, d: number) =>
    new Date(Date.UTC(y, m - 1, d, 6, 30)); // 12:00 IST = 06:30 UTC

  const istDate = (dt: Date) => {
    const ist = new Date(dt.getTime() + 5.5 * 60 * 60 * 1000);
    return `${ist.getUTCFullYear()}-${ist.getUTCMonth() + 1}-${ist.getUTCDate()}`;
  };

  it('signup 27 May → 1 June (spec example)', () => {
    expect(istDate(firstDebitDate(istNoon(2026, 5, 27), 'IMMEDIATE_NEXT_FIRST'))).toBe('2026-6-1');
  });

  it('signup ON the 1st → 1st of NEXT month (first month is in the onboarding fee)', () => {
    expect(istDate(firstDebitDate(istNoon(2026, 6, 1), 'IMMEDIATE_NEXT_FIRST'))).toBe('2026-7-1');
  });

  it('signup on the 31st → next 1st', () => {
    expect(istDate(firstDebitDate(istNoon(2026, 7, 31), 'IMMEDIATE_NEXT_FIRST'))).toBe('2026-8-1');
  });

  it('signup 31 Dec (year end) → 1 Jan next year', () => {
    expect(istDate(firstDebitDate(istNoon(2026, 12, 31), 'IMMEDIATE_NEXT_FIRST'))).toBe('2027-1-1');
  });

  it('signup 28 Feb (month-end, non-leap) → 1 Mar', () => {
    expect(istDate(firstDebitDate(istNoon(2026, 2, 28), 'IMMEDIATE_NEXT_FIRST'))).toBe('2026-3-1');
  });

  it('result is midnight IST on the debit day', () => {
    const d = firstDebitDate(istNoon(2026, 5, 27), 'IMMEDIATE_NEXT_FIRST');
    const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
    expect(ist.getUTCHours()).toBe(0);
    expect(ist.getUTCMinutes()).toBe(0);
  });
});

describe('firstDebitDate: FIRST_AFTER_FULL_MONTH', () => {
  const istNoon = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 6, 30));
  const istDate = (dt: Date) => {
    const ist = new Date(dt.getTime() + 5.5 * 60 * 60 * 1000);
    return `${ist.getUTCFullYear()}-${ist.getUTCMonth() + 1}-${ist.getUTCDate()}`;
  };

  it('signup 27 May → covered till 27 June → 1 July', () => {
    expect(istDate(firstDebitDate(istNoon(2026, 5, 27), 'FIRST_AFTER_FULL_MONTH'))).toBe('2026-7-1');
  });

  it('signup on the 1st → exactly one month later (1st itself qualifies)', () => {
    expect(istDate(firstDebitDate(istNoon(2026, 6, 1), 'FIRST_AFTER_FULL_MONTH'))).toBe('2026-7-1');
  });

  it('signup 31 Jan → clamped to 28 Feb → 1 Mar', () => {
    expect(istDate(firstDebitDate(istNoon(2026, 1, 31), 'FIRST_AFTER_FULL_MONTH'))).toBe('2026-3-1');
  });

  it('signup 31 Dec → clamped to 31 Jan → 1 Feb', () => {
    expect(istDate(firstDebitDate(istNoon(2026, 12, 31), 'FIRST_AFTER_FULL_MONTH'))).toBe('2027-2-1');
  });
});

describe('financialYearCode', () => {
  const istNoon = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 6, 30));

  it('July 2026 → 26-27 (FY starts in April)', () => {
    expect(financialYearCode(istNoon(2026, 7, 19))).toBe('26-27');
  });

  it('February 2026 → 25-26', () => {
    expect(financialYearCode(istNoon(2026, 2, 10))).toBe('25-26');
  });

  it('April 1 → new FY; March 31 → old FY', () => {
    expect(financialYearCode(istNoon(2026, 4, 1))).toBe('26-27');
    expect(financialYearCode(istNoon(2026, 3, 31))).toBe('25-26');
  });
});
