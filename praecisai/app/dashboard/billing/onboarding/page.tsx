'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { TopHeader } from '../../../../components/layout/Sidebar';
import {
  useValidateCoupon,
  useCreateOnboardingCheckout,
  useSimulateOnboardingPaid,
  useVerifyOnboardingCheckout,
  useBillingSummary,
  formatPaise,
} from '../../../../lib/api/hooks';
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

export default function OnboardingPaymentPage() {
  const router = useRouter();
  const { data: summary } = useBillingSummary();
  const validate = useValidateCoupon();
  const checkout = useCreateOnboardingCheckout();
  const simulate = useSimulateOnboardingPaid();
  const verify = useVerifyOnboardingCheckout();

  const [code, setCode] = useState('');
  const [applied, setApplied] = useState<any>(null); // { coupon, quote }
  const [phase, setPhase] = useState<Phase>('idle');
  const [mockCheckout, setMockCheckout] = useState<any>(null);

  const alreadyPaid = summary && ['PAID', 'ACTIVE'].includes(summary.onboarding_status);
  const quote = applied?.quote;

  async function applyCoupon() {
    if (!code.trim()) {
      toast.error('Enter a coupon code: a coupon is required at checkout');
      return;
    }
    try {
      const data = await validate.mutateAsync(code.trim());
      setApplied(data);
      toast.success(`Coupon ${data.coupon.code} applied: ${data.coupon.percent}% off`);
    } catch (err: any) {
      setApplied(null);
      toast.error(err.message);
    }
  }

  async function payNow() {
    if (!applied) return;
    setPhase('paying');
    try {
      const data = await checkout.mutateAsync(applied.coupon.code);

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
        description: 'Onboarding (setup + first month) incl. GST',
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
      <TopHeader title="Onboarding Payment" subtitle="One-time setup fee · includes your first month" />
      <div className="p-4 sm:p-6 max-w-3xl">
        {alreadyPaid ? (
          <div className="glass-card p-6 text-center">
            <CheckCircle2 size={40} className="mx-auto mb-3" style={{ color: '#2E7D32' }} />
            <p className="font-semibold text-[var(--dark-brown)]">Onboarding payment already completed</p>
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
              Your account is being activated. Your monthly auto-debit of ₹5,900 (incl. GST) starts on the next 1st.
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

            {/* Price card */}
            <div className="glass-card p-5">
              <h2 className="font-semibold text-[var(--dark-brown)] mb-4">One-time onboarding</h2>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--walnut)]">Onboarding fee (includes first month)</span>
                  <span className="font-medium text-[var(--dark-brown)]">₹50,000.00</span>
                </div>
                {quote && (
                  <>
                    <div className="flex justify-between" style={{ color: '#2E7D32' }}>
                      <span>Coupon {applied.coupon.code} ({applied.coupon.percent}% off)</span>
                      <span className="font-medium">- {formatPaise(quote.discountAmount)}</span>
                    </div>
                    <div className="border-t pt-2.5 space-y-1.5" style={{ borderColor: 'var(--caramel)' }}>
                      <div className="flex justify-between text-xs text-[var(--walnut)]">
                        <span>· Setup component</span>
                        <span>{formatPaise(quote.setupComponent)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-[var(--walnut)]">
                        <span>· First month subscription</span>
                        <span>{formatPaise(quote.subscriptionComponent)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--walnut)]">GST @ 18%</span>
                      <span className="font-medium text-[var(--dark-brown)]">{formatPaise(quote.gstAmount)}</span>
                    </div>
                    <div
                      className="flex justify-between text-base font-bold pt-2.5 border-t"
                      style={{ borderColor: 'var(--caramel)', color: 'var(--mahogany)' }}
                    >
                      <span>Total payable now</span>
                      <span>{formatPaise(quote.totalAmount)}</span>
                    </div>
                  </>
                )}
                {!quote && (
                  <p className="text-xs text-[var(--walnut)] pt-1">
                    Apply your coupon to see the discounted total: GST 18% is added on the discounted amount.
                  </p>
                )}
              </div>
            </div>

            {/* Coupon */}
            <div className="glass-card p-5">
              <p className="text-sm font-semibold text-[var(--dark-brown)] mb-2 flex items-center gap-2">
                <TicketPercent size={16} className="text-[var(--mahogany)]" />
                Discount coupon <span className="text-xs font-normal text-[var(--walnut)]">(required)</span>
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
                disabled={!applied || phase === 'paying'}
                className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
              >
                {phase === 'paying' ? (
                  <><Loader2 size={16} className="animate-spin" /> Opening checkout…</>
                ) : (
                  <><ShieldCheck size={16} /> {quote ? `Pay ${formatPaise(quote.totalAmount)} securely` : 'Apply a coupon to continue'}</>
                )}
              </button>
            )}

            <p className="text-[11px] text-[var(--walnut)] text-center">
              Paying also sets up your ₹5,900/month auto-debit mandate (UPI Autopay or card), charged on the 1st of every month starting next month.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
