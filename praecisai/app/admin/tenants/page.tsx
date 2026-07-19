'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminTenants } from '../../../lib/api/hooks';
import { Plus, AlertTriangle, CheckCircle2, MinusCircle } from 'lucide-react';

const ONBOARDING_COLORS: Record<string, string> = {
  PENDING: '#6B7280',
  KEYS_ADDED: '#B8860B',
  PAID: '#2E7D32',
  ACTIVE: '#2E7D32',
};

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[var(--dark-brown)]">Tenants</h1>
          <p className="text-xs text-[var(--walnut)]">All businesses on the platform with live health</p>
        </div>
        <Link
          href="/admin/tenants/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
          style={{ background: 'var(--mahogany)', color: 'var(--cream)' }}
        >
          <Plus size={15} /> New tenant
        </Link>
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
              </tr>
            </thead>
            <tbody>
              {(tenants ?? []).map((t: any) => (
                <tr
                  key={t.id}
                  onClick={() => router.push(`/admin/tenants/${t.id}`)}
                  className="cursor-pointer hover:bg-[var(--sand)] transition-colors"
                >
                  <td>
                    <p className="text-sm font-medium text-[var(--dark-brown)]">{t.name}</p>
                    <p className="text-[11px] text-[var(--walnut)]">{t.customers} customers</p>
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
                </tr>
              ))}
              {tenants?.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-sm text-[var(--walnut)] py-8">
                    No tenants yet: create the first one
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
