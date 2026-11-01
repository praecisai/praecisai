'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  PhoneCall, MessageCircle, Zap, AlertTriangle, CheckCircle2, Loader2, FlaskConical, History, Bell, RefreshCw,
} from 'lucide-react';
import {
  useCredits,
  useSetCreditThresholds,
  useCreateCreditCheckout,
  useVerifyCreditCheckout,
  useSetupAutopay,
  useUpdateAutopayPacks,
  useDisableAutopay,
  useSimulateCreditsPaid,
  formatPaise,
} from '../../lib/api/hooks';
import { loadRazorpayScript } from './razorpay';

type Kind = 'CALL' | 'WHATSAPP';

interface Pack {
  id: string;
  kind: Kind;
  tier: string | null;
  units: number;
  pricePaise: number;
  ratePaise: number;
  autopayEligible: boolean;
}

const fmtUnits = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const rate = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function fmtDateTime(d: string | Date) {
  const date = new Date(d);
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const REASON_LABEL: Record<string, string> = {
  PURCHASE: 'Bought',
  AUTOPAY: 'Autopay top-up',
  USAGE: 'Used',
  ADJUSTMENT: 'Adjusted by PraecisAI',
};

/**
 * Everything about prepaid credits on Billing & Usage: balances with alert
 * levels, buying packs (Razorpay Checkout), autopay, and the credit history.
 * Only credits are shown here, never the platform cost behind them.
 */
export function CreditsPanel() {
  const { data, isLoading, refetch, isFetching } = useCredits();
  const checkout = useCreateCreditCheckout();
  const verify = useVerifyCreditCheckout();
  const simulate = useSimulateCreditsPaid();
  const [tab, setTab] = useState<Kind>('CALL');
  const [buying, setBuying] = useState<string | null>(null);
  const [mockOrder, setMockOrder] = useState<{ order_id: string; description: string } | null>(null);

  async function openCheckout(opts: {
    order_id: string;
    razorpay_key_id: string;
    description: string;
    customer_id?: string;
    recurring?: boolean;
    onDone?: () => void;
  }) {
    const ok = await loadRazorpayScript();
    if (!ok) throw new Error('Could not load Razorpay checkout');
    const rzp = new window.Razorpay({
      key: opts.razorpay_key_id,
      order_id: opts.order_id,
      ...(opts.customer_id ? { customer_id: opts.customer_id } : {}),
      ...(opts.recurring ? { recurring: '1' } : {}),
      name: 'PraecisAI',
      description: opts.description,
      theme: { color: '#7F5539' },
      handler: (response: any) => {
        verify.mutate(
          {
            order_id: opts.order_id,
            payment_id: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          },
          {
            onSuccess: () => {
              toast.success('Payment received: credits added');
              setBuying(null);
              opts.onDone?.();
            },
            onError: (err: any) => {
              setBuying(null);
              toast.error(`Payment received but not verified yet: ${err.message}. It will show here shortly.`);
            },
          },
        );
      },
      modal: { ondismiss: () => setBuying(null) },
    });
    rzp.on('payment.failed', () => {
      setBuying(null);
      toast.error('Payment failed: nothing was charged. You can try again.');
    });
    rzp.open();
  }

  async function buy(pack: Pack) {
    setBuying(pack.id);
    try {
      const res = await checkout.mutateAsync(pack.id);
      if (res.mock) {
        setMockOrder({ order_id: res.order_id, description: res.description });
        setBuying(null);
        return;
      }
      await openCheckout(res);
    } catch (err: any) {
      setBuying(null);
      toast.error(err.message);
    }
  }

  function settleMock() {
    if (!mockOrder) return;
    simulate.mutate(mockOrder.order_id, {
      onSuccess: () => {
        toast.success(`Test payment simulated: ${mockOrder.description} added`);
        setMockOrder(null);
      },
      onError: (e: any) => toast.error(e.message),
    });
  }

  if (isLoading || !data) {
    return (
      <div className="glass-card p-6 flex items-center gap-2 text-sm text-[var(--walnut)]">
        <Loader2 size={15} className="animate-spin" /> Loading credits…
      </div>
    );
  }

  const packs: Pack[] = tab === 'CALL' ? data.packs.call : data.packs.whatsapp;
  const planName = `Plan ${data.model.tier ?? 'A'}`;
  const bestRate = Math.min(...packs.map((p) => p.ratePaise));
  const firstRate = packs[0]?.ratePaise ?? 0;

  return (
    <div className="space-y-5">
      {!data.credit_billing && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl border text-sm"
          style={{ background: '#7F553912', borderColor: '#7F553940', color: 'var(--dark-brown)' }}
        >
          <Bell size={16} className="flex-shrink-0 mt-0.5 text-[var(--mahogany)]" />
          <p>
            Your account is on direct billing, so calls and messages are not taken from credits yet. Credits you buy
            are kept safe and start being used once the PraecisAI team moves your account to credits.
          </p>
        </div>
      )}

      {/* ── Balances ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BalanceCard
          kind="CALL"
          icon={PhoneCall}
          title="Call credits"
          unit="minutes"
          balance={data.call.balance}
          threshold={data.call.threshold}
          low={data.credit_billing && data.call.low}
          usedThisMonth={data.call.used_this_month}
          footnote={`1 credit = 1 minute of calling · ${planName} · unanswered calls are free`}
        />
        <BalanceCard
          kind="WHATSAPP"
          icon={MessageCircle}
          title="WhatsApp credits"
          unit="messages"
          balance={data.whatsapp.balance}
          threshold={data.whatsapp.threshold}
          low={data.credit_billing && data.whatsapp.low}
          usedThisMonth={data.whatsapp.used_this_month}
          footnote="1 credit = 1 WhatsApp message sent · failed messages are free"
        />
      </div>

      {/* ── Buy credits ── */}
      <div className="glass-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-[var(--mahogany)]" />
            <h2 className="font-semibold text-[var(--dark-brown)]">Buy credits</h2>
          </div>
          <div className="inline-flex rounded-lg p-1" style={{ background: 'var(--sand)' }}>
            {(['CALL', 'WHATSAPP'] as Kind[]).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                style={tab === k ? { background: 'var(--mahogany)', color: 'var(--cream)' } : { color: 'var(--walnut)' }}
              >
                {k === 'CALL' ? 'Call minutes' : 'WhatsApp messages'}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-[var(--walnut)] mb-4">
          {tab === 'CALL'
            ? `${planName} rates. Bigger packs, better rates.`
            : 'The more messages you buy, the less each message costs.'}{' '}
          Credits never expire. No GST is added.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {packs.map((p) => {
            const saving = firstRate > 0 ? Math.round((1 - p.ratePaise / firstRate) * 100) : 0;
            return (
              <div
                key={p.id}
                className="relative rounded-xl border p-4 flex flex-col"
                style={{
                  background: 'var(--surface-warm)',
                  borderColor: p.ratePaise === bestRate ? 'var(--mahogany)' : 'var(--caramel)',
                }}
              >
                {p.ratePaise === bestRate && (
                  <span
                    className="absolute -top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                    style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
                  >
                    Best rate
                  </span>
                )}
                <p className="text-2xl font-bold text-[var(--dark-brown)] leading-none">{fmtUnits(p.units)}</p>
                <p className="text-xs text-[var(--walnut)] mt-1">
                  {tab === 'CALL' ? 'call credits (minutes)' : 'WhatsApp credits (messages)'}
                </p>
                <p className="text-sm font-semibold text-[var(--mahogany)] mt-3">
                  {rate(p.ratePaise)} per {tab === 'CALL' ? 'minute' : 'message'}
                </p>
                <p className="text-[11px] text-[var(--walnut)] mt-0.5 min-h-[16px]">
                  {saving > 0 ? `${saving}% cheaper per credit` : 'Starter pack'}
                </p>
                <div className="flex-1" />
                <button
                  onClick={() => buy(p)}
                  disabled={!!buying || !!mockOrder}
                  className="mt-4 w-full py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
                >
                  {buying === p.id ? <Loader2 size={14} className="animate-spin" /> : null}
                  Buy for {formatPaise(p.pricePaise)}
                </button>
              </div>
            );
          })}
        </div>

        {mockOrder && (
          <div className="mt-4 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between" style={{ background: '#B8860B14' }}>
            <p className="text-xs text-[var(--dark-brown)] flex items-center gap-2">
              <FlaskConical size={14} style={{ color: '#B8860B' }} /> Razorpay test mode: no real checkout. Simulate the payment for {mockOrder.description}.
            </p>
            <div className="flex gap-2">
              <button onClick={settleMock} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: '#B8860B', color: '#fff' }}>
                Simulate payment
              </button>
              <button onClick={() => setMockOrder(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border text-[var(--walnut)]" style={{ borderColor: 'var(--caramel)' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Autopay ── */}
      <AutopayCard data={data} openCheckout={openCheckout} />

      {/* ── Credit history ── */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <History size={18} className="text-[var(--mahogany)]" />
            <h2 className="font-semibold text-[var(--dark-brown)]">Credit history</h2>
          </div>
          <button
            onClick={() => refetch()}
            className="text-xs font-medium text-[var(--mahogany)] flex items-center gap-1"
            title="Refresh balances and pending payments"
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        {data.transactions.length ? (
          <div className="overflow-x-auto">
            <table className="data-table w-full min-w-[620px]">
              <thead>
                <tr>
                  <th className="text-left">When</th>
                  <th className="text-left">Credits</th>
                  <th className="text-left">What</th>
                  <th className="text-right">Change</th>
                  <th className="text-right">Balance after</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t: any) => (
                  <tr key={t.id}>
                    <td className="text-xs text-[var(--walnut)]">{fmtDateTime(t.created_at)}</td>
                    <td className="text-xs text-[var(--walnut)]">{t.kind === 'CALL' ? 'Call minutes' : 'WhatsApp'}</td>
                    <td className="text-sm text-[var(--dark-brown)]">
                      {REASON_LABEL[t.reason] ?? t.reason}
                      {t.note ? <span className="text-xs text-[var(--walnut)]"> · {t.note}</span> : null}
                    </td>
                    <td className="text-right text-sm font-semibold" style={{ color: t.delta >= 0 ? '#2E7D32' : 'var(--dark-brown)' }}>
                      {t.delta >= 0 ? '+' : ''}
                      {fmtUnits(t.delta)}
                    </td>
                    <td className="text-right text-xs text-[var(--walnut)]">{fmtUnits(t.balance_after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--walnut)]">No credit activity yet.</p>
        )}
      </div>
    </div>
  );
}

function BalanceCard({
  kind, icon: Icon, title, unit, balance, threshold, low, usedThisMonth, footnote,
}: {
  kind: Kind;
  icon: React.ElementType;
  title: string;
  unit: string;
  balance: number;
  threshold: number;
  low: boolean;
  usedThisMonth: number;
  footnote: string;
}) {
  const save = useSetCreditThresholds();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(threshold));
  useEffect(() => setValue(String(threshold)), [threshold]); // eslint-disable-line react-hooks/set-state-in-effect

  function submit() {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      toast.error('Enter 0 or more');
      return;
    }
    save.mutate(kind === 'CALL' ? { call: n } : { whatsapp: n }, {
      onSuccess: () => {
        toast.success('Alert level saved');
        setEditing(false);
      },
      onError: (e: any) => toast.error(e.message),
    });
  }

  return (
    <div
      className="glass-card p-5"
      style={low ? { border: '1px solid #E6510060' } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-[var(--dark-brown)] flex items-center gap-2">
          <Icon size={16} className="text-[var(--mahogany)]" /> {title}
        </p>
        {low ? (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: '#E6510018', color: '#E65100' }}>
            <AlertTriangle size={12} /> Running low
          </span>
        ) : (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: '#2E7D3218', color: '#2E7D32' }}>
            <CheckCircle2 size={12} /> Healthy
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-bold text-[var(--dark-brown)]">
        {fmtUnits(Math.max(0, balance))}
        <span className="text-sm font-normal text-[var(--walnut)]"> {unit} left</span>
      </p>
      <p className="text-xs text-[var(--walnut)] mt-1">{fmtUnits(usedThisMonth)} used this month</p>

      <div className="mt-3 pt-3 border-t flex flex-wrap items-center gap-2 text-xs" style={{ borderColor: 'rgba(221,184,146,0.4)' }}>
        <Bell size={12} className="text-[var(--walnut)]" />
        {editing ? (
          <>
            <span className="text-[var(--walnut)]">Warn me below</span>
            <input
              type="number"
              min={0}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-24 px-2 py-1 rounded-md border bg-transparent text-[var(--dark-brown)]"
              style={{ borderColor: 'var(--caramel)' }}
            />
            <span className="text-[var(--walnut)]">{unit}</span>
            <button onClick={submit} disabled={save.isPending} className="font-semibold text-[var(--mahogany)]">
              {save.isPending ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="text-[var(--walnut)]">
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="text-[var(--walnut)]">
              Warning shows below {fmtUnits(threshold)} {unit}
            </span>
            <button onClick={() => setEditing(true)} className="font-semibold text-[var(--mahogany)]">
              Change
            </button>
          </>
        )}
      </div>
      <p className="text-[11px] text-[var(--walnut)] mt-2">{footnote}</p>
    </div>
  );
}

function AutopayCard({
  data,
  openCheckout,
}: {
  data: any;
  openCheckout: (opts: any) => Promise<void>;
}) {
  const setup = useSetupAutopay();
  const updatePacks = useUpdateAutopayPacks();
  const disable = useDisableAutopay();
  const simulate = useSimulateCreditsPaid();
  const ap = data.autopay;
  const callOptions: Pack[] = data.packs.call.filter((p: Pack) => p.autopayEligible);
  const waOptions: Pack[] = data.packs.whatsapp.filter((p: Pack) => p.autopayEligible);

  // The saved call pack may be for another model: match it by minutes
  const savedCallMinutes = ap.call_pack ? Number(String(ap.call_pack).split('_').pop()) : null;
  const savedCallId = callOptions.find((p) => p.units === savedCallMinutes)?.id ?? '';

  const [callPack, setCallPack] = useState<string>(savedCallId || callOptions[1]?.id || callOptions[0]?.id || '');
  const [waPack, setWaPack] = useState<string>(ap.whatsapp_pack || waOptions[1]?.id || '');
  const [method, setMethod] = useState<'upi' | 'card'>('upi');
  const [busy, setBusy] = useState(false);
  const [mockOrder, setMockOrder] = useState<string | null>(null);

  const active = ap.enabled && ap.status === 'ACTIVE';
  const pending = ap.status === 'PENDING';
  const firstPrice = (callOptions.find((p) => p.id === callPack) ?? waOptions.find((p) => p.id === waPack))?.pricePaise;

  async function turnOn() {
    if (!callPack && !waPack) {
      toast.error('Pick a call pack, a WhatsApp pack, or both');
      return;
    }
    setBusy(true);
    try {
      const res = await setup.mutateAsync({ call_pack: callPack || null, whatsapp_pack: waPack || null, method });
      if (res.mock) {
        setMockOrder(res.order_id);
        setBusy(false);
        return;
      }
      await openCheckout({ ...res, recurring: true, onDone: () => setBusy(false) });
      setBusy(false);
    } catch (err: any) {
      setBusy(false);
      toast.error(err.message);
    }
  }

  const label = (packs: Pack[], id: string | null, unit: string) => {
    const p = packs.find((x) => x.id === id);
    return p ? `${p.units.toLocaleString('en-IN')} ${unit} for ${formatPaise(p.pricePaise)}` : 'Off';
  };

  return (
    <div className="glass-card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <RefreshCw size={18} className="text-[var(--mahogany)]" />
          <h2 className="font-semibold text-[var(--dark-brown)]">Autopay</h2>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={
              active
                ? { background: '#2E7D3218', color: '#2E7D32' }
                : pending
                  ? { background: '#B8860B18', color: '#B8860B' }
                  : { background: 'var(--sand)', color: 'var(--walnut)' }
            }
          >
            {active ? 'On' : pending ? 'Waiting for bank approval' : 'Off'}
          </span>
        </div>
      </div>
      <p className="text-xs text-[var(--walnut)] mb-4">
        Never run out mid-campaign. When credits drop below your warning level, we top up automatically with the pack
        you choose, using UPI Autopay or your card. Up to ₹15,000 per top-up; you can turn it off any time.
      </p>

      {ap.last_error && (
        <div className="mb-4 flex items-start gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: '#C6282812', color: '#C62828' }}>
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> Last autopay problem: {ap.last_error}
        </div>
      )}

      {active ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <PackSelect
              label="Call minutes top-up"
              value={savedCallId}
              options={callOptions}
              unit="minutes"
              onChange={(v) => updatePacks.mutate({ call_pack: v || null }, { onSuccess: () => toast.success('Autopay updated'), onError: (e: any) => toast.error(e.message) })}
            />
            <PackSelect
              label="WhatsApp messages top-up"
              value={ap.whatsapp_pack ?? ''}
              options={waOptions}
              unit="messages"
              onChange={(v) => updatePacks.mutate({ whatsapp_pack: v || null }, { onSuccess: () => toast.success('Autopay updated'), onError: (e: any) => toast.error(e.message) })}
            />
          </div>
          <p className="text-xs text-[var(--walnut)]">
            Paying by {String(ap.method ?? 'UPI').toUpperCase()}
            {ap.last_charge_at ? ` · last top-up ${fmtDateTime(ap.last_charge_at)}` : ''}
            {ap.pending?.length ? ` · ${ap.pending.length} top-up in progress (UPI debits arrive after your bank's 24-hour notice)` : ''}
          </p>
          <button
            onClick={() => disable.mutate(undefined, { onSuccess: () => toast.success('Autopay turned off'), onError: (e: any) => toast.error(e.message) })}
            disabled={disable.isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border text-[#C62828]"
            style={{ borderColor: '#C6282840' }}
          >
            {disable.isPending ? 'Turning off…' : 'Turn off autopay'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {pending && !mockOrder && (
            <p className="text-xs text-[var(--walnut)]">
              Your first payment is done. Your bank is confirming the mandate, which usually takes a few minutes for UPI.
              {' '}Call packs set: {label(callOptions, savedCallId, 'minutes')} · WhatsApp: {label(waOptions, ap.whatsapp_pack, 'messages')}.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <PackSelect label="Call minutes top-up" value={callPack} options={callOptions} unit="minutes" onChange={setCallPack} />
            <PackSelect label="WhatsApp messages top-up" value={waPack} options={waOptions} unit="messages" onChange={setWaPack} />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--walnut)] mb-1.5">Pay with</p>
              <div className="inline-flex rounded-lg p-1 w-full" style={{ background: 'var(--sand)' }}>
                {(['upi', 'card'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className="flex-1 px-3 py-1.5 rounded-md text-xs font-semibold"
                    style={method === m ? { background: 'var(--mahogany)', color: 'var(--cream)' } : { color: 'var(--walnut)' }}
                  >
                    {m === 'upi' ? 'UPI Autopay' : 'Card'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {mockOrder ? (
            <div className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between" style={{ background: '#B8860B14' }}>
              <p className="text-xs text-[var(--dark-brown)] flex items-center gap-2">
                <FlaskConical size={14} style={{ color: '#B8860B' }} /> Razorpay test mode: simulate the first autopay payment.
              </p>
              <button
                onClick={() =>
                  simulate.mutate(mockOrder, {
                    onSuccess: () => {
                      toast.success('Autopay switched on (test mode)');
                      setMockOrder(null);
                    },
                    onError: (e: any) => toast.error(e.message),
                  })
                }
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: '#B8860B', color: '#fff' }}
              >
                Simulate payment
              </button>
            </div>
          ) : (
            <button
              onClick={turnOn}
              disabled={busy}
              className="px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"
              style={{ background: 'var(--dark-brown)', color: 'var(--cream)' }}
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              Turn on autopay{firstPrice ? ` · pay ${formatPaise(firstPrice)} now` : ''}
            </button>
          )}
          <p className="text-[11px] text-[var(--walnut)]">
            Turning it on buys your {callPack ? 'call' : 'WhatsApp'} pack now and approves future top-ups in the same step.
            Bigger packs (over ₹15,000) can be bought manually above.
          </p>
        </div>
      )}
    </div>
  );
}

function PackSelect({
  label, value, options, unit, onChange,
}: {
  label: string;
  value: string;
  options: Pack[];
  unit: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--walnut)] mb-1.5">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border text-sm bg-[var(--surface-warm)] text-[var(--dark-brown)]"
        style={{ borderColor: 'var(--caramel)' }}
      >
        <option value="">Off</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.units.toLocaleString('en-IN')} {unit} for {formatPaise(p.pricePaise)}
          </option>
        ))}
      </select>
    </div>
  );
}
