'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PhoneCall, PhoneOff, Loader2 } from 'lucide-react';
import { useMe, useUpdateBusiness } from '../../lib/api/hooks';
import { ConfirmModal } from './ConfirmModal';

/**
 * Master switch for the unattended 12:00 and 16:00 IST calling runs.
 *
 * Turning it ON starts real outbound calls without anyone present, so it asks
 * for confirmation first. Turning it OFF is instant: stopping calls should
 * never need an extra click.
 */
export function AutoCallToggle() {
  const { data: user, isLoading } = useMe();
  const updateBusiness = useUpdateBusiness();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const enabled = !!user?.business?.auto_calls_enabled;
  const busy = updateBusiness.isPending;

  const apply = async (next: boolean) => {
    try {
      await updateBusiness.mutateAsync({ auto_calls_enabled: next });
      toast.success(
        next
          ? 'Automatic calling is ON: runs at 12:00 PM and 4:00 PM'
          : 'Automatic calling is OFF: no calls will go out on their own',
      );
    } catch (e: any) {
      toast.error('Could not change automatic calling', { description: e.message });
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
            ? 'Automatic calls run at 12:00 PM and 4:00 PM. Click to turn off.'
            : 'Automatic calls are off. Click to turn on (12:00 PM and 4:00 PM).'
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
          <PhoneCall size={13} />
        ) : (
          <PhoneOff size={13} />
        )}
        <span className="hidden sm:inline">Auto calls</span>

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
        title="Turn on automatic calling?"
        message="The AI will call your outstanding customers on its own every day at 12:00 PM and 4:00 PM, without anyone starting it. VIP customers and the No Follow-up range are never included. You can switch this off at any time."
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
