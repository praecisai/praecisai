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

/**
 * Mirrors TRIAL_PLANS / SUBSCRIPTION_*_PAISE in the backend's
 * billing-math.util.ts. The server is the source of truth for what is actually
 * charged; these are display strings only.
 */
export type TrialTier = 'STARTER' | 'STANDARD';

const TRIAL_TIERS: Record<
  TrialTier,
  { days: number; priceLabel: string; afterCreditLabel: string; featured?: boolean; badge?: string }
> = {
  STARTER: { days: 15, priceLabel: '₹5,000', afterCreditLabel: '₹35,000', featured: true, badge: 'Best value' },
  STANDARD: { days: 10, priceLabel: '₹10,000', afterCreditLabel: '₹30,000' },
};

/** Yearly plan price and its struck-through list price (12 × ₹5,000). No setup fee. */
const YEARLY_PRICE_LABEL = '₹40,000';
const YEARLY_LIST_LABEL = '₹60,000';
const MONTHLY_PRICE_LABEL = '₹5,000';

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
  const { data: access, isLoading, isError, refetch } = useBillingAccess();

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

  // The entitlement check FAILED (server unreachable/error). That is not the
  // same as "not entitled" — showing the plans screen here wrongly tells a
  // paid or allowlisted user to pay again. Show a retry instead.
  if (isError) {
    return (
      <BareChrome>
        <div className="p-8 max-w-md mx-auto text-center">
          <h1 className="font-display text-xl font-bold text-[var(--dark-brown)] mb-2">
            Cannot reach the server
          </h1>
          <p className="text-sm text-[var(--walnut)] mb-5">
            Your plan could not be verified because the PraecisAI API is not responding.
            This is a connection problem, not a billing problem.
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2.5 rounded-lg text-sm font-bold"
            style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
          >
            Try again
          </button>
        </div>
      </BareChrome>
    );
  }

  if (access?.entitled) return <DashboardShell>{children}</DashboardShell>;

  // Paid (or on trial) but the team is still provisioning the account: show the
  // "setup in progress" screen everywhere, so the customer always sees a clear
  // status instead of the plans page or a broken dashboard.
  if (access?.setup_pending) {
    return (
      <BareChrome>
        <SetupPendingScreen />
      </BareChrome>
    );
  }

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

/**
 * Shown after a successful payment while the Praecis team provisions the
 * tenant's AI agent (Bolna keys + configuration). The gate unlocks itself the
 * moment `access.provisioned` flips true, so the customer just signs in again.
 */
