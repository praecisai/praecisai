'use client';

import { useState } from 'react';
import { KeyRound, RefreshCcw } from 'lucide-react';

export interface TenantFormValues {
  name: string;
  allowedEmails: string[];
  bolnaApiKey?: string;
  bolnaAgentId?: string;
  bolnaFromNumber?: string;
  backupFromNumbers?: string[];
  vobizAuthId?: string;
  vobizAuthToken?: string;
  aisensyApiKey?: string;
  lowBalanceThresholdUsd?: number;
  billingEmail?: string;
  gstin?: string;
  city?: string;
}

interface KeyPreviews {
  bolna_key_last4?: string | null;
  bolna_agent_id?: string | null;
  bolna_from_number?: string | null;
  backup_from_numbers?: string[];
  vobiz_auth_id?: string | null;
  vobiz_token_last4?: string | null;
  aisensy_key_last4?: string | null;
}

const splitNumbers = (s: string) =>
  s
    .split(/[\s,;]+/)
    .map((n) => n.trim())
    .filter(Boolean);

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
  const [bolnaFromNumber, setBolnaFromNumber] = useState(previews?.bolna_from_number ?? '');
  const savedBackups = (previews?.backup_from_numbers ?? []).join('\n');
  const [backupNumbers, setBackupNumbers] = useState(savedBackups);
  const [vobizAuthId, setVobizAuthId] = useState(previews?.vobiz_auth_id ?? '');
  const [vobizAuthToken, setVobizAuthToken] = useState<string | undefined>(undefined);
  const [aisensyApiKey, setAisensyApiKey] = useState<string | undefined>(undefined);
  const [threshold, setThreshold] = useState(String(initial?.lowBalanceThresholdUsd ?? 5));
  const [billingEmail, setBillingEmail] = useState(initial?.billingEmail ?? '');
  const [gstin, setGstin] = useState(initial?.gstin ?? '');
  const [city, setCity] = useState(initial?.city ?? '');

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
      ...(bolnaFromNumber !== (previews?.bolna_from_number ?? '')
        ? { bolnaFromNumber: bolnaFromNumber.trim() }
        : {}),
      ...(backupNumbers.trim() !== savedBackups.trim()
        ? { backupFromNumbers: splitNumbers(backupNumbers) }
        : {}),
      ...(vobizAuthId.trim() !== (previews?.vobiz_auth_id ?? '') ? { vobizAuthId: vobizAuthId.trim() } : {}),
      ...(vobizAuthToken !== undefined ? { vobizAuthToken } : {}),
      ...(aisensyApiKey !== undefined ? { aisensyApiKey } : {}),
      lowBalanceThresholdUsd: Number(threshold) || 5,
      billingEmail: billingEmail.trim(),
      gstin: gstin.trim(),
      city: city.trim(),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Business name">
          <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} style={inputStyle} />
        </Field>
        <Field label="City" hint="Spoken by the AI when a customer asks where you're calling from">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={inputCls}
            style={inputStyle}
            placeholder="e.g. Mumbai"
          />
        </Field>
      </div>

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

      <Field
        label="Outbound caller ID"
        hint="The Bolna number this business bought. Customers see it when the AI calls, and it's the number they call back. Leave empty to dial from Bolna's shared pool."
      >
        <input
          value={bolnaFromNumber}
          onChange={(e) => setBolnaFromNumber(e.target.value)}
          className={inputCls}
          style={inputStyle}
          placeholder="+918071582906"
        />
      </Field>

      <Field
        label="Backup caller IDs"
        hint="One per line, in the order to use them. Used only when the caller ID above is blocked on Vobiz, or when one customer has ignored it 3 times in a row (that customer then moves to one backup). Each must be on the same Bolna account."
      >
        <textarea
          value={backupNumbers}
          onChange={(e) => setBackupNumbers(e.target.value)}
          rows={3}
          className={inputCls}
          style={inputStyle}
          placeholder={'+918071579422\n+918065354620'}
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Vobiz Auth ID" hint="Leave empty to use the shared Vobiz login set on the server. Fill only if this business has its own Vobiz account.">
          <input
            value={vobizAuthId}
            onChange={(e) => setVobizAuthId(e.target.value)}
            className={inputCls}
            style={inputStyle}
            placeholder="MA_XXXXXXXX"
          />
        </Field>
        <SecretField
          label="Vobiz Auth Token"
          saved={previews?.vobiz_token_last4}
          value={vobizAuthToken}
          onChange={setVobizAuthToken}
        />
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
