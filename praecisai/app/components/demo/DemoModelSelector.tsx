'use client';

import { Cpu, Check } from 'lucide-react';

export type DemoModelOption = {
  tier: 'A' | 'B' | 'C';
  label: string;
  description: string;
  available: boolean;
};

interface DemoModelSelectorProps {
  models: DemoModelOption[];
  selected: 'A' | 'B' | 'C';
  onSelect: (tier: 'A' | 'B' | 'C') => void;
}

/**
 * Lets the prospect try the three AI calling models (A best, B 2nd best, C 3rd
 * best). Model A keeps the voice-agent (tone) choice below; B and C dial the
 * agent set for them in /admin/models. Renders nothing until models load.
 */
export default function DemoModelSelector({ models, selected, onSelect }: DemoModelSelectorProps) {
  if (models.length < 2) return null;

  return (
    <div className="mt-6 rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] px-4 sm:px-6 py-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Cpu className="h-4 w-4 text-[var(--mahogany)]" />
        <p className="font-body text-[13px] sm:text-sm font-semibold text-[var(--dark-brown)]">Choose an AI model</p>
        <span className="text-[11px] text-[var(--walnut)]">applies to the voice calls you trigger below</span>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {models.map((m) => {
          const active = m.tier === selected;
          return (
            <button
              key={m.tier}
              type="button"
              disabled={!m.available}
              onClick={() => onSelect(m.tier)}
              title={m.available ? undefined : 'Coming soon'}
              className="relative text-left rounded-xl border px-4 py-3 transition-all min-w-[180px] max-w-[260px] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: active ? 'var(--mahogany)' : 'var(--caramel)',
                background: active ? 'rgba(127,85,57,0.08)' : 'var(--cream)',
                boxShadow: active ? '0 2px 10px rgba(127,85,57,0.14)' : 'none',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-body text-sm font-semibold text-[var(--dark-brown)]">{m.label}</span>
                {active && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: 'var(--mahogany)' }}>
                    <Check size={11} className="text-[var(--cream)]" strokeWidth={3} />
                  </span>
                )}
              </div>
              <p className="mt-1 font-body text-[11.5px] leading-snug text-[var(--walnut)]">
                {m.available ? m.description : 'Coming soon'}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
