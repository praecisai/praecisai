'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  useAdminNotifications,
  useAdminTenants,
  useAdminMarkNotificationRead,
} from '../../../lib/api/hooks';
import { AlertTriangle, PauseCircle, BadgeCheck, MessageCircleWarning, Check } from 'lucide-react';
import { Select } from '../../../components/ui/Select';

const KIND_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  BOLNA_LOW: { label: 'Bolna low balance', color: '#E65100', icon: AlertTriangle },
  AISENSY_LOW: { label: 'AiSensy issue', color: '#B8860B', icon: MessageCircleWarning },
  MANDATE_FAILED: { label: 'Mandate failed', color: '#C62828', icon: PauseCircle },
  DEBIT_SUCCESS: { label: 'Debit success', color: '#2E7D32', icon: BadgeCheck },
};

export default function AdminNotificationsPage() {
  const [tenantId, setTenantId] = useState<string>('');
  const { data: tenants } = useAdminTenants();
  const { data: notifications, isLoading } = useAdminNotifications(tenantId || undefined);
  const markRead = useAdminMarkNotificationRead();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--dark-brown)]">Notifications</h1>
          <p className="text-xs text-[var(--walnut)]">Low credits, AiSensy issues, mandate failures and debits across all tenants</p>
        </div>
        <Select
          value={tenantId}
          onChange={setTenantId}
          className="w-56"
          options={[
            { value: '', label: 'All tenants' },
            ...(tenants ?? []).map((t: any) => ({ value: t.id, label: t.name })),
          ]}
        />
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-[var(--walnut)]">Loading…</p>
        ) : notifications?.length ? (
          notifications.map((n: any) => {
            const meta = KIND_META[n.kind] ?? KIND_META.BOLNA_LOW;
            const Icon = meta.icon;
            return (
              <div
                key={n.id}
                className="glass-card px-4 py-3 flex items-start gap-3"
                style={{ opacity: n.read_at ? 0.6 : 1 }}
              >
                <Icon size={17} className="flex-shrink-0 mt-0.5" style={{ color: meta.color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</span>
                    <span className="text-xs text-[var(--walnut)]">· {n.business?.name}</span>
                    <span className="text-[11px] text-[var(--walnut)]">
                      · {new Date(n.created_at).toLocaleString('en-IN')}
                    </span>
                    {!n.resolved_at && ['BOLNA_LOW', 'AISENSY_LOW', 'MANDATE_FAILED'].includes(n.kind) && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: `${meta.color}18`, color: meta.color }}
                      >
                        OPEN
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--dark-brown)] mt-1">{n.message}</p>
                </div>
                {!n.read_at && (
                  <button
                    onClick={() =>
                      markRead.mutate(n.id, { onError: (e: any) => toast.error(e.message) })
                    }
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md border text-[var(--mahogany)] flex-shrink-0"
                    style={{ borderColor: 'var(--caramel)' }}
                  >
                    <Check size={12} /> Mark read
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-[var(--walnut)]">No notifications{tenantId ? ' for this tenant' : ''} yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
