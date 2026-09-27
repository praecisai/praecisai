'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import { useMe, useUpdateBusiness } from '../../lib/api/hooks';

/**
 * Escalation-only daily call limit. Off (null) keeps today's behaviour: an
 * Escalation party is rung once per selected schedule slot. On, the backend
 * enforces the count, the gap, the 8 AM to 7 PM window and "stop once they have
 * spoken today", and the hourly run adds the extra attempts between slots.
 * Bounds mirror backend/src/common/utils/escalation-cadence.util.ts.
 */

const COUNTS = [1, 2, 3];
const GAPS = [2, 3, 4, 5, 6];
// Capped Escalation dials may START between 8 AM and 6 PM, so they end before 7 PM.
const WINDOW_START = 8;
const WINDOW_LAST = 18;

const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;

/** Hours a party who never picks up would be rung, given the slots, count and gap. */
function projectDay(slots: number[], count: number, gap: number): number[] {
  const out: number[] = [];
  for (let h = WINDOW_START; h <= WINDOW_LAST && out.length < count; h++) {
    if (out.length === 0) {
      if (slots.includes(h)) out.push(h);
    } else if (h - out[out.length - 1] >= gap) {
      out.push(h);
    }
  }
  return out;
}

export function EscalationCallLimit() {
  const { data: user, isLoading } = useMe();
  const update = useUpdateBusiness();
  const b = user?.business as any;

  const [enabled, setEnabled] = useState(false);
  const [count, setCount] = useState(1);
  const [gap, setGap] = useState(3);
  const [ack, setAck] = useState(false);

  useEffect(() => {
    if (!b) return;
    const saved = typeof b.escalation_calls_per_day === 'number' ? b.escalation_calls_per_day : null;
    setEnabled(saved !== null);
    setCount(saved ?? 1);
    setGap(typeof b.escalation_call_gap_hours === 'number' ? b.escalation_call_gap_hours : 3);
    // Already saved at 3 means the owner confirmed once before
    setAck(saved === 3);
  }, [b?.escalation_calls_per_day, b?.escalation_call_gap_hours]); // eslint-disable-line

  const slots: number[] = Array.isArray(b?.auto_call_hours) ? b.auto_call_hours : [12, 16];
  const slotsInWindow = slots.filter((h) => h >= WINDOW_START && h <= WINDOW_LAST);
  const projected = projectDay(slotsInWindow, count, gap);
  const needsAck = enabled && count === 3;
  const valid = !needsAck || ack;

  const save = async () => {
    if (!valid) return;
    try {
      await update.mutateAsync({
        escalation_calls_per_day: enabled ? count : null,
        escalation_call_gap_hours: gap,
      });
      toast.success('Escalation call limit saved', {
        description: enabled
          ? `Escalation parties get at most ${count} call${count !== 1 ? 's' : ''} a day, ${gap}h apart.`
          : 'Escalation parties follow the normal schedule again.',
      });
    } catch (e: any) {
      toast.error('Could not save the Escalation limit', { description: e.message });
    }
  };

  if (isLoading) {
    return <div className="glass-card p-6 text-sm text-[var(--walnut)]">Loading…</div>;
  }

  return (
    <div className="glass-card p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-44 flex-1">
          <h3 className="font-semibold text-[var(--dark-brown)] flex items-center gap-2">
            <ShieldAlert size={15} className="text-[#C62828]" /> Escalation Call Limit
          </h3>
          <p className="text-xs text-[var(--walnut)] mt-1">
            Only for parties in the <b>Escalation</b> segment. Sets how many automatic calls one party can get in a
            day and how far apart. Other segments and VIPs are not affected.
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none" style={{ color: 'var(--dark-brown)' }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enabled
        </label>
      </div>

      {!enabled ? (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(74,124,89,0.08)', color: 'var(--walnut)' }}>
          Off: Escalation parties are called once at every time slot selected above
          ({slots.length} a day). Turn this on to set a daily count and a gap between calls.
        </p>
      ) : (
        <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--caramel)', background: 'var(--surface-warm)' }}>
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--walnut)] mb-2">Calls per party per day</p>
            <div className="flex flex-wrap gap-1.5">
              {COUNTS.map((c) => {
                const on = count === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCount(c)}
                    className="rounded-full px-4 py-1.5 text-xs font-medium border transition-colors"
                    style={
                      on
                        ? { background: c === 3 ? '#C62828' : 'var(--mahogany)', color: 'var(--cream)', borderColor: c === 3 ? '#C62828' : 'var(--mahogany)' }
                        : { background: 'transparent', color: 'var(--walnut)', borderColor: 'rgba(176,137,104,0.4)' }
                    }
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[var(--walnut)] mt-1.5">Maximum is 3. Recommended: 1 or 2.</p>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--walnut)] mb-2">Minimum gap between calls</p>
            <div className="flex flex-wrap gap-1.5">
              {GAPS.map((g) => {
                const on = gap === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGap(g)}
                    className="rounded-full px-3 py-1.5 text-xs font-medium border transition-colors"
                    style={
                      on
                        ? { background: 'var(--mahogany)', color: 'var(--cream)', borderColor: 'var(--mahogany)' }
                        : { background: 'transparent', color: 'var(--walnut)', borderColor: 'rgba(176,137,104,0.4)' }
                    }
                  >
                    {g} hours
                  </button>
                );
              })}
            </div>
          </div>

          {/* What a party who never picks up would actually receive */}
          <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--sand)', color: 'var(--dark-brown)' }}>
            {slotsInWindow.length === 0 ? (
              <>No time slot above falls between 8 AM and 6 PM, so Escalation parties will not be called automatically.</>
            ) : (
              <>
                A party who does not pick up is called at about{' '}
                <b>{projected.map(hourLabel).join(' · ')}</b>.
                {projected.length < count && (
                  <> Only {projected.length} call{projected.length !== 1 ? 's' : ''} fit before 7 PM with this gap and your first slot.</>
                )}
              </>
            )}
          </div>

          <ul className="text-[11px] text-[var(--walnut)] space-y-1 list-disc pl-4">
            <li>Calls only go out between 8 AM and 7 PM, whatever slots are selected above.</li>
            <li>Once the party speaks to the agent, no more automatic calls that day.</li>
            <li>A callback the party asked for replaces the extra calls.</li>
            <li>Calling their alternate numbers after a missed call counts as the same call.</li>
            <li>Calls you place by hand from the dashboard are not blocked, but they count toward the day.</li>
          </ul>

          {count >= 2 && (
            <div
              className="flex gap-2.5 p-3 rounded-lg border text-xs"
              style={{ background: 'rgba(230,81,0,0.07)', borderColor: 'rgba(230,81,0,0.35)', color: 'var(--dark-brown)' }}
            >
              <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: '#E65100' }} />
              <div className="space-y-1.5">
                <p className="font-semibold">Use with caution</p>
                <p>
                  Calling the same person several times a day can be treated as harassment under RBI&apos;s fair
                  recovery guidelines, and parties often report or block numbers that ring repeatedly. That can get
                  your calling number marked as spam or blocked by the telecom operator, which stops calls to
                  every customer, not just this one.
                </p>
                {count === 3 && (
                  <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                    <input type="checkbox" className="mt-0.5" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                    <span>I understand the risk and want up to 3 calls a day for Escalation parties.</span>
                  </label>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={save}
        disabled={update.isPending || !valid}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--cream)] disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, var(--walnut), var(--mahogany))' }}
      >
        {update.isPending && <Loader2 size={14} className="animate-spin" />}
        {update.isPending ? 'Saving…' : 'Save Escalation Limit'}
      </button>
    </div>
  );
}