function SetupPendingScreen() {
  const steps = [
    { label: 'Payment received', done: true },
    { label: 'Setting up your AI recovery agent', done: false },
    { label: 'Connecting calls & WhatsApp to your account', done: false },
    { label: 'Final checks, then your dashboard opens', done: false },
  ];
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:py-16">
      <div className="glass-card p-6 sm:p-8 text-center">
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: 'linear-gradient(135deg, var(--walnut), var(--mahogany))' }}
        >
          <Rocket size={26} className="text-[var(--cream)]" />
        </div>

        <h1 className="font-display text-xl sm:text-2xl font-bold text-[var(--dark-brown)]">
          Payment received: we&rsquo;re setting up your account
        </h1>
        <p className="mt-3 text-sm sm:text-[15px] leading-relaxed text-[var(--walnut)]">
          Thank you for choosing PraecisAI. Our team is now configuring your AI recovery
          agent for your business: connecting your calling and WhatsApp, tuning the
          scripts, and getting everything ready to go live. This usually takes
          <b className="text-[var(--dark-brown)]"> 3 to 4 working days</b>.
        </p>

        <div className="mt-6 rounded-xl border p-4 text-left" style={{ borderColor: 'var(--caramel)', background: 'var(--sand)' }}>
          <ul className="space-y-2.5">
            {steps.map((s) => (
              <li key={s.label} className="flex items-start gap-2.5 text-[13px] sm:text-sm">
                {s.done ? (
                  <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0" style={{ color: '#2E7D32' }} />
                ) : (
                  <Clock3 size={17} className="mt-0.5 flex-shrink-0 text-[var(--walnut)]" />
                )}
                <span className={s.done ? 'font-medium text-[var(--dark-brown)]' : 'text-[var(--walnut)]'}>
                  {s.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 text-[13px] sm:text-sm leading-relaxed text-[var(--walnut)]">
          You don&rsquo;t need to do anything. The moment your account is ready this screen
          unlocks automatically: just sign in again and you&rsquo;ll go straight to your
          dashboard.
        </p>

        <p className="mt-4 text-xs text-[var(--walnut)]">
          Questions? WhatsApp us or email{' '}
          <a href="mailto:hello@praecisai.in" className="font-semibold text-[var(--mahogany)] hover:underline">
            hello@praecisai.in
          </a>
          .
        </p>
      </div>
    </div>
  );
}

/** Minimal chrome for locked accounts: logo bar + sign out, no sidebar. */
export function BareChrome({ children }: { children: React.ReactNode }) {
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
  badge,
  icon: Icon,
  title,
  price,
  wasPrice,
  priceSub,
  points,
  footer,
  note,
  bare,
}: {
  highlight?: boolean;
  badge?: string;
  icon: React.ElementType;
  title: string;
  price: string;
  /** Struck-through "was" price, e.g. ₹60,000 beside the ₹40,000 yearly price */
  wasPrice?: string;
  priceSub: string;
  points: string[];
  footer: React.ReactNode;
  note?: React.ReactNode;
  // `bare` drops the card chrome: used for the two halves of the combined
  // "onboarding + monthly" card so they read as one purchase.
  bare?: boolean;
}) {
  return (
    <div
      className={bare ? 'flex flex-col flex-1 min-w-0' : 'glass-card p-6 flex flex-col'}
      style={highlight ? { border: '2px solid var(--mahogany)', position: 'relative' } : {}}
    >
      {highlight && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap"
          style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
        >
          {badge ?? 'Try it first'}
        </span>
      )}
      <div className="flex items-center gap-2 mb-3">
        <Icon size={18} className="text-[var(--mahogany)] flex-shrink-0" />
        <h3 className="font-semibold text-[var(--dark-brown)]">{title}</h3>
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <p className="text-2xl font-bold text-[var(--dark-brown)]">{price}</p>
        {wasPrice && (
          <p className="text-base font-semibold line-through text-[var(--walnut)]">{wasPrice}</p>
        )}
      </div>
      <p className="text-xs text-[var(--walnut)] mb-4">{priceSub}</p>
      <ul className="space-y-2 mb-3">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-xs text-[var(--dark-brown)]">
            <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#2E7D32' }} />
            {p}
          </li>
        ))}
      </ul>
      {/* `note` sits directly under the bullets; the spacer below it takes the
          slack so only the footer is pinned to the bottom of the card. */}
      {note}
      <div className="flex-1" />
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
  // Which trial card is mid-checkout / awaiting the mock confirm, so only that
  // card shows a spinner instead of both.
  const [pendingTier, setPendingTier] = useState<TrialTier | null>(null);
  const [paying, setPaying] = useState(false);
  const [activating, setActivating] = useState(false);

  async function startTrial(tier: TrialTier) {
    setPaying(true);
    setPendingTier(tier);
    try {
      const data = await trialCheckout.mutateAsync(tier);
      const days = data?.quote?.days ?? TRIAL_TIERS[tier].days;
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
        description: `${days}-day full access trial (non-refundable)`,
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
                toast.success(`Payment verified: we're setting up your ${days}-day trial`);
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
      setPendingTier(null);
      toast.error(err.message);
    }
  }

  async function simulate() {
    const days = mockPending?.quote?.days ?? (pendingTier ? TRIAL_TIERS[pendingTier].days : 10);
    try {
      await simulateTrial.mutateAsync();
      toast.success(`Trial activated (test mode): ${days} days of full access`);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (activating) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 size={26} className="animate-spin text-[var(--mahogany)]" />
        <p className="text-sm text-[var(--walnut)]">Verifying your payment…</p>
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
            <Clock3 size={13} /> Your trial has ended. Pick a monthly or yearly plan to keep going.
          </p>
        )}
      </div>

      {/* Two trials side by side on top; the monthly and yearly plans below them. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        {/* Two paid trial tiers, side by side */}
        {(Object.keys(TRIAL_TIERS) as TrialTier[]).map((tier) => {
          const plan = TRIAL_TIERS[tier];
          const isPending = pendingTier === tier;
          return (
            <PlanCard
              key={tier}
              highlight={!trialExpired && plan.featured}
              badge={plan.badge}
              icon={Sparkles}
              title={`${plan.days}-Day Trial`}
              price={plan.priceLabel}
              priceSub={`one-time · ${plan.days} days of full access · no GST`}
              points={[...FEATURES, `Access closes automatically after ${plan.days} days`]}
              note={
                <div
                  className="text-[11px] leading-relaxed rounded-lg p-2.5 mb-4"
                  style={{ background: 'var(--sand)', color: 'var(--walnut)' }}
                >
                  Once the trial starts this {plan.priceLabel} is <b>not refundable</b>, whether or
                  not you continue. If you continue on the yearly plan, it is adjusted: you pay
                  <b> {plan.afterCreditLabel}</b> instead of {YEARLY_PRICE_LABEL} for the first year,
                  and your discount coupon still applies.
                </div>
              }
              footer={
                trialExpired ? (
                  <p className="text-xs text-center text-[var(--walnut)] py-2">Trial already used</p>
                ) : mockPending && isPending ? (
                  <button
                    onClick={simulate}
                    className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                    style={{ background: '#B8860B', color: '#fff' }}
                  >
                    <FlaskConical size={14} /> Simulate trial payment (test mode)
                  </button>
                ) : (
                  <button
                    onClick={() => startTrial(tier)}
                    disabled={paying || !!mockPending}
                    className="w-full py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
                    style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
                  >
                    {paying && isPending ? 'Opening checkout…' : `Start ${plan.days}-day trial`}
                  </button>
                )
              }
            />
          );
        })}

        {/* The two real plans, side by side under the trials. No setup fee on
            either: the first payment is just the first month or year. */}
        <PlanCard
          icon={CalendarClock}
          title="Monthly Plan"
          price={MONTHLY_PRICE_LABEL}
          priceSub="per month · ₹0 setup cost · no GST · auto-debit on the 1st (UPI Autopay or card)"
          points={[
            ...FEATURES,
            'Guided setup with the Praecis team, free',
            'Cancel anytime with the Praecis team',
          ]}
          note={
            <p className="text-xs text-[var(--walnut)] mb-4">
              Pay {MONTHLY_PRICE_LABEL} now for your first month. It then renews automatically every month.
            </p>
          }
          footer={
            <Link
              href="/dashboard/billing/onboarding?plan=MONTHLY"
              className="w-full py-2.5 rounded-lg text-sm font-bold text-center block border"
              style={{ borderColor: 'var(--mahogany)', color: 'var(--mahogany)' }}
            >
              Choose monthly
            </Link>
          }
        />
        <PlanCard
          highlight
          badge="Save ₹20,000"
          icon={Rocket}
          title="Yearly Plan"
          price={YEARLY_PRICE_LABEL}
          wasPrice={YEARLY_LIST_LABEL}
          priceSub="per year · ₹0 setup cost · no GST · works out to about ₹3,333 a month"
          points={[
            ...FEATURES,
            'Guided setup with the Praecis team, free',
            '12 months for the price of 8',
          ]}
          note={
            <p className="text-xs text-[var(--walnut)] mb-4">
              Pay {YEARLY_PRICE_LABEL} now for 12 months. It renews automatically once a year.
            </p>
          }
          footer={
            <Link
              href="/dashboard/billing/onboarding?plan=YEARLY"
              className="w-full py-2.5 rounded-lg text-sm font-bold text-center block"
              style={{ background: 'var(--dark-brown)', color: 'var(--cream)' }}
            >
              Choose yearly
            </Link>
          }
        />
      </div>

      <p className="text-[11px] text-[var(--walnut)] text-center mt-6">
        All prices are final: no GST is added and there is no setup fee. AI calls and WhatsApp
        messages are pay as you go: Bolna calling credits and AiSensy WhatsApp plans are paid
        directly to those platforms and are not part of these prices.
      </p>
    </div>
  );
}
