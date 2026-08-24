'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAdminTenants, useAdminDeleteTenant } from '../../../lib/api/hooks';
import {
  Plus, AlertTriangle, CheckCircle2, MinusCircle, Search, X, Trash2,
} from 'lucide-react';

const ONBOARDING_COLORS: Record<string, string> = {
  PENDING: '#6B7280',
  KEYS_ADDED: '#B8860B',
  PAID: '#2E7D32',
  ACTIVE: '#2E7D32',
};

/** Onboarding stages, in the order a tenant actually moves through them. */
const ONBOARDING_STAGES = ['PENDING', 'KEYS_ADDED', 'PAID', 'ACTIVE'] as const;

/**
 * Filter tabs. "Trial" cuts across onboarding stage (a tenant on a paid trial
 * is usually still KEYS_ADDED), so it is its own tab rather than a stage.
 */
type StatusFilter = 'ALL' | (typeof ONBOARDING_STAGES)[number] | 'TRIAL';

const FILTER_LABELS: Record<StatusFilter, string> = {
  ALL: 'All',
  PENDING: 'Pending',
  KEYS_ADDED: 'Keys added',
  PAID: 'Paid',
  ACTIVE: 'Active',
  TRIAL: 'On trial',
};

function matchesFilter(t: any, f: StatusFilter): boolean {
  if (f === 'ALL') return true;
  if (f === 'TRIAL') return !!t.trial_active;
  return t.onboarding_status === f;
}

const MANDATE_COLORS: Record<string, string> = {
  ACTIVE: '#2E7D32',
  PENDING: '#B8860B',
  HALTED: '#C62828',
  CANCELLED: '#6B7280',
};

function Dot({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 size={15} style={{ color: '#2E7D32' }} />
  ) : (
    <MinusCircle size={15} style={{ color: '#B08968' }} />
  );
}

