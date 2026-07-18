'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api/client';
import { useQueryClient } from '@tanstack/react-query';
import type { SegmentRule } from '../../types';

// Per-customer segment schedule editor: same shape as the business-level
// Segment Rules in Settings, but saved onto the customer as custom_schedule.
// Day ranges decide when this customer moves from Soft Reminder → Follow-up →
// Strong Follow-up → Escalation, overriding the business defaults.

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

export type ScheduleTarget = {
  id: string;
  customer_name: string;
  custom_schedule: SegmentRule[] | null;
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
  const [bounds, setBounds] = useState<number[]>(boundsFromRules(target.custom_schedule));
  const [applyToAll, setApplyToAll] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBounds(boundsFromRules(target.custom_schedule));
    setApplyToAll(false);
  }, [target.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const boundsValid =
    bounds[0] >= 0 && bounds[1] > bounds[0] && bounds[2] > bounds[1] && bounds[3] > bounds[2];
  const hasCustom = Array.isArray(target.custom_schedule) && target.custom_schedule.length > 0;

  const patchCustomers = async (customSchedule: SegmentRule[] | null) => {
    const ids = applyToAll ? [target.id, ...others.map((o) => o.id)] : [target.id];
    setSaving(true);
    try {
      await Promise.all(ids.map((id) => api.patch(`/customers/${id}`, { custom_schedule: customSchedule })));
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['outstandings'] });
      toast.success(
        customSchedule
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
        className="glass-card w-full max-w-lg p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
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
              rules. They decide the call tone, WhatsApp template and statement colour.
            </p>
          </div>
        </div>

        <div className="space-y-2.5">
          {SEGMENT_META.map(({ segment, color, desc }, i) => (
            <div key={segment} className="flex flex-wrap items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--sand)' }}>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--dark-brown)' }}>{segment}</p>
                <p className="text-[11px]" style={{ color: 'var(--walnut)' }}>{desc}</p>
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--walnut)' }}>
                {i < 4 ? (
                  <>
                    <span>{i === 0 ? 0 : bounds[i - 1] + 1} –</span>
                    <input
                      type="number"
                      min={0}
                      value={bounds[i]}
                      onChange={(e) => {
                        const v = parseInt(e.target.value) || 0;
                        setBounds((b) => b.map((x, j) => (j === i ? v : x)));
                      }}
                      className="input-dark w-20 text-center"
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

        {!boundsValid && (
          <p className="text-xs" style={{ color: '#C62828' }}>
            Each boundary must be larger than the previous one.
          </p>
        )}

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
          {hasCustom ? (
            <button
              onClick={() => patchCustomers(null)}
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
              onClick={() => patchCustomers(rulesFromBounds(bounds))}
              disabled={saving || !boundsValid}
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
