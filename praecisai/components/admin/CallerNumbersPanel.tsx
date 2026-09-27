'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { PhoneCall, RefreshCcw, ShieldCheck } from 'lucide-react';
import {
  useAdminCallerNumbers,
  useAdminVerifyCallerNumbers,
  useAdminTestCallerNumber,
} from '../../lib/api/hooks';

type Tone = 'good' | 'warn' | 'bad' | 'muted';
const TONES: Record<Tone, { bg: string; fg: string }> = {
  good: { bg: '#2E7D3218', fg: '#2E7D32' },
  warn: { bg: '#B8860B18', fg: '#B8860B' },
  bad: { bg: '#C6282818', fg: '#C62828' },
  muted: { bg: 'rgba(176,137,104,0.15)', fg: 'var(--walnut)' },
};

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const t = TONES[tone];
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: t.bg, color: t.fg, border: `1px solid ${t.fg}40` }}
    >
      {children}
    </span>
  );
}

/** What Vobiz says about the number, as short badges. */
function vobizPills(c: any): Array<[Tone, string]> {
  if (!c?.vobiz_checked_at) return [['muted', 'Vobiz: not checked']];
  if (c.vobiz_error) return [['warn', 'Vobiz: check failed']];
  if (!c.vobiz_found) return [['bad', 'Not on this Vobiz account']];
  const out: Array<[Tone, string]> = [];
  out.push(c.vobiz_status === 'active' ? ['good', 'Active'] : ['bad', `Status: ${c.vobiz_status}`]);
  if (c.vobiz_blocked) out.push(['bad', 'Blocked']);
  if (c.vobiz_voice_enabled === false) out.push(['bad', 'Voice off']);
  if (c.vobiz_trial) out.push(['warn', 'Trial number']);
  if (c.vobiz_kyc_pending) out.push(['warn', 'Aadhaar KYC pending']);
  return out;
}

function testPill(c: any): [Tone, string] | null {
  if (!c?.test_status) return null;
  switch (c.test_status) {
    case 'connected':
      return ['good', 'Test call connected'];
    case 'ringing':
    case 'dispatched':
      return ['warn', 'Test call placed'];
    default:
      return ['bad', 'Test call failed'];
  }
}

export function CallerNumbersPanel({ tenantId }: { tenantId: string }) {
  const { data, isLoading } = useAdminCallerNumbers(tenantId);
  const verify = useAdminVerifyCallerNumbers(tenantId);
  const test = useAdminTestCallerNumber(tenantId);
  const [to, setTo] = useState('');
  const [testing, setTesting] = useState<string | null>(null);

  const numbers: any[] = data?.numbers ?? [];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="text-sm font-semibold text-[var(--dark-brown)] flex items-center gap-2">
          <ShieldCheck size={15} /> Caller numbers
        </h2>
        <button
          onClick={() =>
            verify.mutate(undefined, {
              onSuccess: () => toast.success('Vobiz status refreshed'),
              onError: (e: any) => toast.error(e.message),
            })
          }
          disabled={!data?.vobiz_connected || verify.isPending || numbers.length === 0}
          title={data?.vobiz_connected ? '' : 'No Vobiz login on the server or this business'}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border text-[var(--mahogany)] disabled:opacity-40"
          style={{ borderColor: 'var(--caramel)' }}
        >
          <RefreshCcw size={12} className={verify.isPending ? 'animate-spin' : ''} /> Check on Vobiz
        </button>
      </div>
      <p className="text-[11px] text-[var(--walnut)] mb-3">
        A number is used only if Vobiz lists it as active and not blocked (or it has never been checked).
        A test call proves it can dial out through this business&apos;s Bolna account.
      </p>

      {isLoading ? (
        <p className="text-xs text-[var(--walnut)]">Loading…</p>
      ) : numbers.length === 0 ? (
        <p className="text-xs text-[var(--walnut)]">No caller ID set: calls go out from Bolna&apos;s shared pool.</p>
      ) : (
        <>
          <ul className="space-y-2.5">
            {numbers.map((n) => {
              const c = n.check;
              const tp = testPill(c);
              return (
                <li key={n.phone} className="rounded-lg border p-2.5 space-y-1.5" style={{ borderColor: 'rgba(176,137,104,0.35)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-[var(--dark-brown)]">{n.phone}</span>
                    <div className="flex items-center gap-1.5">
                      <Pill tone={n.role === 'PRIMARY' ? 'good' : 'muted'}>{n.role === 'PRIMARY' ? 'Primary' : 'Backup'}</Pill>
                      {!n.usable && <Pill tone="bad">Skipped</Pill>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {vobizPills(c).map(([tone, label]) => (
                      <Pill key={label} tone={tone}>{label}</Pill>
                    ))}
                    {tp && <Pill tone={tp[0]}>{tp[1]}</Pill>}
                  </div>
                  {(c?.vobiz_error || c?.test_detail) && (
                    <p className="text-[10px] text-[var(--walnut)] break-words">{c.vobiz_error || c.test_detail}</p>
                  )}
                  <button
                    onClick={() => {
                      setTesting(n.phone);
                      test.mutate(
                        { phone: n.phone, to },
                        {
                          onSuccess: () => toast.success(`Test call placed from ${n.phone}`, { description: `Your phone ${to} should ring shortly.` }),
                          onError: (e: any) => toast.error(e.message),
                          onSettled: () => setTesting(null),
                        },
                      );
                    }}
                    disabled={!to.trim() || test.isPending}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--mahogany)] disabled:opacity-40"
                  >
                    <PhoneCall size={12} className={testing === n.phone ? 'animate-pulse' : ''} />
                    {testing === n.phone ? 'Calling…' : 'Test call from this number'}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 rounded-lg p-2.5 text-[11px] text-[var(--walnut)]" style={{ background: 'var(--sand)' }}>
            <p className="font-semibold text-[var(--dark-brown)] mb-1">
              Shared pool ({(data?.shared_pool ?? []).length})
            </p>
            {(data?.shared_pool ?? []).length === 0 ? (
              <p>No other business on this Bolna account has caller numbers to borrow.</p>
            ) : (
              <>
                <p className="mb-1">
                  Used only after every number above is skipped for a call. Callbacks to these numbers reach
                  the owning business&apos;s agent, and they show that business&apos;s Truecaller name.
                </p>
                <ul className="space-y-0.5">
                  {data.shared_pool.map((s: any) => (
                    <li key={s.phone} className="flex justify-between gap-2">
                      <span className="font-mono">{s.phone}</span>
                      <span className="truncate">{s.owner}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="mt-3">
            <label className="block text-[10px] font-semibold text-[var(--walnut)] uppercase tracking-wider mb-1">
              Ring this phone for test calls
            </label>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="+919876543210 (your own mobile)"
              className="w-full px-3 py-2 rounded-lg text-xs border bg-[var(--surface-warm)] text-[var(--dark-brown)]"
              style={{ borderColor: 'var(--caramel)' }}
            />
            <p className="text-[10px] text-[var(--walnut)] mt-1">
              Places a real call through Bolna (billed as a normal short call). Check the number your phone shows.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
