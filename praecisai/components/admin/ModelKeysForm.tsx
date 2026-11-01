'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAdminUpdateModelKeys } from '../../lib/api/hooks';
import { Field, SecretField, inputCls, inputStyle, splitNumbers, type KeyPreviews } from './TenantForm';

/**
 * Connection settings for model B or C: the same fields as model A's in the
 * tenant settings form (Bolna key + agent, caller IDs, Vobiz, AiSensy). An
 * empty field uses model A's value; a model with its own Bolna key uses only
 * its own caller IDs. Untouched fields are left out of the save.
 */
export function ModelKeysForm({
  tenantId,
  tier,
  previews,
}: {
  tenantId: string;
  tier: 'B' | 'C';
  previews?: KeyPreviews;
}) {
  const save = useAdminUpdateModelKeys(tenantId, tier);
  const [bolnaApiKey, setBolnaApiKey] = useState<string | undefined>(undefined);
  const [bolnaAgentId, setBolnaAgentId] = useState(previews?.bolna_agent_id ?? '');
  const [bolnaFromNumber, setBolnaFromNumber] = useState(previews?.bolna_from_number ?? '');
  const savedBackups = (previews?.backup_from_numbers ?? []).join('\n');
  const [backupNumbers, setBackupNumbers] = useState(savedBackups);
  const [vobizAuthId, setVobizAuthId] = useState(previews?.vobiz_auth_id ?? '');
  const [vobizAuthToken, setVobizAuthToken] = useState<string | undefined>(undefined);
  const [aisensyApiKey, setAisensyApiKey] = useState<string | undefined>(undefined);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...(bolnaApiKey !== undefined ? { bolnaApiKey } : {}),
      ...(bolnaAgentId.trim() !== (previews?.bolna_agent_id ?? '') ? { bolnaAgentId: bolnaAgentId.trim() } : {}),
      ...(bolnaFromNumber.trim() !== (previews?.bolna_from_number ?? '')
        ? { bolnaFromNumber: bolnaFromNumber.trim() }
        : {}),
      ...(backupNumbers.trim() !== savedBackups.trim() ? { backupFromNumbers: splitNumbers(backupNumbers) } : {}),
      ...(vobizAuthId.trim() !== (previews?.vobiz_auth_id ?? '') ? { vobizAuthId: vobizAuthId.trim() } : {}),
      ...(vobizAuthToken !== undefined ? { vobizAuthToken } : {}),
      ...(aisensyApiKey !== undefined ? { aisensyApiKey } : {}),
    };
    if (Object.keys(payload).length === 0) return toast.info('Nothing changed');
    save.mutate(payload, {
      onSuccess: () => toast.success(`Model ${tier} settings saved`),
      onError: (err: any) => toast.error(err.message),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SecretField label="Bolna API key" saved={previews?.bolna_key_last4} value={bolnaApiKey} onChange={setBolnaApiKey} />
        <Field label="Bolna agent id" hint={`Required to switch this business to Model ${tier}`}>
          <input value={bolnaAgentId} onChange={(e) => setBolnaAgentId(e.target.value)} className={inputCls} style={inputStyle} />
        </Field>
      </div>
      <p className="text-[11px] text-[var(--walnut)] -mt-2">
        Leave the API key empty if this agent is on the same Bolna account as Model A.
      </p>

      <Field
        label="Outbound caller ID"
        hint="Customers see it when the AI calls on this model. Empty: Model A's caller ID (same Bolna account only)."
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
        hint="One per line, in the order to use them. Same skip rules as Model A. Empty: Model A's backups (same Bolna account only). Each number can belong to one business only."
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
        <Field label="Vobiz Auth ID" hint="Empty: Model A's Vobiz login, else the shared login on the server.">
          <input
            value={vobizAuthId}
            onChange={(e) => setVobizAuthId(e.target.value)}
            className={inputCls}
            style={inputStyle}
            placeholder="MA_XXXXXXXX"
          />
        </Field>
        <SecretField label="Vobiz Auth Token" saved={previews?.vobiz_token_last4} value={vobizAuthToken} onChange={setVobizAuthToken} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SecretField label="AiSensy API key" saved={previews?.aisensy_key_last4} value={aisensyApiKey} onChange={setAisensyApiKey} />
        <p className="text-[11px] text-[var(--walnut)] sm:pt-7">
          WhatsApp statements and reminders go out on this key while the business is on Model {tier}. Empty: Model
          A&apos;s AiSensy key.
        </p>
      </div>

      <button
        type="submit"
        disabled={save.isPending}
        className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
        style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
      >
        {save.isPending ? 'Saving…' : `Save Model ${tier} settings`}
      </button>
    </form>
  );
}
