'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAdminBilling, useAdminInvoicePdf, formatPaise } from '../../../lib/api/hooks';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';

const SUB_COLORS: Record<string, string> = {
  ACTIVE: '#2E7D32',
  PENDING: '#B8860B',
  HALTED: '#C62828',
  CANCELLED: '#6B7280',
};

function fmtDate(d: string | null | undefined) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN');
}

export default function AdminBillingPage() {
  const { data: tenants, isLoading } = useAdminBilling();
  const pdf = useAdminInvoicePdf();
  const [open, setOpen] = useState<string | null>(null);

  async function openInvoice(id: string) {
    try {
      const { url } = await pdf.mutateAsync(id);
      window.open(url, '_blank');
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-[var(--dark-brown)]">Billing</h1>
        <p className="text-xs text-[var(--walnut)]">Per-tenant payments, subscription status and invoices</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--walnut)]">Loading…</p>
      ) : (
        (tenants ?? []).map((t: any) => {
          const expanded = open === t.id;
          return (
            <div key={t.id} className="glass-card">
              <button
                onClick={() => setOpen(expanded ? null : t.id)}
                className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="text-sm font-semibold text-[var(--dark-brown)] truncate">{t.name}</span>
                  <span className="text-[11px] text-[var(--walnut)]">· {t.onboarding_status}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {t.subscription && (
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: `${SUB_COLORS[t.subscription.status]}18`,
                        color: SUB_COLORS[t.subscription.status],
                        border: `1px solid ${SUB_COLORS[t.subscription.status]}40`,
                      }}
                    >
                      {t.subscription.status}
                    </span>
                  )}
                  <span className="text-xs text-[var(--walnut)]">
                    Next debit: {fmtDate(t.subscription?.next_debit_date)}
                  </span>
                </div>
              </button>

              {expanded && (
                <div className="px-4 pb-4 space-y-4">
                  {/* Payments */}
                  <div>
                    <p className="text-xs font-semibold text-[var(--walnut)] uppercase tracking-wider mb-2">Payments</p>
                    {t.payments?.length ? (
                      <div className="overflow-x-auto">
                        <table className="data-table w-full min-w-[720px]">
                          <thead>
                            <tr>
                              <th className="text-left">Type</th>
                              <th className="text-left">Status</th>
                              <th className="text-left">Paid at</th>
                              <th className="text-left">Coupon</th>
                              <th className="text-right">Setup</th>
                              <th className="text-right">Subscription</th>
                              <th className="text-right">GST</th>
                              <th className="text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.payments.map((p: any) => (
                              <tr key={p.id}>
                                <td className="text-xs text-[var(--dark-brown)]">{p.type}</td>
                                <td className="text-xs text-[var(--walnut)]">{p.status}</td>
                                <td className="text-xs text-[var(--walnut)]">{fmtDate(p.paid_at)}</td>
                                <td className="text-xs text-[var(--walnut)]">
                                  {p.coupon ? `${p.coupon.code} (${p.coupon.percent}%)` : '-'}
                                </td>
                                <td className="text-right text-xs">{formatPaise(p.setup_component)}</td>
                                <td className="text-right text-xs">{formatPaise(p.subscription_component)}</td>
                                <td className="text-right text-xs">{formatPaise(p.gst_amount)}</td>
                                <td className="text-right text-sm font-semibold text-[var(--dark-brown)]">
                                  {formatPaise(p.total_amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--walnut)]">No payments yet</p>
                    )}
                  </div>

                  {/* Invoices */}
                  <div>
                    <p className="text-xs font-semibold text-[var(--walnut)] uppercase tracking-wider mb-2">Invoices</p>
                    {t.invoices?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {t.invoices.map((inv: any) => (
                          <button
                            key={inv.id}
                            onClick={() => openInvoice(inv.id)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium text-[var(--dark-brown)] hover:bg-[var(--sand)]"
                            style={{ borderColor: 'var(--caramel)' }}
                          >
                            <Download size={12} className="text-[var(--mahogany)]" />
                            {inv.invoice_number} · {formatPaise(inv.total)}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--walnut)]">No invoices yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
