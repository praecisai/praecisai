'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, RotateCcw, PhoneCall, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useMe } from '../../lib/api/hooks';
import type { SegmentRule } from '../../types';

// Per-customer segment schedule editor: same shape as the business-level
// Segment Rules in Settings, but saved onto the customer. There are two
// independent schedules — one for AI calls (custom_schedule) and one for
// WhatsApp (whatsapp_custom_schedule) — so a customer can, say, be past the
// call cut-off but still receive WhatsApp reminders, or vice versa. Day ranges
// decide when the customer moves Soft Reminder → Follow-up → Strong Follow-up →
// Escalation, overriding the business defaults for that channel.

const SEGMENT_META = [
  { segment: 'No Follow-up', color: '#6B7280', desc: 'No calls or messages at all in this range' },
  { segment: 'Soft Reminder', color: 'var(--recovery-green, #4A7C59)', desc: 'Gentle first reminder: no pressure' },
  { segment: 'Follow-up', color: '#B8860B', desc: 'Friendly follow-up asking for a rough date' },
  { segment: 'Strong Follow-up', color: '#E65100', desc: 'Firm but respectful: accounts team update' },
  { segment: 'Escalation', color: '#C62828', desc: 'Senior team involved: humble but urgent' },
];

// Upper bounds of [No Follow-up, Soft Reminder, Follow-up, Strong Follow-up]
const DEFAULT_BOUNDS = [0, 60, 120, 180];

function boundsFromRules(rules: SegmentRule[] | null | undefined): number[] {
  if (!Array.isArray(rules)) return DEFAULT_BOUNDS;
  const sorted = [...rules].sort((a, b) => a.min_days - b.min_days);
  if (sorted.length === 5) {
    const bounds = [sorted[0]?.max_days, sorted[1]?.max_days, sorted[2]?.max_days, sorted[3]?.max_days];
    if (bounds.every((b) => typeof b === 'number')) return bounds as number[];
  }
  // Legacy 4-rule schedule (saved before No Follow-up existed): its range is 0
  if (sorted.length === 4) {
    const bounds = [sorted[0]?.max_days, sorted[1]?.max_days, sorted[2]?.max_days];
    if (bounds.every((b) => typeof b === 'number')) return [0, ...(bounds as number[])];
  }
  return DEFAULT_BOUNDS;
}

function rulesFromBounds(bounds: number[]): SegmentRule[] {
  return [
    { min_days: 0, max_days: bounds[0], segment: 'No Follow-up' },
    { min_days: bounds[0] + 1, max_days: bounds[1], segment: 'Soft Reminder' },
    { min_days: bounds[1] + 1, max_days: bounds[2], segment: 'Follow-up' },
    { min_days: bounds[2] + 1, max_days: bounds[3], segment: 'Strong Follow-up' },
    { min_days: bounds[3] + 1, max_days: null, segment: 'Escalation' },
  ] as SegmentRule[];
}

const boundsAreValid = (b: number[]) => b[0] >= 0 && b[1] > b[0] && b[2] > b[1] && b[3] > b[2];

