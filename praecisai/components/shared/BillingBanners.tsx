'use client';

import { useBillingSummary } from '../../lib/api/hooks';
import { AlertTriangle, PauseCircle, MessageCircleWarning } from 'lucide-react';
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
  const banners: any[] = data?.banners ?? [];
  if (!banners.length) return null;

  return (
    <div className="space-y-2 mb-4">
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
