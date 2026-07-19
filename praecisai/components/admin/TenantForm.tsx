'use client';

import { useState } from 'react';
import { KeyRound, RefreshCcw } from 'lucide-react';

export interface TenantFormValues {
  name: string;
  allowedEmails: string[];
  bolnaApiKey?: string;
  bolnaAgentId?: string;
  aisensyApiKey?: string;
  lowBalanceThresholdUsd?: number;
  billingEmail?: string;
  gstin?: string;
}

interface KeyPreviews {
  bolna_key_last4?: string | null;
  bolna_agent_id?: string | null;
  aisensy_key_last4?: string | null;
}

const inputCls =
  'w-full px-3 py-2.5 rounded-lg text-sm border bg-[var(--surface-warm)] text-[var(--dark-brown)]';
const inputStyle = { borderColor: 'var(--caramel)' } as const;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--walnut)] uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-[var(--walnut)] mt-1">{hint}</p>}
    </div>
  );
}

/**
 * Write-only key fields: for an existing tenant the saved key shows only its
 * last 4 characters and a "Replace key" action reveals an empty input. An
 * untouched key field is omitted from the payload entirely.
 */
function SecretField({
  label,
  saved,
  value,
  onChange,
}: {
  label: string;
  saved: string | null | undefined;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  const [replacing, setReplacing] = useState(!saved);
  return (
    <Field label={label}>
      {saved && !replacing ? (
        <div className="flex items-center gap-2">
          <div
            className="flex-1 px-3 py-2.5 rounded-lg text-sm border flex items-center gap-2 text-[var(--walnut)]"
            style={inputStyle}
          >
            <KeyRound size={14} /> ••••••••{saved}
          </div>
          <button
            type="button"
            onClick={() => setReplacing(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold border text-[var(--mahogany)]"
            style={inputStyle}
          >
            <RefreshCcw size={13} /> Replace key
          </button>
        </div>
      ) : (
        <input
          type="password"
          autoComplete="off"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={saved ? 'Enter new key to replace' : 'Paste API key'}
          className={inputCls}
          style={inputStyle}
        />
      )}
    </Field>
  );
}

export function TenantForm({
  initial,
  previews,
  saving,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<TenantFormValues>;
  previews?: KeyPreviews;
  saving: boolean;
  submitLabel: string;
  onSubmit: (values: TenantFormValues) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [emails, setEmails] = useState((initial?.allowedEmails ?? []).join(', '));
  const [bolnaApiKey, setBolnaApiKey] = useState<string | undefined>(undefined);
  const [bolnaAgentId, setBolnaAgentId] = useState(previews?.bolna_agent_id ?? '');
  const [aisensyApiKey, setAisensyApiKey] = useState<string | undefined>(undefined);
  const [threshold, setThreshold] = useState(String(initial?.lowBalanceThresholdUsd ?? 5));
  const [billingEmail, setBillingEmail] = useState(initial?.billingEmail ?? '');
  const [gstin, setGstin] = useState(initial?.gstin ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      allowedEmails: emails
        .split(/[,\n;]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      ...(bolnaApiKey !== undefined ? { bolnaApiKey } : {}),
      ...(bolnaAgentId !== (previews?.bolna_agent_id ?? '') ? { bolnaAgentId } : {}),
      ...(aisensyApiKey !== undefined ? { aisensyApiKey } : {}),
      lowBalanceThresholdUsd: Number(threshold) || 5,
      billingEmail: billingEmail.trim(),
      gstin: gstin.trim(),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-2xl">
      <Field label="Business name">
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} style={inputStyle} />
      </Field>

      <Field label="Allowed emails" hint="Comma-separated. These emails can log in and use calling / WhatsApp / import.">
        <textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          rows={2}
          className={inputCls}
          style={inputStyle}
          placeholder="owner@business.com, accounts@business.com"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SecretField label="Bolna API key" saved={previews?.bolna_key_last4} value={bolnaApiKey} onChange={setBolnaApiKey} />
        <Field label="Bolna agent id">
          <input value={bolnaAgentId} onChange={(e) => setBolnaAgentId(e.target.value)} className={inputCls} style={inputStyle} />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SecretField label="AiSensy API key" saved={previews?.aisensy_key_last4} value={aisensyApiKey} onChange={setAisensyApiKey} />
        <Field label="Low balance alert threshold (USD)">
          <input
            type="number"
            min={1}
            step="0.5"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Billing email">
          <input
            type="email"
            value={billingEmail}
            onChange={(e) => setBillingEmail(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
        </Field>
        <Field label="GSTIN" hint="Optional: printed on GST invoices">
          <input value={gstin} onChange={(e) => setGstin(e.target.value)} className={inputCls} style={inputStyle} />
        </Field>
      </div>

      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="px-6 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
        style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
      >
        {saving ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