/** The five-row day-range editor, reused for the call and WhatsApp sections. */
function BoundsEditor({
  bounds,
  onChange,
}: {
  bounds: number[];
  onChange: (index: number, value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      {SEGMENT_META.map(({ segment, color, desc }, i) => (
        <div key={segment} className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 px-3 py-2 rounded-lg" style={{ background: 'var(--sand)' }}>
          <div className="flex items-start gap-3 min-w-0 sm:flex-1">
            <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: color }} />
            <div className="min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--dark-brown)' }}>{segment}</p>
              <p className="text-[11px]" style={{ color: 'var(--walnut)' }}>{desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-shrink-0 pl-5 sm:pl-2" style={{ color: 'var(--walnut)' }}>
            {i < 4 ? (
              <>
                <span className="w-14 text-right whitespace-nowrap tabular-nums">{i === 0 ? 0 : bounds[i - 1] + 1} –</span>
                <input
                  type="number"
                  min={0}
                  value={bounds[i]}
                  onChange={(e) => onChange(i, parseInt(e.target.value) || 0)}
                  className="input-dark w-20 text-center !py-1.5"
                />
                <span>days</span>
              </>
            ) : (
              <span className="text-sm font-medium" style={{ color }}>{bounds[3] + 1}+ days</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export type ScheduleTarget = {
  id: string;
  customer_name: string;
  custom_schedule: SegmentRule[] | null;
  // Separate WhatsApp override. Null = follow the call schedule for this customer.
  whatsapp_custom_schedule?: SegmentRule[] | null;
  is_vip?: boolean;
};

export function CustomScheduleModal({
  target,
  others = [],
  onClose,
}: {
  target: ScheduleTarget;
  // Remaining selected customers: the schedule can be applied to all of them
  others?: ScheduleTarget[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: user } = useMe();
  const businessRules = user?.business?.segment_rules as SegmentRule[] | null | undefined;
  const businessWaRules = (user?.business as any)?.whatsapp_segment_rules as SegmentRule[] | null | undefined;
  const vipRule = user?.business?.vip_rule as
    | { min_days: number; max_days: number | null; segment: string }
    | null
    | undefined;
  const hasCustom = Array.isArray(target.custom_schedule) && target.custom_schedule.length > 0;
  const hasWaCustom =
    Array.isArray(target.whatsapp_custom_schedule) && target.whatsapp_custom_schedule.length > 0;
  // Without a custom schedule, start from the business-wide Segment Rules (Settings)
  const seedRules = hasCustom ? target.custom_schedule : businessRules;
  // WhatsApp seeds from its own override, else the business WhatsApp ranges, else the call ranges.
  const seedWaRules = hasWaCustom ? target.whatsapp_custom_schedule : (businessWaRules ?? seedRules);

  const [bounds, setBounds] = useState<number[]>(boundsFromRules(seedRules));
  const [touched, setTouched] = useState(false);
  // WhatsApp gets its own schedule only when the toggle is on; off = follow calls.
  const [waEnabled, setWaEnabled] = useState(hasWaCustom);
  const [waBounds, setWaBounds] = useState<number[]>(boundsFromRules(seedWaRules));
  const [applyToAll, setApplyToAll] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBounds(boundsFromRules(seedRules));
    setWaEnabled(hasWaCustom);
    setWaBounds(boundsFromRules(seedWaRules));
    setTouched(false);
    setApplyToAll(false);
  }, [target.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Business rules can arrive after the modal opens: reseed unless the user already typed
  useEffect(() => {
    if (!touched && !hasCustom) setBounds(boundsFromRules(businessRules));
    if (!touched && !hasWaCustom) setWaBounds(boundsFromRules(businessWaRules ?? businessRules));
  }, [businessRules, businessWaRules]); // eslint-disable-line react-hooks/exhaustive-deps

  const boundsValid = boundsAreValid(bounds);
  const waValid = !waEnabled || boundsAreValid(waBounds);

  const patchCustomers = async (
    callSchedule: SegmentRule[] | null,
    waSchedule: SegmentRule[] | null,
  ) => {
    const ids = applyToAll ? [target.id, ...others.map((o) => o.id)] : [target.id];
    setSaving(true);
    try {
      await Promise.all(
        ids.map((id) =>
          api.patch(`/customers/${id}`, {
            custom_schedule: callSchedule,
            whatsapp_custom_schedule: waSchedule,
          }),
        ),
      );
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['outstandings'] });
      toast.success(
        callSchedule
          ? `Custom schedule saved for ${ids.length} customer${ids.length === 1 ? '' : 's'}: segments updated`
          : `Custom schedule removed: back to business defaults`,
      );
      onClose();
    } catch (e: any) {
      toast.error('Could not save the schedule', { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-xl p-5 flex flex-col gap-3 max-h-[92vh] overflow-y-auto"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(127,85,57,0.12)' }}
          >
            <CalendarClock size={17} style={{ color: 'var(--mahogany)' }} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm" style={{ color: 'var(--dark-brown)' }}>
              Custom Schedule: {target.customer_name}
            </p>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--walnut)' }}>
              These day ranges apply to this customer only, instead of the business-wide segment
              rules. Calls and WhatsApp each have their own ranges below.
            </p>
            {!hasCustom && (
              <p className="text-[11px] mt-1.5 font-medium" style={{ color: 'var(--mahogany)' }}>
                Pre-filled with your business Segment Rules from Settings: adjust any boundary to
                make it custom for this customer.
              </p>
            )}
            {target.is_vip && vipRule && (
              <p className="text-[11px] mt-1.5 font-medium" style={{ color: '#B8860B' }}>
                {hasCustom
                  ? '⭐ VIP: this custom schedule overrides the business VIP rule for this customer.'
                  : `⭐ VIP rule active: ${vipRule.min_days}–${vipRule.max_days ?? '∞'} days overdue uses the ${vipRule.segment} script. Saving a custom schedule replaces it for this customer.`}
              </p>
            )}
          </div>
        </div>

        {/* Call schedule */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <PhoneCall size={14} style={{ color: 'var(--mahogany)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--dark-brown)' }}>Call schedule</p>
          </div>
          <BoundsEditor
            bounds={bounds}
            onChange={(i, v) => {
              setTouched(true);
              setBounds((b) => b.map((x, j) => (j === i ? v : x)));
            }}
          />
          {!boundsValid && (
            <p className="text-xs" style={{ color: '#C62828' }}>
              Each boundary must be larger than the previous one.
            </p>
          )}
        </div>

        {/* WhatsApp schedule */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} style={{ color: 'var(--mahogany)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--dark-brown)' }}>WhatsApp schedule</p>
            </div>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none" style={{ color: 'var(--dark-brown)' }}>
              <input type="checkbox" checked={waEnabled} onChange={(e) => setWaEnabled(e.target.checked)} />
              Separate ranges
            </label>
          </div>
          {waEnabled ? (
            <>
              <BoundsEditor
                bounds={waBounds}
                onChange={(i, v) => {
                  setTouched(true);
                  setWaBounds((b) => b.map((x, j) => (j === i ? v : x)));
                }}
              />
              {!waValid && (
                <p className="text-xs" style={{ color: '#C62828' }}>
                  Each WhatsApp boundary must be larger than the previous one.
                </p>
              )}
              <p className="text-[11px] leading-relaxed px-1" style={{ color: 'var(--walnut)' }}>
                The per-segment cadence still applies (Soft Reminder every 15 days, others every 7).
                A range set to <strong>No Follow-up</strong> means no WhatsApp in that range.
              </p>
            </>
          ) : (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(74,124,89,0.08)' }}>
              <span className="text-[13px] mt-0.5">💬</span>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--walnut)' }}>
                WhatsApp follows the <strong>call schedule</strong> above. Turn on
                &ldquo;Separate ranges&rdquo; to give this customer different day ranges for WhatsApp.
              </p>
            </div>
          )}
        </div>

        {others.length > 0 && (
          <label
            className="flex items-center gap-2 text-sm cursor-pointer select-none px-1"
            style={{ color: 'var(--dark-brown)' }}
          >
            <input
              type="checkbox"
              checked={applyToAll}
              onChange={(e) => setApplyToAll(e.target.checked)}
            />
            Apply this schedule to all {others.length + 1} selected customers
          </label>
        )}

        <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
          {(hasCustom || hasWaCustom) ? (
            <button
              onClick={() => patchCustomers(null, null)}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all hover:bg-[rgba(198,40,40,0.06)] disabled:opacity-50"
              style={{ color: '#C62828', borderColor: 'rgba(198,40,40,0.35)' }}
            >
              <RotateCcw size={13} /> Remove: use business default
            </button>
          ) : <span />}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:bg-[rgba(127,85,57,0.06)]"
              style={{ color: 'var(--walnut)', borderColor: 'rgba(176,137,104,0.35)' }}
            >
              Cancel
            </button>
            <button
              onClick={() =>
                patchCustomers(
                  rulesFromBounds(bounds),
                  waEnabled ? rulesFromBounds(waBounds) : null,
                )
              }
              disabled={saving || !boundsValid || !waValid}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#7F5539,#9C6644)', color: '#FFFDF9' }}
            >
              {saving ? 'Saving…' : 'Save Schedule'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
