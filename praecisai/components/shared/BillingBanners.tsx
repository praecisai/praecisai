'use client';

import { useBillingSummary, useBillingAccess } from '../../lib/api/hooks';
import { AlertTriangle, PauseCircle, CreditCard, Sparkles, Gift } from 'lucide-react';
import Link from 'next/link';

const KIND_STYLES: Record<string, { color: string; icon: React.ElementType }> = {
  CREDITS_LOW: { color: '#E65100', icon: AlertTriangle },
  CREDITS_EMPTY: { color: '#7F5539', icon: Sparkles },
  TRIAL_ACTIVE: { color: '#2E7D32', icon: Gift },
  TRIAL_OVER: { color: '#C62828', icon: Gift },
  AUTOPAY_FAILED: { color: '#C62828', icon: CreditCard },
  MANDATE_FAILED: { color: '#C62828', icon: PauseCircle },
};

/**
 * Billing alerts on the main dashboard and in Billing & Usage: call or WhatsApp
 * credits below the customer's warning level, a failed autopay top-up, and a
 * halted subscription mandate. (Platform wallet balances are never shown to
 * customers.)
 */
export function BillingBanners() {
  const { data } = useBillingSummary();
  const { data: access } = useBillingAccess();
  const banners: any[] = data?.banners ?? [];
  const showTrial = access?.reason === 'TRIAL' && access?.trial_active;
  if (!banners.length && !showTrial) return null;

  return (
    <div className="space-y-2 mb-4">
      {showTrial && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl border text-sm"
          style={{ background: '#7F553912', borderColor: '#7F553940', color: 'var(--dark-brown)' }}
        >
          <Sparkles size={17} className="flex-shrink-0 mt-0.5 text-[var(--mahogany)]" />
          <div className="min-w-0 flex-1">
            <p>
              Trial active: {access.trial_days_left} day{access.trial_days_left !== 1 ? 's' : ''} left
              (ends {new Date(access.trial_ends_at).toLocaleDateString('en-IN')}). Access closes automatically after that.
            </p>
            <Link
              href="/dashboard/billing/onboarding"
              className="text-xs font-semibold underline underline-offset-2 text-[var(--mahogany)]"
            >
              Continue with a monthly or yearly plan
            </Link>
          </div>
        </div>
      )}
      {banners.map((b) => {
        const style = KIND_STYLES[b.kind] ?? KIND_STYLES.CREDITS_LOW;
        const Icon = style.icon;
        return (
          <div
            key={b.id}
            className="flex items-start gap-3 px-4 py-3 rounded-xl border text-sm"
            style={{
              background: `${style.color}12`,
              borderColor: `${style.color}40`,
              color: 'var(--dark-brown)',
            }}
          >
            <Icon size={17} className="flex-shrink-0 mt-0.5" style={{ color: style.color }} />
            <div className="min-w-0 flex-1">
              <p>{b.message}</p>
              <Link
                href="/dashboard/billing"
                className="text-xs font-semibold underline underline-offset-2"
                style={{ color: style.color }}
              >
                {b.kind === 'MANDATE_FAILED'
                  ? 'Open Billing & Usage'
                  : b.kind === 'CREDITS_EMPTY' || b.kind === 'TRIAL_OVER'
                    ? 'Add credits'
                    : b.kind === 'TRIAL_ACTIVE'
                      ? 'See plans and credits'
                    : 'Buy credits or turn on autopay'}
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
