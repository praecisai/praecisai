'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PhoneCall, MessageSquare, Loader2 } from 'lucide-react';
import { useMe, useUpdateBusiness } from '../../lib/api/hooks';
import { ConfirmModal } from './ConfirmModal';

/**
 * The two master switches for unattended contact, on the Settings page.
 *
 * The calling toggle also lives as a compact pill in the page header, but a
 * header pill is easy to miss and there was nowhere at all to turn automatic
 * WhatsApp on. Both live here, spelled out, with the schedule stated on screen
 * so nobody has to guess when a run fires.
 *
 * Turning either ON starts real outbound contact with nobody present, so it
 * asks first. Turning OFF is instant: stopping contact never needs a
 * confirmation step.
 */

type Pending = 'calls' | 'whatsapp' | null;

export function AutomationSettings() {
  const { data: user, isLoading } = useMe();
  const updateBusiness = useUpdateBusiness();
  const [confirm, setConfirm] = useState<Pending>(null);

  const business = user?.business;
  const callsOn = !!business?.auto_calls_enabled;
  const waOn = !!business?.auto_whatsapp_enabled;
  const busy = updateBusiness.isPending;

  const apply = async (field: 'auto_calls_enabled' | 'auto_whatsapp_enabled', next: boolean) => {
    const label = field === 'auto_calls_enabled' ? 'Automatic calling' : 'Automatic WhatsApp';
    try {
      await updateBusiness.mutateAsync({ [field]: next });
      toast.success(
        next
          ? `${label} is ON`
          : `${label} is OFF: nothing will go out on its own`,
      );
    } catch (e: any) {
      toast.error(`Could not change ${label.toLowerCase()}`, { description: e.message });
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--caramel)', background: 'var(--surface-warm)' }}>
        <div className="h-4 w-40 rounded animate-pulse" style={{ background: 'var(--sand)' }} />
        <div className="mt-4 h-16 rounded animate-pulse" style={{ background: 'var(--sand)' }} />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="rounded-xl border p-5 text-sm" style={{ borderColor: 'var(--caramel)', background: 'var(--surface-warm)', color: 'var(--walnut)' }}>
        Could not load your business settings. Refresh the page, and if it keeps happening sign out and back in.
      </div>
    );
  }

  const rows = [
    {
      key: 'calls' as const,
      field: 'auto_calls_enabled' as const,
      icon: PhoneCall,
      title: 'Automatic AI calls',
      schedule: 'Runs daily at 12:00 PM and 4:00 PM IST',
      body: 'Calls every eligible party in Soft Reminder, Follow-up, Strong Follow-up and Escalation. VIPs and the No Follow-up range are never included.',
      on: callsOn,
    },
    {
      key: 'whatsapp' as const,
      field: 'auto_whatsapp_enabled' as const,
      icon: MessageSquare,
      title: 'Automatic WhatsApp statements',
      schedule: 'Runs daily at 10:00 AM IST',
      body: 'Sends a branded statement on a per-segment cadence: Soft Reminder every 15 days, all other segments every 7 days. One message per phone number, VIPs excluded.',
      on: waOn,
    },
  ];

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--caramel)', background: 'var(--surface-warm)' }}>
      <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(221,184,146,0.4)' }}>
        <h2 className="text-sm font-semibold text-[var(--dark-brown)]">Automation</h2>
        <p className="mt-0.5 text-xs text-[var(--walnut)]">
          Unattended contact. Both are off until you switch them on.
        </p>
      </div>

      {rows.map((row) => (
        <div
          key={row.key}
          className="flex items-start gap-4 px-5 py-4 border-b last:border-b-0"
          style={{ borderColor: 'rgba(221,184,146,0.3)' }}
        >
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'var(--sand)', color: 'var(--mahogany)' }}
          >
            <row.icon size={17} strokeWidth={1.9} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--dark-brown)]">{row.title}</p>
            <p className="mt-0.5 text-[11px] font-medium text-[var(--rust)]">{row.schedule}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--walnut)]">{row.body}</p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={row.on}
            aria-label={row.title}
            disabled={busy}
            onClick={() => (row.on ? apply(row.field, false) : setConfirm(row.key))}
            className="mt-0.5 shrink-0 rounded-full transition-opacity disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={18} className="animate-spin text-[var(--walnut)]" />
            ) : (
              <span
                aria-hidden
                className="relative inline-block rounded-full transition-colors"
                style={{ width: 38, height: 22, background: row.on ? '#2E7D32' : 'rgba(176,137,104,0.45)' }}
              >
                <span
                  className="absolute rounded-full bg-white transition-all"
                  style={{ width: 16, height: 16, top: 3, left: row.on ? 19 : 3 }}
                />
              </span>
            )}
          </button>
        </div>
      ))}

      <ConfirmModal
        open={confirm === 'calls'}
        title="Turn on automatic calling?"
        message="The AI will call your outstanding customers on its own every day at 12:00 PM and 4:00 PM, without anyone starting it. VIP customers and the No Follow-up range are never included. You can switch this off at any time."
        confirmLabel="Turn on"
        cancelLabel="Cancel"
        variant="warning"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          apply('auto_calls_enabled', true);
        }}
      />

      <ConfirmModal
        open={confirm === 'whatsapp'}
        title="Turn on automatic WhatsApp?"
        message="Branded statements will go out on their own every day at 10:00 AM. A party in Soft Reminder is messaged at most once every 15 days, and once every 7 days in the other segments. VIPs are never included, and each phone number receives one message per run. You can switch this off at any time."
        confirmLabel="Turn on"
        cancelLabel="Cancel"
        variant="warning"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          apply('auto_whatsapp_enabled', true);
        }}
      />
    </div>
  );
}
