'use client';

import { Bot, Check } from 'lucide-react';

export type DemoAgentOption = {
  id: string;
  name: string;
  description: string;
  voiceLabel: string;
  isDefault: boolean;
};

interface DemoAgentSelectorProps {
  agents: DemoAgentOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Lets the prospect pick which voice agent (tone) the demo call uses. Only
 * shown when the admin has configured agents; otherwise the demo falls back to
 * the default platform agent and this renders nothing.
 */
export default function DemoAgentSelector({ agents, selectedId, onSelect }: DemoAgentSelectorProps) {
  if (!agents.length) return null;

  return (
    <div className="mt-6 mb-6 rounded-xl border border-[var(--caramel)] bg-[var(--surface-warm)] px-4 sm:px-6 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="h-4 w-4 text-[var(--mahogany)]" />
        <p className="font-body text-[13px] sm:text-sm font-semibold text-[var(--dark-brown)]">
          Choose a calling agent
        </p>
        <span className="text-[11px] text-[var(--walnut)]">applies to the voice calls you trigger below</span>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {agents.map((a) => {
          const active = a.id === selectedId;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              className="relative text-left rounded-xl border px-4 py-3 transition-all min-w-[180px] max-w-[260px]"
              style={{
                borderColor: active ? 'var(--mahogany)' : 'var(--caramel)',
                background: active ? 'rgba(127,85,57,0.08)' : 'var(--cream)',
                boxShadow: active ? '0 2px 10px rgba(127,85,57,0.14)' : 'none',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-body text-sm font-semibold text-[var(--dark-brown)]">{a.name}</span>
                {active && (
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded-full"
                    style={{ background: 'var(--mahogany)' }}
                  >
                    <Check size={11} className="text-[var(--cream)]" strokeWidth={3} />
                  </span>
                )}
              </div>
              {a.voiceLabel && (
                <div className="text-[11px] font-medium text-[var(--mahogany)] mt-0.5">{a.voiceLabel}</div>
              )}
              {a.description && (
                <div className="text-[11px] text-[var(--walnut)] mt-1 leading-snug">{a.description}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
