'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Coins, PhoneCall, MessageCircle, Loader2 } from 'lucide-react';
import { useAdminAdjustCredits } from '../../lib/api/hooks';

const QUICK = [10, 100, 500, 1000];

/**
 * Admin tenant page: give (or take back) call minutes and WhatsApp messages
 * in one go, e.g. an opening balance, goodwill, or a payment taken offline.
 * Each kind is its own ledger entry (reason ADJUSTMENT) with the note, which
 * the customer sees in their credit history.
 */
export function AddCreditsCard({ tenant }: { tenant: any }) {
  const adjust = useAdminAdjustCredits(tenant.id);
  const credits = tenant.credits ?? {};
  const [call, setCall] = useState('');
  const [wa, setWa] = useState('');
  const [note, setNote] = useState('');

  const callDelta = Number(call) || 0;
  const waDelta = Number(wa) || 0;
  const callAfter = Math.round(((credits.call ?? 0) + callDelta) * 100) / 100;
  const waAfter = Math.round(((credits.whatsapp ?? 0) + waDelta) * 100) / 100;
  const invalid =
    !Number.isFinite(Number(call || 0)) ||
    !Number.isFinite(Number(wa || 0)) ||
    callAfter < 0 ||
    waAfter < 0 ||
    Math.abs(callDelta) > 100000 ||
    Math.abs(waDelta) > 100000;
  const nothing = callDelta === 0 && waDelta === 0;

  async function apply() {
    if (nothing || invalid) return;
    const text = note.trim() || 'Added by PraecisAI';
    const done: string[] = [];
    try {
      if (callDelta !== 0) {
        await adjust.mutateAsync({ kind: 'CALL', delta: callDelta, note: text });
        done.push(`${callDelta > 0 ? '+' : ''}${callDelta} call minutes`);
      }
      if (waDelta !== 0) {
        await adjust.mutateAsync({ kind: 'WHATSAPP', delta: waDelta, note: text });
        done.push(`${waDelta > 0 ? '+' : ''}${waDelta} WhatsApp messages`);
      }
      toast.success(`Credits updated: ${done.join(' · ')}`);
      setCall('');
      setWa('');
      setNote('');
    } catch (e: any) {
      // The call minutes may already have gone through when WhatsApp fails
      toast.error(`${done.length ? `Saved ${done.join(' · ')}, but ` : ''}${e.message}`);
      if (done.length) setCall('');
    }
  }

  return (
    <div className="glass-card p-5">
      <h2 className="text-sm font-semibold text-[var(--dark-brown)] mb-1 flex items-center gap-2">
        <Coins size={15} className="text-[var(--mahogany)]" /> Add credits
      </h2>
      <p className="text-[11px] text-[var(--walnut)] mb-3">
        Free from PraecisAI: nothing is charged. Use a minus to take credits back.
      </p>

      <CreditRow
        icon={PhoneCall}
        label="Call minutes"
        balance={credits.call ?? 0}
        after={callAfter}
        value={call}
        onChange={setCall}
      />
      <CreditRow
        icon={MessageCircle}
        label="WhatsApp messages"
        balance={credits.whatsapp ?? 0}
        after={waAfter}
        value={wa}
        onChange={setWa}
      />

      <label className="block text-[11px] font-semibold text-[var(--walnut)] uppercase tracking-wider mb-1 mt-3">
        Note (customer sees it)
      </label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Added by PraecisAI"
        className="w-full px-3 py-2 rounded-lg text-sm border bg-[var(--surface-warm)] text-[var(--dark-brown)]"
        style={{ borderColor: 'var(--caramel)' }}
      />

      {invalid && (
        <p className="text-[11px] mt-2" style={{ color: '#C62828' }}>
          A balance can&apos;t go below 0, and at most 1,00,000 credits can change at a time.
        </p>
      )}
      {!tenant.credit_billing && (
        <p className="text-[11px] mt-2 text-[var(--walnut)]">
          Prepaid credits are off for this business, so these are kept but not used until you switch credits on.
        </p>
      )}

      <button
        onClick={apply}
        disabled={nothing || invalid || adjust.isPending}
        className="mt-3 w-full py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
      >
        {adjust.isPending && <Loader2 size={14} className="animate-spin" />}
        {nothing ? 'Enter an amount' : 'Update credits'}
      </button>
    </div>
  );
}

function CreditRow({
  icon: Icon,
  label,
  balance,
  after,
  value,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  balance: number;
  after: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const delta = Number(value) || 0;
  return (
    <div className="py-2.5 border-t first:border-t-0" style={{ borderColor: 'rgba(221,184,146,0.4)' }}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-xs font-semibold text-[var(--dark-brown)] flex items-center gap-1.5">
          <Icon size={13} className="text-[var(--mahogany)]" /> {label}
        </p>
        <p className="text-[11px] text-[var(--walnut)]">
          {balance.toLocaleString('en-IN')}
          {delta !== 0 && (
            <>
              {' '}→ <span className="font-semibold text-[var(--dark-brown)]">{after.toLocaleString('en-IN')}</span>
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-24 px-2.5 py-1.5 rounded-lg text-sm border bg-[var(--surface-warm)] text-[var(--dark-brown)]"
          style={{ borderColor: 'var(--caramel)' }}
        />
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onChange(String(delta + q))}
            className="px-2 py-1.5 rounded-md text-[11px] font-semibold border text-[var(--mahogany)]"
            style={{ borderColor: 'var(--caramel)' }}
          >
            +{q.toLocaleString('en-IN')}
          </button>
        ))}
      </div>
    </div>
  );
}
