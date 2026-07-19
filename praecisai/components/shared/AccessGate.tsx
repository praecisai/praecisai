'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import {
  useBillingAccess,
  useCreateTrialCheckout,
  useSimulateTrialPaid,
  formatPaise,
} from '../../lib/api/hooks';
import { useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, Rocket, CalendarClock, CheckCircle2, FlaskConical, Loader2, Clock3,
} from 'lucide-react';

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

const FEATURES = [
  'AI recovery calls in Hindi + English',
  'WhatsApp statement PDFs',
  'Tally Excel import and outstanding tracking',
  'Recovery reports, PDC and PTP tracking',
];

/**
 * Paywall around the dashboard. Entitled accounts (allowlisted, paid, or on
 * an active 1-week trial) pass straight through; everyone else sees the plans
 * screen. Billing routes stay reachable so checkout is always possible.
 */
export function AccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: access, isLoading } = useBillingAccess();

  // Checkout and billing pages must never be locked behind the paywall
  if (pathname.startsWith('/dashboard/billing')) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-[var(--walnut)]" />
      </div>
    );
  }

  if (access?.entitled) return <>{children}</>;

  return <PlansScreen trialExpired={!!access?.trial_expired} />;
}

function PlanCard({
  highlight,
  icon: Icon,
  title,
  price,
  priceSub,
  points,
  footer,
}: {
  highlight?: boolean;
  icon: React.ElementType;
  title: string;
  price: string;
  priceSub: string;
  points: string[];
  footer: React.ReactNode;
}) {
  return (
    <div
      className="glass-card p-6 flex flex-col"
      style={highlight ? { border: '2px solid var(--mahogany)', position: 'relative' } : {}}
    >
      {highlight && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider"
          style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
        >
          Try it first
        </span>
      )}
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className="text-[var(--mahogany)]" />
        <h3 className="font-semibold text-[var(--dark-brown)]">{title}</h3>
      </div>
      <p className="text-2xl font-bold text-[var(--dark-brown)]">{price}</p>
      <p className="text-xs text-[var(--walnut)] mb-4">{priceSub}</p>
      <ul className="space-y-2 mb-5 flex-1">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-xs text-[var(--dark-brown)]">
            <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#2E7D32' }} />
            {p}
          </li>
        ))}
      </ul>
      {footer}
    </div>
  );
}

function PlansScreen({ trialExpired }: { trialExpired: boolean }) {
  const qc = useQueryClient();
  const trialCheckout = useCreateTrialCheckout();
  const simulateTrial = useSimulateTrialPaid();
  const [mockPending, setMockPending] = useState<any>(null);
  const [paying, setPaying] = useState(false);

  async function startTrial() {
    setPaying(true);
    try {
      const data = await trialCheckout.mutateAsync();
      if (data.mock) {
        setMockPending(data);
        setPaying(false);
        return;
      }
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error('Could not load Razorpay checkout');
      const rzp = new window.Razorpay({
        key: data.razorpay_key_id,
        order_id: data.order_id,
        amount: data.amount_paise,
        currency: 'INR',
        name: 'PraecisAI',
        description: '1-week full access trial incl. 18% GST',
        theme: { color: '#7F5539' },
        handler: () => {
          toast.success('Payment received: your trial is being activated');
          setTimeout(() => qc.invalidateQueries({ queryKey: ['billing'] }), 2500);
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.on('payment.failed', () => {
        setPaying(false);
        toast.error('Payment failed: nothing was activated. You can try again.');
      });
      rzp.open();
    } catch (err: any) {
      setPaying(false);
      toast.error(err.message);
    }
  }

  async function simulate() {
    try {
      await simulateTrial.mutateAsync();
      toast.success('Trial activated (test mode): 1 week of full access');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-[var(--dark-brown)]">Choose your plan</h1>
        <p className="text-sm text-[var(--walnut)] mt-2">
          Your account is created. Pick a plan to unlock the recovery dashboard.
        </p>
        {trialExpired && (
          <p
            className="inline-flex items-center gap-2 text-xs font-semibold mt-3 px-3 py-1.5 rounded-full"
            style={{ background: '#C6282815', color: '#C62828', border: '1px solid #C6282840' }}
          >
            <Clock3 size={13} /> Your 1-week trial has ended. Continue with onboarding to keep going.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:items-stretch">
        {/* Trial */}
        <PlanCard
          highlight={!trialExpired}
          icon={Sparkles}
          title="1-Week Trial"
          price="₹10,000"
          priceSub={`+ 18% GST (${formatPaise(1180000)} total) · one-time · 7 days of full access`}
          points={[...FEATURES, 'Access closes automatically after 7 days']}
          footer={
            trialExpired ? (
              <p className="text-xs text-center text-[var(--walnut)] py-2">Trial already used</p>
            ) : mockPending ? (
              <button
                onClick={simulate}
                className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: '#B8860B', color: '#fff' }}
              >
                <FlaskConical size={14} /> Simulate trial payment (test mode)
              </button>
            ) : (
              <button
                onClick={startTrial}
                disabled={paying}
                className="w-full py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
                style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
              >
                {paying ? 'Opening checkout…' : 'Start 1-week trial'}
              </button>
            )
          }
        />

        {/* Onboarding */}
        <PlanCard
          icon={Rocket}
          title="Full Onboarding"
          price="₹50,000"
          priceSub="+ 18% GST · one-time · includes your first month's subscription"
          points={[
            ...FEATURES,
            'Guided setup with the Praecis team',
            'Discount coupon applied at checkout',
          ]}
          footer={
            <Link
              href="/dashboard/billing/onboarding"
              className="w-full py-2.5 rounded-lg text-sm font-bold text-center block"
              style={{ background: 'var(--dark-brown)', color: 'var(--cream)' }}
            >
              Get started
            </Link>
          }
        />

        {/* Monthly */}
        <PlanCard
          icon={CalendarClock}
          title="Monthly Subscription"
          price="₹5,000"
          priceSub="+ 18% GST per month · auto-debit on the 1st (UPI Autopay or card)"
          points={[
            'Continues automatically after onboarding',
            'First month already included in onboarding',
            'GST invoice emailed every month',
            'Cancel anytime with the Praecis team',
          ]}
          footer={
            <p className="text-xs text-center text-[var(--walnut)] py-2">
              Set up automatically with Full Onboarding
            </p>
          }
        />
      </div>

      <p className="text-[11px] text-[var(--walnut)] text-center mt-6">
        Bolna calling credits and AiSensy WhatsApp plans are paid directly to those platforms and are not part of these prices.
      </p>
    </div>
  );
}
