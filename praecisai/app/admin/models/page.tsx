'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Cpu } from 'lucide-react';
import { useAdminModelTiers, useAdminUpdateModelTier } from '../../../lib/api/hooks';

const inputCls =
  'w-full px-3 py-2 rounded-lg text-sm border bg-[var(--surface-warm)] text-[var(--dark-brown)]';
const labelCls = 'block text-[11px] font-semibold text-[var(--walnut)] uppercase tracking-wider mb-1';

const RANK: Record<string, string> = { A: 'Best (in use today)', B: '2nd best', C: '3rd best' };

const RATES: Record<string, string> = {
  A: '₹8.85 to ₹8.75 per minute',
  B: '₹5.97 to ₹5.88 per minute',
  C: '₹5.28 to ₹5.17 per minute',
};

/**
 * The three AI calling models. Names and descriptions show to customers and
 * prospects; the demo agent id is the platform Bolna agent the public demo
 * dashboard dials for that model. Per-customer agent ids for B and C are set
 * on each tenant's page. Credit prices per model are fixed in code.
 */
export default function AdminModelsPage() {
  const { data: tiers, isLoading } = useAdminModelTiers();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-[var(--dark-brown)] flex items-center gap-2">
          <Cpu size={18} className="text-[var(--mahogany)]" /> AI Models
        </h1>
        <p className="text-xs text-[var(--walnut)] mt-1 max-w-3xl">
          Model A is the agent in use today. Fill in Models B and C here for the demo dashboard, then add each
          customer&apos;s B and C agent ids on their tenant page. A model with no agent id is shown as &quot;coming
          soon&quot; and never dialled.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--walnut)]">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {(tiers ?? []).map((t: any) => (
            <ModelCard key={t.tier} tier={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function ModelCard({ tier }: { tier: any }) {
  const update = useAdminUpdateModelTier();
  const [label, setLabel] = useState(tier.label);
  const [description, setDescription] = useState(tier.description ?? '');
  const [demoAgentId, setDemoAgentId] = useState(tier.demo_agent_id ?? '');
  const [active, setActive] = useState<boolean>(tier.active);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setLabel(tier.label); setDescription(tier.description ?? ''); setDemoAgentId(tier.demo_agent_id ?? ''); setActive(tier.active); }, [tier]);

  function save() {
    update.mutate(
      { tier: tier.tier, label, description, demoAgentId, active },
      { onSuccess: () => toast.success(`${label} saved`), onError: (e: any) => toast.error(e.message) },
    );
  }

  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
          style={{ background: 'var(--sand)', color: 'var(--mahogany)' }}
        >
          Model {tier.tier} · {RANK[tier.tier]}
        </span>
        <label className="flex items-center gap-1.5 text-xs text-[var(--dark-brown)] cursor-pointer select-none">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
        </label>
      </div>
      <p className="text-xs font-semibold text-[var(--mahogany)]">{RATES[tier.tier]}</p>
      <div>
        <label className={labelCls}>Name</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls} style={{ borderColor: 'var(--caramel)' }} />
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={inputCls}
          style={{ borderColor: 'var(--caramel)' }}
        />
      </div>
      <div>
        <label className={labelCls}>Demo agent id (platform Bolna account)</label>
        <input
          value={demoAgentId}
          onChange={(e) => setDemoAgentId(e.target.value)}
          placeholder={tier.tier === 'A' ? 'Not needed: Model A uses Demo Agents' : 'Bolna agent id'}
          disabled={tier.tier === 'A'}
          className={`${inputCls} disabled:opacity-50`}
          style={{ borderColor: 'var(--caramel)' }}
        />
      </div>
      <button
        onClick={save}
        disabled={update.isPending}
        className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
        style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
      >
        Save
      </button>
    </div>
  );
}
