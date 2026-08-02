'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { MessageSquare, MessageSquareOff, Loader2 } from 'lucide-react';
import { useMe, useUpdateBusiness } from '../../lib/api/hooks';
import { ConfirmModal } from './ConfirmModal';

/**
 * Master switch for the unattended 10:00 IST WhatsApp statement run. Sits beside
 * AutoCallToggle in the header so both automations live in one place.
 *
 * Turning it ON starts real outbound WhatsApp messages without anyone present,
 * so it asks for confirmation first. Turning it OFF is instant.
 */
export function AutoWhatsappToggle() {
  const { data: user, isLoading } = useMe();
  const updateBusiness = useUpdateBusiness();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const enabled = !!user?.business?.auto_whatsapp_enabled;
  const busy = updateBusiness.isPending;

  const apply = async (next: boolean) => {
    try {
      await updateBusiness.mutateAsync({ auto_whatsapp_enabled: next });
      toast.success(
        next
          ? 'Automatic WhatsApp is ON: runs daily at 10:00 AM'
          : 'Automatic WhatsApp is OFF: nothing will go out on its own',
      );
    } catch (e: any) {
      toast.error('Could not change automatic WhatsApp', { description: e.message });
    }
  };

  if (isLoading || !user?.business) return null;

  return (
    <>
      <button
        onClick={() => (enabled ? apply(false) : setConfirmOpen(true))}
        disabled={busy}
        title={
          enabled
            ? 'Automatic WhatsApp runs at 10:00 AM. Click to turn off.'
            : 'Automatic WhatsApp is off. Click to turn on (10:00 AM daily).'
        }
        className="flex items-center gap-2 rounded-full border pl-2.5 pr-1.5 py-1.5 text-xs font-semibold transition-all disabled:opacity-60"
        style={
          enabled
            ? { background: 'rgba(74,124,89,0.12)', color: '#2E7D32', borderColor: 'rgba(46,125,50,0.4)' }
            : { background: 'transparent', color: 'var(--walnut)', borderColor: 'rgba(176,137,104,0.4)' }
        }
      >
        {busy ? (
          <Loader2 size={13} className="animate-spin" />
        ) : enabled ? (
          <MessageSquare size={13} />
        ) : (
          <MessageSquareOff size={13} />
        )}
        <span className="hidden sm:inline">Auto WhatsApp</span>

        {/* Switch track */}
        <span
          aria-hidden
          className="relative inline-block rounded-full transition-colors"
          style={{
            width: 30,
            height: 17,
            background: enabled ? '#2E7D32' : 'rgba(176,137,104,0.45)',
          }}
        >
          <span
            className="absolute rounded-full bg-white transition-all"
            style={{ width: 13, height: 13, top: 2, left: enabled ? 15 : 2 }}
          />
        </span>
      </button>

      <ConfirmModal
        open={confirmOpen}
        title="Turn on automatic WhatsApp?"
        message="Branded statements will go out on their own every day at 10:00 AM. A party in Soft Reminder is messaged at most once every 15 days, and once every 7 days in the other segments. VIPs and the No Follow-up range are never included, and each phone number receives one message per run. You can switch this off at any time."
        confirmLabel="Turn on"
        cancelLabel="Cancel"
        variant="warning"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          apply(true);
        }}
      />
    </>
  );
}
