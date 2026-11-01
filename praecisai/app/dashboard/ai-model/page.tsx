'use client';

import { toast } from 'sonner';
import { Cpu, CheckCircle2, Lock, Loader2 } from 'lucide-react';
import { TopHeader } from '../../../components/layout/Sidebar';
import { useCallModel, useSetCallModel } from '../../../lib/api/hooks';

const RANK: Record<string, string> = { A: 'Best', B: '2nd best', C: '3rd best' };

/**
 * Switch the AI calling model this account dials with. Only platform-owner
 * logins can switch (the sidebar item is shown to them only); anyone else
 * landing here sees the current model read-only.
 */
export default function AiModelPage() {
  const { data, isLoading } = useCallModel();
  const setModel = useSetCallModel();

  function choose(tier: 'A' | 'B' | 'C', label: string) {
    setModel.mutate(tier, {
      onSuccess: () => toast.success(`Now calling with ${label}`),
      onError: (e: any) => toast.error(e.message),
    });
  }

  return (
    <>
      <TopHeader title="AI Model" subtitle="Which AI voice model places your calls" />
      <div className="p-4 sm:p-6 space-y-5 max-w-5xl">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Cpu size={18} className="text-[var(--mahogany)]" />
            <h2 className="font-semibold text-[var(--dark-brown)]">Model in use</h2>
          </div>
          <p className="text-xs text-[var(--walnut)]">
            Every AI call from this account, manual and automatic, uses the model picked here. Switching applies to the
            next call. Call credits are minutes, so a balance carries over; new call packs are priced at the chosen
            model&apos;s rate.
          </p>
        </div>

        {isLoading || !data ? (
          <div className="glass-card p-6 flex items-center gap-2 text-sm text-[var(--walnut)]">
            <Loader2 size={15} className="animate-spin" /> Loading models…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.tiers.map((t: any) => {
              const current = data.current === t.tier;
              const usable = t.active && t.available;
              return (
                <div
                  key={t.tier}
                  className="glass-card p-5 flex flex-col"
                  style={{ border: current ? '2px solid var(--mahogany)' : '2px solid transparent' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                      style={{ background: current ? 'var(--mahogany)' : 'var(--sand)', color: current ? 'var(--cream)' : 'var(--walnut)' }}
                    >
                      {RANK[t.tier] ?? t.tier}
                    </span>
                    {current && (
                      <span className="text-xs font-semibold flex items-center gap-1" style={{ color: '#2E7D32' }}>
                        <CheckCircle2 size={13} /> In use
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 font-semibold text-[var(--dark-brown)]">{t.label}</h3>
                  <p className="text-xs text-[var(--walnut)] mt-1">{t.description || '-'}</p>
                  {t.rate_from != null && (
                    <p className="text-sm font-semibold text-[var(--mahogany)] mt-3">
                      ₹{t.rate_from} to ₹{t.rate_to} per minute
                    </p>
                  )}
                  <div className="flex-1" />
                  {!t.active ? (
                    <p className="mt-4 text-xs text-[var(--walnut)] flex items-center gap-1.5">
                      <Lock size={12} /> Switched off in admin
                    </p>
                  ) : !t.available ? (
                    <p className="mt-4 text-xs text-[var(--walnut)] flex items-center gap-1.5">
                      <Lock size={12} /> Add this model&apos;s agent id for this business in admin first
                    </p>
                  ) : current ? (
                    <p className="mt-4 text-xs text-[var(--walnut)]">Calls are using this model now.</p>
                  ) : data.can_switch ? (
                    <button
                      onClick={() => choose(t.tier, t.label)}
                      disabled={setModel.isPending || !usable}
                      className="mt-4 w-full py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                      style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
                    >
                      {setModel.isPending ? 'Switching…' : `Use ${t.label}`}
                    </button>
                  ) : (
                    <p className="mt-4 text-xs text-[var(--walnut)]">Contact the PraecisAI team to switch.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
