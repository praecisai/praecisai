'use client';

import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type Credits = {
  balanceUsd: number;
  avgCallCostUsd: number | null;
  estCallsLeft: number | null;
  deepgramUsd?: number | null;
};

// Small admin-facing chip showing remaining Bolna call credits so demos are
// never interrupted by an empty wallet. refreshKey bumps after each call so
// the balance updates without a page reload (backend caches for 60s).
export default function DemoCreditsBadge({ token, refreshKey }: { token: string; refreshKey: number }) {
  const [credits, setCredits] = useState<Credits | null>(null);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
    let cancelled = false;
    fetch(`${backendUrl}/api/v1/demo-leads/${token}/credits`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled || !json) return;
        const data: Credits = json.data ?? json;
        if (typeof data?.balanceUsd === 'number') setCredits(data);
      })
      .catch(() => { /* badge is optional — never break the dashboard */ });
    return () => { cancelled = true; };
  }, [token, refreshKey]);

  if (!credits) return null;

  const low = credits.balanceUsd < 0.3;
  const mid = !low && credits.balanceUsd < 1;

  return (
    <div
      className={cn(
        'inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full border px-4 py-1.5 font-body text-[12px] font-semibold',
        low
          ? 'border-red-300 bg-red-50 text-red-600'
          : mid
          ? 'border-amber-300 bg-amber-50 text-amber-700'
          : 'border-[var(--caramel)] bg-[var(--sand)] text-[var(--mahogany)]',
      )}
      title="Bolna wallet remaining for demo calls (telephony + platform fee per call)"
    >
      <Coins className="h-3.5 w-3.5" />
      <span>
        Call credits: {credits.balanceUsd < 0 ? '-' : ''}${Math.abs(credits.balanceUsd).toFixed(2)}
      </span>
      {credits.estCallsLeft !== null && (
        <span className="opacity-75">· ≈{credits.estCallsLeft} calls left</span>
      )}
      {typeof credits.deepgramUsd === 'number' && (
        <span className="opacity-75">· Deepgram ${credits.deepgramUsd.toFixed(2)}</span>
      )}
      {low && <span className="font-bold">— top up now</span>}
      {mid && <span className="font-bold">— top up soon</span>}
    </div>
  );
}
