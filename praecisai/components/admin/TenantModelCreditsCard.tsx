'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Cpu, Coins } from 'lucide-react';
import {
  useAdminUpdateTenant,
  useAdminAdjustCredits,
  useAdminCreditHistory,
  useAdminModelTiers,
} from '../../lib/api/hooks';
import { ModelKeysForm } from './ModelKeysForm';

const inputCls =
  'w-full px-3 py-2 rounded-lg text-sm border bg-[var(--surface-warm)] text-[var(--dark-brown)]';
const labelCls = 'block text-[11px] font-semibold text-[var(--walnut)] uppercase tracking-wider mb-1';

const REASON_LABEL: Record<string, string> = {
  PURCHASE: 'Bought',
  AUTOPAY: 'Autopay',
  USAGE: 'Used',
  ADJUSTMENT: 'Adjusted',
};

/**
 * Admin tenant page: which AI model the tenant dials with (+ the full
 * connection settings of models B and C), prepaid credits on/off,
 * balances, and manual credit adjustments (opening balance, goodwill, fixes).
 */
export function TenantModelCreditsCard({ tenant }: { tenant: any }) {
  const update = useAdminUpdateTenant(tenant.id);
  const adjust = useAdminAdjustCredits(tenant.id);
  const { data: history } = useAdminCreditHistory(tenant.id);
  const { data: tiers } = useAdminModelTiers();
  const tierLabel = (t: string) => (tiers ?? []).find((x: any) => x.tier === t)?.label ?? `Model ${t}`;

  const [tier, setTier] = useState<string>(tenant.call_model_tier ?? 'A');
  const [editTier, setEditTier] = useState<'B' | 'C'>('B');
  const modelPreviews = tenant.keys?.models ?? {};
  const [kind, setKind] = useState<'CALL' | 'WHATSAPP'>('CALL');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  function saveModel() {
    if ((tier === 'B' || tier === 'C') && !modelPreviews[tier]?.bolna_agent_id) {
      return toast.error(`Save the Model ${tier} Bolna agent id below before switching to it`);
    }
    update.mutate(
      { callModelTier: tier },
      { onSuccess: () => toast.success('AI model saved'), onError: (e: any) => toast.error(e.message) },
    );
  }

  function toggleCredits(on: boolean) {
    update.mutate(
      { creditBilling: on },
      {
        onSuccess: () => toast.success(on ? 'Prepaid credits switched on' : 'Back on direct billing'),
        onError: (e: any) => toast.error(e.message),
      },
    );
  }

  function applyAdjustment() {
    const delta = Number(amount);
    if (!Number.isFinite(delta) || delta === 0) return toast.error('Enter a non-zero amount (negative to remove)');
    adjust.mutate(
      { kind, delta, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Credits adjusted');
          setAmount('');
          setNote('');
        },
        onError: (e: any) => toast.error(e.message),
      },
    );
  }

  const credits = tenant.credits ?? {};

  return (
    <div className="glass-card p-5 space-y-5">
      {/* AI model */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--dark-brown)] mb-1 flex items-center gap-2">
          <Cpu size={15} className="text-[var(--mahogany)]" /> AI model
        </h2>
        <p className="text-xs text-[var(--walnut)] mb-3">
          Model A uses the tenant settings above. Models B and C have their own full settings below (Bolna, caller IDs,
          Vobiz, AiSensy); any field left empty uses Model A&apos;s. Calls and WhatsApp use the settings of the model in
          use.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px]">
            <label className={labelCls}>Model in use</label>
            <select value={tier} onChange={(e) => setTier(e.target.value)} className={inputCls} style={{ borderColor: 'var(--caramel)' }}>
              {['A', 'B', 'C'].map((t) => (
                <option key={t} value={t}>
                  {tierLabel(t)}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={saveModel}
            disabled={update.isPending}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
          >
            Save AI model
          </button>
        </div>

        <div className="mt-5 rounded-xl border p-4" style={{ borderColor: 'rgba(221,184,146,0.5)' }}>
          <div className="flex gap-1.5 mb-4">
            {(['B', 'C'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setEditTier(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                style={
                  editTier === t
                    ? { background: 'var(--mahogany)', color: 'var(--cream)', borderColor: 'var(--mahogany)' }
                    : { borderColor: 'var(--caramel)', color: 'var(--mahogany)' }
                }
              >
                {tierLabel(t)} settings
              </button>
            ))}
          </div>
          <ModelKeysForm
            key={`${tenant.id}-${editTier}`}
            tenantId={tenant.id}
            tier={editTier}
            previews={modelPreviews[editTier]}
          />
        </div>
      </div>

      {/* Credits */}
      <div className="pt-4 border-t" style={{ borderColor: 'rgba(221,184,146,0.4)' }}>
        <h2 className="text-sm font-semibold text-[var(--dark-brown)] mb-1 flex items-center gap-2">
          <Coins size={15} className="text-[var(--mahogany)]" /> Prepaid credits
        </h2>
        <label className="flex items-center gap-2 text-sm text-[var(--dark-brown)] cursor-pointer select-none mt-2">
          <input
            type="checkbox"
            checked={!!tenant.credit_billing}
            disabled={update.isPending}
            onChange={(e) => toggleCredits(e.target.checked)}
          />
          Charge calls and WhatsApp from credits (stop when they run out)
        </label>
        <p className="text-xs text-[var(--walnut)] mt-1">
          Off = legacy direct billing: nothing is deducted or blocked. Before switching a live customer on, give them an
          opening balance below so their calls don&apos;t stop.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          <div className="p-3 rounded-xl" style={{ background: 'var(--sand)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--walnut)]">Call minutes</p>
            <p className="text-lg font-bold text-[var(--dark-brown)]">{(credits.call ?? 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--sand)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--walnut)]">WhatsApp</p>
            <p className="text-lg font-bold text-[var(--dark-brown)]">{(credits.whatsapp ?? 0).toLocaleString('en-IN')}</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: 'var(--sand)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--walnut)]">Autopay</p>
            <p className="text-sm font-bold text-[var(--dark-brown)] mt-1">
              {credits.autopay_enabled ? 'On' : credits.autopay_status === 'PENDING' ? 'Pending' : 'Off'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3 items-end">
          <div>
            <label className={labelCls}>Credits</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as any)} className={inputCls} style={{ borderColor: 'var(--caramel)' }}>
              <option value="CALL">Call minutes</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Add / remove</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 500 or -20" className={inputCls} style={{ borderColor: 'var(--caramel)' }} />
          </div>
          <div>
            <label className={labelCls}>Note (customer sees it)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opening balance" className={inputCls} style={{ borderColor: 'var(--caramel)' }} />
          </div>
          <button
            onClick={applyAdjustment}
            disabled={adjust.isPending}
            className="px-4 py-2 rounded-lg text-sm font-semibold border text-[var(--mahogany)] disabled:opacity-50"
            style={{ borderColor: 'var(--caramel)' }}
          >
            {adjust.isPending ? 'Saving…' : 'Apply'}
          </button>
        </div>

        {history?.length ? (
          <div className="overflow-x-auto mt-4">
            <table className="data-table w-full min-w-[520px]">
              <thead>
                <tr>
                  <th className="text-left">When</th>
                  <th className="text-left">Credits</th>
                  <th className="text-left">What</th>
                  <th className="text-right">Change</th>
                  <th className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 15).map((t: any) => (
                  <tr key={t.id}>
                    <td className="text-xs text-[var(--walnut)]">{new Date(t.created_at).toLocaleString('en-IN')}</td>
                    <td className="text-xs text-[var(--walnut)]">{t.kind === 'CALL' ? 'Calls' : 'WhatsApp'}</td>
                    <td className="text-xs text-[var(--dark-brown)]">
                      {REASON_LABEL[t.reason] ?? t.reason}
                      {t.note ? ` · ${t.note}` : ''}
                    </td>
                    <td className="text-right text-xs font-semibold">{t.delta > 0 ? '+' : ''}{t.delta}</td>
                    <td className="text-right text-xs text-[var(--walnut)]">{t.balance_after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
