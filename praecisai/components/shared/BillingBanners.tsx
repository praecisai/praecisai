'use client';

import { useBillingSummary, useBillingAccess } from '../../lib/api/hooks';
import { AlertTriangle, PauseCircle, MessageCircleWarning, Sparkles } from 'lucide-react';
import Link from 'next/link';

const KIND_STYLES: Record<string, { color: string; icon: React.ElementType }> = {
  BOLNA_LOW: { color: '#E65100', icon: AlertTriangle },
  AISENSY_LOW: { color: '#B8860B', icon: MessageCircleWarning },
  MANDATE_FAILED: { color: '#C62828', icon: PauseCircle },
};

/**
 * Open billing alerts (low Bolna balance, AiSensy issues, halted mandate)
 * surfaced on the main dashboard as well as inside Billing & Usage.
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
              Continue with full onboarding
            </Link>
          </div>
        </div>
      )}
      {banners.map((b) => {
        const style = KIND_STYLES[b.kind] ?? KIND_STYLES.BOLNA_LOW;
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
                Open Billing &amp; Usage
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
