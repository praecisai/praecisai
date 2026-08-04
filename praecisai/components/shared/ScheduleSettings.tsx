'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PhoneCall, MessageSquare, Loader2 } from 'lucide-react';
import { useMe, useUpdateBusiness } from '../../lib/api/hooks';

/**
 * When the unattended runs fire, per business: which hours (preset slots) and
 * which weekdays. The on/off master switches live as header toggles; this only
 * sets the timing. The backend schedulers run hourly and act on a business only
 * when the current IST hour + weekday match what is saved here.
 */

// Selectable slots, matching the scheduler window (08:00–20:00 IST).
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;

// Mon-first for readability; values are JS weekdays (0=Sun … 6=Sat).
const WEEKDAYS = [
  { v: 1, label: 'Mon' }, { v: 2, label: 'Tue' }, { v: 3, label: 'Wed' },
  { v: 4, label: 'Thu' }, { v: 5, label: 'Fri' }, { v: 6, label: 'Sat' }, { v: 0, label: 'Sun' },
];

const arr = (v: unknown, fallback: number[]) =>
  Array.isArray(v) && v.every((x) => typeof x === 'number') ? (v as number[]) : fallback;

function Chips({
  options, selected, onToggle, label,
}: {
  options: { v: number; label: string }[];
  selected: number[];
  onToggle: (v: number) => void;
  label: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--walnut)] mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = selected.includes(o.v);
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => onToggle(o.v)}
              className="rounded-full px-3 py-1.5 text-xs font-medium border transition-colors"
              style={
                on
                  ? { background: 'var(--mahogany)', color: 'var(--cream)', borderColor: 'var(--mahogany)' }
                  : { background: 'transparent', color: 'var(--walnut)', borderColor: 'rgba(176,137,104,0.4)' }
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ScheduleSettings() {
  const { data: user, isLoading } = useMe();
  const update = useUpdateBusiness();
  const b = user?.business as any;

  const [callHours, setCallHours] = useState<number[]>([12, 16]);
  const [callDays, setCallDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [waHours, setWaHours] = useState<number[]>([10]);
  const [waDays, setWaDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  useEffect(() => {
    if (!b) return;
    setCallHours(arr(b.auto_call_hours, [12, 16]));
    setCallDays(arr(b.auto_call_weekdays, [0, 1, 2, 3, 4, 5, 6]));
    setWaHours(arr(b.auto_whatsapp_hours, [10]));
    setWaDays(arr(b.auto_whatsapp_weekdays, [0, 1, 2, 3, 4, 5, 6]));
  }, [b?.auto_call_hours, b?.auto_call_weekdays, b?.auto_whatsapp_hours, b?.auto_whatsapp_weekdays]); // eslint-disable-line

  const toggle = (list: number[], set: (v: number[]) => void, v: number) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v].sort((a, z) => a - z));

  const valid = callHours.length > 0 && callDays.length > 0 && waHours.length > 0 && waDays.length > 0;

  const save = async () => {
    if (!valid) return;
    try {
      await update.mutateAsync({
        auto_call_hours: callHours,
        auto_call_weekdays: callDays,
        auto_whatsapp_hours: waHours,
        auto_whatsapp_weekdays: waDays,
      });
      toast.success('Schedule saved', { description: 'Automatic runs will follow the new times and days.' });
    } catch (e: any) {
      toast.error('Could not save the schedule', { description: e.message });
    }
  };

  if (isLoading) {
    return <div className="glass-card p-6 text-sm text-[var(--walnut)]">Loading…</div>;
  }

  return (
    <div className="glass-card p-4 sm:p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-[var(--dark-brown)]">Automatic Run Schedule</h3>
        <p className="text-xs text-[var(--walnut)] mt-1">
          When the automatic calls and WhatsApp go out, once you turn the toggles on (top-right).
          Times are IST. Pick one or more slots and the weekdays each should run.
        </p>
      </div>

      {/* Calls */}
      <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--caramel)', background: 'var(--surface-warm)' }}>
        <div className="flex items-center gap-2">
          <PhoneCall size={15} className="text-[var(--mahogany)]" />
          <h4 className="text-sm font-semibold text-[var(--dark-brown)]">Automatic AI calls</h4>
        </div>
        <Chips label="Run at" options={HOURS.map((h) => ({ v: h, label: hourLabel(h) }))} selected={callHours} onToggle={(v) => toggle(callHours, setCallHours, v)} />
        <Chips label="On days" options={WEEKDAYS} selected={callDays} onToggle={(v) => toggle(callDays, setCallDays, v)} />
      </div>

      {/* WhatsApp */}
      <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: 'var(--caramel)', background: 'var(--surface-warm)' }}>
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-[var(--mahogany)]" />
          <h4 className="text-sm font-semibold text-[var(--dark-brown)]">Automatic WhatsApp statements</h4>
        </div>
        <Chips label="Run at" options={HOURS.map((h) => ({ v: h, label: hourLabel(h) }))} selected={waHours} onToggle={(v) => toggle(waHours, setWaHours, v)} />
        <Chips label="On days" options={WEEKDAYS} selected={waDays} onToggle={(v) => toggle(waDays, setWaDays, v)} />
        <p className="text-[11px] text-[var(--walnut)]">
          The per-segment cadence still applies (Soft Reminder every 15 days, others every 7), so a party
          is never messaged more often than that even if it runs daily.
        </p>
      </div>

      {!valid && (
        <p className="text-xs" style={{ color: '#C62828' }}>Pick at least one time slot and one weekday for each.</p>
      )}

      <button
        onClick={save}
        disabled={update.isPending || !valid}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--cream)] disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, var(--walnut), var(--mahogany))' }}
      >
        {update.isPending && <Loader2 size={14} className="animate-spin" />}
        {update.isPending ? 'Saving…' : 'Save Schedule'}
      </button>
    </div>
  );
}