export default function AdminTenantsPage() {
  const router = useRouter();
  const { data: tenants, isLoading } = useAdminTenants();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  // Tenant queued for deletion; the modal double-confirms by name
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const deleteTenant = useAdminDeleteTenant();

  // The whole tenant list is already loaded, so filtering happens here:
  // instant, no extra request. Matches name, owner email, phone and status.
  const filtered = useMemo(() => {
    const list = (tenants ?? []).filter((t: any) => matchesFilter(t, status));
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((t: any) =>
      [t.name, t.owner_email, t.owner_phone, t.onboarding_status, t.mandate_status]
        .filter(Boolean)
        .some((f: string) => String(f).toLowerCase().includes(q)),
    );
  }, [tenants, search, status]);

  // Counts are of the FULL list, so a tab always shows how many exist in that
  // stage rather than how many survive the current text search.
  const counts = useMemo(() => {
    const list = tenants ?? [];
    return {
      ALL: list.length,
      PENDING: list.filter((t: any) => t.onboarding_status === 'PENDING').length,
      KEYS_ADDED: list.filter((t: any) => t.onboarding_status === 'KEYS_ADDED').length,
      PAID: list.filter((t: any) => t.onboarding_status === 'PAID').length,
      ACTIVE: list.filter((t: any) => t.onboarding_status === 'ACTIVE').length,
      TRIAL: list.filter((t: any) => t.trial_active).length,
    } as Record<StatusFilter, number>;
  }, [tenants]);

  const filtersOn = status !== 'ALL' || !!search.trim();

  function closeDelete() {
    setDeleteTarget(null);
    setDeleteInput('');
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteTenant.mutate(
      { id: deleteTarget.id, confirmName: deleteInput },
      {
        onSuccess: () => {
          toast.success(`${deleteTarget.name} deleted`);
          closeDelete();
        },
        onError: (e: any) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-[var(--dark-brown)]">Tenants</h1>
          <p className="text-xs text-[var(--walnut)]">
            All businesses on the platform with live health
            {filtersOn && ` · ${filtered.length} of ${tenants?.length ?? 0} shown`}
          </p>
        </div>
        <Link
          href="/admin/tenants/new"
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold flex-shrink-0 whitespace-nowrap"
          style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
        >
          <Plus size={15} /> New tenant
        </Link>
      </div>

      {/* Search + onboarding-stage filter */}
      <div className="glass-card p-3 space-y-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg border"
          style={{ borderColor: 'var(--caramel)', background: 'var(--surface-warm)' }}
        >
          <Search size={14} className="flex-shrink-0" style={{ color: 'var(--walnut)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenants by business name, owner email, mobile or status…"
            className="bg-transparent border-none outline-none text-sm w-full"
            style={{ color: 'var(--dark-brown)' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="p-0.5 rounded flex-shrink-0"
              style={{ color: 'var(--walnut)' }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(['ALL', ...ONBOARDING_STAGES, 'TRIAL'] as StatusFilter[]).map((f) => {
            const on = status === f;
            const tint = f === 'ALL' || f === 'TRIAL' ? 'var(--mahogany)' : ONBOARDING_COLORS[f];
            return (
              <button
                key={f}
                onClick={() => setStatus(f)}
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full border transition-colors"
                style={{
                  background: on ? tint : 'transparent',
                  color: on ? '#fff' : 'var(--walnut)',
                  borderColor: on ? tint : 'var(--caramel)',
                }}
              >
                {FILTER_LABELS[f]}
                <span className={on ? 'opacity-80' : 'opacity-60'}> · {counts[f]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass-card overflow-x-auto">
        {isLoading ? (
          <p className="text-sm text-[var(--walnut)] p-6 text-center">Loading tenants…</p>
        ) : (
          <table className="data-table w-full min-w-[960px]">
            <thead>
              <tr>
                <th className="text-left">Business</th>
                <th className="text-left">Onboarding</th>
                <th className="text-left">Keys</th>
                <th className="text-right">Bolna balance</th>
                <th className="text-left">Mandate</th>
                <th className="text-right">Calls this month</th>
                <th className="text-left">Campaigns</th>
                <th className="text-right">Alerts</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t: any) => (
                <tr
                  key={t.id}
                  onClick={() => router.push(`/admin/tenants/${t.id}`)}
                  className="cursor-pointer hover:bg-[var(--sand)] transition-colors"
                >
                  <td>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-[var(--dark-brown)]">{t.name}</p>
                      {t.is_new && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                          style={{ background: '#2E7D32', color: '#fff' }}
                        >
                          New
                        </span>
                      )}
                      {t.paid_online && (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: '#7F553918', color: 'var(--mahogany)', border: '1px solid #7F553940' }}
                          title={`Self-registered and paid online${t.paid_online_type ? ` (${t.paid_online_type.toLowerCase()})` : ''}`}
                        >
                          Self-serve
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--walnut)]">
                      {t.owner_email ? `${t.owner_email} · ` : ''}
                      {t.owner_phone ? `${t.owner_phone} · ` : ''}
                      {t.customers} customers
                    </p>
                  </td>
                  <td>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: `${ONBOARDING_COLORS[t.onboarding_status]}18`,
                        color: ONBOARDING_COLORS[t.onboarding_status],
                        border: `1px solid ${ONBOARDING_COLORS[t.onboarding_status]}40`,
                      }}
                    >
                      {t.onboarding_status}
                    </span>
                    {t.trial_active && (
                      <p className="text-[10px] mt-1 font-semibold" style={{ color: '#B8860B' }}>
                        TRIAL till {new Date(t.trial_ends_at).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5" title="Bolna · AiSensy">
                      <Dot ok={t.bolna_connected} />
                      <Dot ok={t.aisensy_connected} />
                    </div>
                  </td>
                  <td className="text-right">
                    {t.bolna_balance_usd != null ? (
                      <span
                        className="text-sm font-semibold"
                        style={{
                          color:
                            t.bolna_balance_usd < t.low_balance_threshold_usd ? '#C62828' : 'var(--dark-brown)',
                        }}
                      >
                        ${t.bolna_balance_usd.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--walnut)]">-</span>
                    )}
                  </td>
                  <td>
                    {t.mandate_status ? (
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: `${MANDATE_COLORS[t.mandate_status]}18`,
                          color: MANDATE_COLORS[t.mandate_status],
                          border: `1px solid ${MANDATE_COLORS[t.mandate_status]}40`,
                        }}
                      >
                        {t.mandate_status}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--walnut)]">-</span>
                    )}
                  </td>
                  <td className="text-right text-sm text-[var(--dark-brown)]">{t.calls_this_month}</td>
                  <td className="text-xs text-[var(--walnut)]">
                    {t.campaigns_paused ? (
                      <span className="font-semibold" style={{ color: '#C62828' }}>PAUSED</span>
                    ) : (
                      `${t.campaigns_active} active`
                    )}
                  </td>
                  <td className="text-right">
                    {t.open_alerts > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: '#E65100' }}>
                        <AlertTriangle size={13} /> {t.open_alerts}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--walnut)]">-</span>
                    )}
                  </td>
                  <td className="text-right">
                    {/* stopPropagation: the whole row navigates to the detail
                        page, and a delete click must not do both. */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(t);
                        setDeleteInput('');
                      }}
                      className="p-1.5 rounded-lg border transition-colors hover:bg-[#C6282810]"
                      style={{ borderColor: '#C6282840', color: '#C62828' }}
                      title={`Delete ${t.name}`}
                      aria-label={`Delete ${t.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-sm text-[var(--walnut)] py-8">
                    {filtersOn
                      ? 'No tenants match these filters'
                      : 'No tenants yet: create the first one'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirmation. The backend rejects anything but an exact name
          match, so the typed name is a real guard, not just friction. */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(38,26,18,0.45)' }}
          onClick={closeDelete}
        >
          <div
            className="glass-card p-5 w-full max-w-md space-y-3"
            style={{ border: '1px solid #C6282840' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="text-sm font-semibold flex items-center gap-2"
              style={{ color: '#C62828' }}
            >
              <AlertTriangle size={15} /> Delete tenant
            </h2>
            <p className="text-xs text-[var(--walnut)]">
              This permanently deletes <b>{deleteTarget.name}</b> with ALL its customers, invoices,
              call logs and billing history. Its allowlist entries go too. This cannot be undone.
            </p>
            <p className="text-xs text-[var(--walnut)]">
              Type <b>{deleteTarget.name}</b> to confirm:
            </p>
            <input
              autoFocus
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && deleteInput === deleteTarget.name) confirmDelete();
                if (e.key === 'Escape') closeDelete();
              }}
              placeholder={deleteTarget.name}
              className="w-full px-3 py-2 rounded-lg text-sm border bg-[var(--surface-warm)] text-[var(--dark-brown)]"
              style={{ borderColor: '#C6282860' }}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={closeDelete}
                className="px-3 py-2 rounded-lg text-xs font-semibold border text-[var(--walnut)]"
                style={{ borderColor: 'var(--caramel)' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteInput !== deleteTarget.name || deleteTenant.isPending}
                className="px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                style={{ background: '#C62828', color: '#fff' }}
              >
                {deleteTenant.isPending ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
