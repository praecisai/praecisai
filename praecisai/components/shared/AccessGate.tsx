'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  useBillingAccess,
  useCreateTrialCheckout,
  useSimulateTrialPaid,
  useVerifyTrialCheckout,
  formatPaise,
} from '../../lib/api/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardShell } from '../layout/Sidebar';
import { Logo } from '../../app/components/landing/Logo';
import { createClient } from '../../lib/supabase/client';
import {
  Sparkles, Rocket, CalendarClock, CheckCircle2, FlaskConical, Loader2, Clock3, LogOut,
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
 * an active 10-day trial) get the full dashboard shell; locked accounts get
 * a BARE plans page: no sidebar, no dashboard chrome. Billing/checkout
 * routes stay reachable (also bare while locked) so payment is always
 * possible.
 */
export function AccessGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: access, isLoading } = useBillingAccess();

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--cream)' }}
      >
        <Loader2 size={22} className="animate-spin text-[var(--walnut)]" />
      </div>
    );
  }

  if (access?.entitled) return <DashboardShell>{children}</DashboardShell>;

  // Locked: billing/checkout pages render without the dashboard shell
  if (pathname.startsWith('/dashboard/billing')) {
    return <BareChrome>{children}</BareChrome>;
  }

  return (
    <BareChrome>
      <PlansScreen trialExpired={!!access?.trial_expired} />
    </BareChrome>
  );
}

/** Minimal chrome for locked accounts: logo bar + sign out, no sidebar. */
function BareChrome({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <header
        className="px-4 sm:px-6 py-4 border-b flex items-center justify-between"
        style={{ background: 'var(--surface-warm)', borderColor: 'rgba(221,184,146,0.4)' }}
      >
        <Logo />
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--walnut)] hover:text-[var(--mahogany)]"
        >
          <LogOut size={13} /> Sign out
        </button>
      </header>
      {children}
    </div>
  );
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
  const verifyTrial = useVerifyTrialCheckout();
  const [mockPending, setMockPending] = useState<any>(null);
  const [paying, setPaying] = useState(false);
  const [activating, setActivating] = useState(false);

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
        description: '10-day full access trial incl. 18% GST',
        theme: { color: '#7F5539' },
        handler: (response: any) => {
          // Verify the signature server-side and activate immediately: no
          // webhook required, so this also works on localhost.
          setActivating(true);
          verifyTrial.mutate(
            {
              order_id: data.order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            },
            {
              onSuccess: () => {
                toast.success('Payment verified: your 10-day trial is active');
                qc.invalidateQueries({ queryKey: ['billing'] });
              },
              onError: (err: any) => {
                setActivating(false);
                toast.error(`Payment received but verification failed: ${err.message}. Contact support if access does not open shortly.`);
              },
            },
          );
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.on('payment.failed', () => {
        setPaying(false);
        toast.error('Payment failed: nothing was charged as activated. You can try again.');
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
      toast.success('Trial activated (test mode): 10 days of full access');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (activating) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 size={26} className="animate-spin text-[var(--mahogany)]" />
        <p className="text-sm text-[var(--walnut)]">Verifying payment and opening your dashboard…</p>
      </div>
    );
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
            <Clock3 size={13} /> Your 10-day trial has ended. Continue with onboarding to keep going.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:items-stretch">
        {/* Trial */}
        <PlanCard
          highlight={!trialExpired}
          icon={Sparkles}
          title="10-Day Trial"
          price="₹10,000"
          priceSub={`+ 18% GST (${formatPaise(1180000)} total) · one-time · 10 days of full access`}
          points={[...FEATURES, 'Access closes automatically after 10 days']}
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
                {paying ? 'Opening checkout…' : 'Start 10-day trial'}
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
            'GST invoice for every debit',
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
