'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { TopHeader } from '../../../../components/layout/Sidebar';
import {
  useValidateCoupon,
  useCreateOnboardingCheckout,
  useSimulateOnboardingPaid,
  useVerifyOnboardingCheckout,
  useBillingSummary,
  useOnboardingQuote,
  formatPaise,
} from '../../../../lib/api/hooks';
import type { BillingPlan } from '../../../../lib/api/hooks/billing';
import { TicketPercent, ShieldCheck, CheckCircle2, XCircle, FlaskConical, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type Phase = 'idle' | 'paying' | 'success' | 'failed';

// Display copy only: the server quote decides what is actually charged.
const PLAN_COPY: Record<
  BillingPlan,
  { name: string; price: string; per: string; sub: string; firstLine: string; renew: string; fallback: number }
> = {
  MONTHLY: {
    name: 'Monthly plan',
    price: '₹5,000',
    per: '/ month',
    sub: '₹0 setup · cancel anytime',
    firstLine: 'First month',
    renew:
      'Paying also sets up a ₹5,000/month auto-debit (UPI Autopay or card). Your first payment covers a full month; the auto-debit then runs on the 1st of every month.',
    fallback: 500000,
  },
  YEARLY: {
    name: 'Yearly plan',
    price: '₹40,000',
    per: '/ year',
    sub: '₹60,000 value · ₹0 setup',
    firstLine: 'First 12 months',
    renew:
      'Paying also sets up a ₹40,000/year auto-debit (UPI Autopay or card), charged once a year on the same date.',
    fallback: 4000000,
  },
};

export default function OnboardingPaymentPage() {
  const router = useRouter();
  const { data: summary } = useBillingSummary();
  const validate = useValidateCoupon();
  const checkout = useCreateOnboardingCheckout();
  const simulate = useSimulateOnboardingPaid();
  const verify = useVerifyOnboardingCheckout();

  // ?plan=MONTHLY|YEARLY from the plans screen; yearly is the default
  const [plan, setPlan] = useState<BillingPlan>('YEARLY');
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('plan');
    if (q === 'MONTHLY' || q === 'YEARLY') setPlan(q); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  const copy = PLAN_COPY[plan];

  const [code, setCode] = useState('');
  const [applied, setApplied] = useState<any>(null); // { coupon, quote }
  const [phase, setPhase] = useState<Phase>('idle');
  const [mockCheckout, setMockCheckout] = useState<any>(null);

  const alreadyPaid = summary && ['PAID', 'ACTIVE'].includes(summary.onboarding_status);
  const quote = applied?.quote;
  // Server quote without a coupon (already includes any paid trial credit).
  // A coupon quote replaces it once applied.
  const { data: plainQuote } = useOnboardingQuote(plan);
  const shownQuote = quote ?? plainQuote;

  function choosePlan(next: BillingPlan) {
    if (next === plan) return;
    setPlan(next);
    // A coupon quote and a pending mock checkout are plan-specific
    setApplied(null);
    setMockCheckout(null);
  }

  async function applyCoupon() {
    if (!code.trim()) {
      toast.error('Enter a coupon code first');
      return;
    }
    try {
      const data = await validate.mutateAsync({ code: code.trim(), plan });
      setApplied(data);
      toast.success(`Coupon ${data.coupon.code} applied: ${data.coupon.percent}% off`);
    } catch (err: any) {
      setApplied(null);
      toast.error(err.message);
    }
  }

  async function payNow() {
    setPhase('paying');
    try {
      // Pass coupon code if one was applied, otherwise empty string (backend handles full price)
      const data = await checkout.mutateAsync({ code: applied?.coupon.code ?? '', plan });

      if (data.mock) {
        // No Razorpay keys configured yet: offer the local simulator instead
        setMockCheckout(data);
        setPhase('idle');
        return;
      }

      const ok = await loadRazorpayScript();
      if (!ok) throw new Error('Could not load Razorpay checkout');

      const rzp = new window.Razorpay({
        key: data.razorpay_key_id,
        subscription_id: data.subscription_id,
        name: 'PraecisAI',
        description: plan === 'YEARLY' ? 'Yearly plan (first 12 months)' : 'Monthly plan (first month)',
        theme: { color: '#7F5539' },
        handler: (response: any) => {
          // Verify the signature server-side and activate immediately: works
          // on localhost too, where Razorpay webhooks can't reach us.
          verify.mutate(
            {
              subscription_id: data.subscription_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            },
            {
              onSuccess: () => {
                setPhase('success');
                toast.success('Payment verified. Your account is active.');
                setTimeout(() => router.push('/dashboard/billing'), 2500);
              },
              onError: (err: any) => {
                setPhase('failed');
                toast.error(`Payment received but verification failed: ${err.message}. Contact support if access does not open shortly.`);
              },
            },
          );
        },
        modal: { ondismiss: () => setPhase('idle') },
      });
      rzp.on('payment.failed', () => setPhase('failed'));
      rzp.open();
    } catch (err: any) {
      setPhase('failed');
      toast.error(err.message);
    }
  }

  async function simulatePayment() {
    setPhase('paying');
    try {
      await simulate.mutateAsync();
      setPhase('success');
      toast.success('Test payment simulated: account activated');
      setTimeout(() => router.push('/dashboard/billing'), 2000);
    } catch (err: any) {
      setPhase('failed');
      toast.error(err.message);
    }
  }

  return (
    <>
      <TopHeader title="Choose your plan" subtitle="No setup fee · pay monthly or yearly" />
      <div className="flex-1 flex items-start justify-center p-4 sm:p-8 pt-8">
      <div className="w-full max-w-lg">
        {alreadyPaid ? (
          <div className="glass-card p-6 text-center">
            <CheckCircle2 size={40} className="mx-auto mb-3" style={{ color: '#2E7D32' }} />
            <p className="font-semibold text-[var(--dark-brown)]">Your plan is already active</p>
            <button
              onClick={() => router.push('/dashboard/billing')}
              className="mt-4 px-5 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
            >
              Go to Billing &amp; Usage
            </button>
          </div>
        ) : phase === 'success' ? (
          <div className="glass-card p-8 text-center">
            <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: '#2E7D32' }} />
            <h2 className="text-xl font-bold text-[var(--dark-brown)]">Payment successful</h2>
            <p className="text-sm text-[var(--walnut)] mt-2">
              Our team is now setting up your account. This takes up to 3 to 4 working days, and
              you&rsquo;ll get dashboard access automatically as soon as it&rsquo;s ready.{' '}
              {plan === 'YEARLY'
                ? 'Your plan renews automatically at ₹40,000 a year from today.'
                : 'Your ₹5,000 monthly auto-debit starts after your first month.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {phase === 'failed' && (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl border text-sm"
                style={{ background: '#C6282812', borderColor: '#C6282840', color: 'var(--dark-brown)' }}
              >
                <XCircle size={17} style={{ color: '#C62828' }} />
                Payment did not complete. No money was deducted, or it will be auto-refunded by Razorpay. You can try again below.
              </div>
            )}

            {/* Plan switch */}
            <div className="grid grid-cols-2 gap-3">
              {(['MONTHLY', 'YEARLY'] as BillingPlan[]).map((p) => {
                const on = p === plan;
                const c = PLAN_COPY[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => choosePlan(p)}
                    className="glass-card p-4 text-left relative transition-colors"
                    style={{ border: on ? '2px solid var(--mahogany)' : '2px solid transparent' }}
                  >
                    {p === 'YEARLY' && (
                      <span
                        className="absolute -top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
                      >
                        Save ₹20,000
                      </span>
                    )}
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--walnut)]">{c.name}</p>
                    <p className="mt-1 text-xl font-bold text-[var(--dark-brown)]">
                      {c.price}
                      <span className="text-xs font-normal text-[var(--walnut)]"> {c.per}</span>
                    </p>
                    <p className="text-[11px] text-[var(--walnut)] mt-0.5">{c.sub}</p>
                  </button>
                );
              })}
            </div>

            {/* Price card. Every figure comes from the server quote: it
                already accounts for any paid-trial credit. No GST is charged. */}
            <div className="glass-card p-5">
              <h2 className="font-semibold text-[var(--dark-brown)] mb-4">{copy.name}</h2>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--walnut)]">{copy.firstLine}</span>
                  <span className="font-medium text-[var(--dark-brown)]">{formatPaise(shownQuote?.baseAmount ?? copy.fallback)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--walnut)]">Setup fee</span>
                  <span className="font-medium" style={{ color: '#2E7D32' }}>₹0</span>
                </div>
                {quote && (
                  <div className="flex justify-between" style={{ color: '#2E7D32' }}>
                    <span>Coupon {applied.coupon.code} ({applied.coupon.percent}% off)</span>
                    <span className="font-medium">- {formatPaise(quote.discountAmount)}</span>
                  </div>
                )}
                {(shownQuote?.trialCreditAmount ?? 0) > 0 && (
                  <div className="flex justify-between" style={{ color: '#2E7D32' }}>
                    <span>Trial already paid, adjusted</span>
                    <span className="font-medium">- {formatPaise(shownQuote.trialCreditAmount)}</span>
                  </div>
                )}
                <div
                  className="flex justify-between text-base font-bold pt-2.5 border-t"
                  style={{ borderColor: 'var(--caramel)', color: 'var(--mahogany)' }}
                >
                  <span>Total payable now</span>
                  <span>{formatPaise(shownQuote?.totalAmount ?? copy.fallback)}</span>
                </div>
                <p className="text-xs text-[var(--walnut)] pt-1">
                  No GST is added: this is the final amount.
                  {plan === 'MONTHLY' && ' A paid trial is adjusted only against the yearly plan.'}
                  {!quote && ' Have a discount coupon? Apply it below.'}
                </p>
                <p className="text-xs text-[var(--walnut)]">
                  AI calls and WhatsApp messages are pay as you go, paid directly to Bolna and AiSensy.
                </p>
              </div>
            </div>

            {/* Coupon */}
            <div className="glass-card p-5">
              <p className="text-sm font-semibold text-[var(--dark-brown)] mb-2 flex items-center gap-2">
                <TicketPercent size={16} className="text-[var(--mahogany)]" />
                Discount coupon <span className="text-xs font-normal text-[var(--walnut)]">(optional)</span>
              </p>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setApplied(null);
                  }}
                  placeholder="e.g. TEST10"
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm border bg-[var(--surface-warm)] text-[var(--dark-brown)]"
                  style={{ borderColor: 'var(--caramel)' }}
                />
                <button
                  onClick={applyCoupon}
                  disabled={validate.isPending}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold border text-[var(--mahogany)]"
                  style={{ borderColor: 'var(--caramel)' }}
                >
                  {validate.isPending ? 'Checking…' : 'Apply'}
                </button>
              </div>
              <p className="text-[11px] text-[var(--walnut)] mt-2">
                Don&apos;t have a coupon? Skip this and pay the full amount directly. A coupon applies to your first payment.
              </p>
            </div>

            {/* Pay */}
            {mockCheckout ? (
              <div className="glass-card p-5" style={{ borderLeft: '4px solid #B8860B' }}>
                <p className="text-sm font-semibold text-[var(--dark-brown)] flex items-center gap-2">
                  <FlaskConical size={16} style={{ color: '#B8860B' }} /> Razorpay test mode
                </p>
                <p className="text-xs text-[var(--walnut)] mt-1 mb-3">
                  Razorpay keys are not configured yet, so no real checkout can open. Use the simulator to
                  exercise the full activation flow (payment record, invoice, subscription, notifications).
                </p>
                <button
                  onClick={simulatePayment}
                  disabled={phase === 'paying'}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: '#B8860B', color: '#fff' }}
                >
                  {phase === 'paying' ? 'Simulating…' : `Simulate payment of ${formatPaise(mockCheckout.quote.totalAmount)}`}
                </button>
              </div>
            ) : (
              <button
                onClick={payNow}
                disabled={phase === 'paying'}
                className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
              >
                {phase === 'paying' ? (
                  <><Loader2 size={16} className="animate-spin" /> Opening checkout…</>
                ) : (
                  <><ShieldCheck size={16} /> Pay {formatPaise(shownQuote?.totalAmount ?? copy.fallback)} securely</>
                )}
              </button>
            )}

            <p className="text-[11px] text-[var(--walnut)] text-center">{copy.renew}</p>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
