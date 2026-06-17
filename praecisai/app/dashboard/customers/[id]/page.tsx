'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCustomer } from '../../../../lib/api/hooks';
import { TopHeader } from '../../../../components/layout/Sidebar';
import { SegmentBadge, StatusBadge } from '../../../../components/shared/SegmentBadge';
import { formatINR, formatDate } from '../../../../lib/utils/format';
import { ArrowLeft, Phone, Mail, MapPin, Star, FileText, IndianRupee, MessageSquare } from 'lucide-react';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-white/4 last:border-0">
      <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</span>
      <span className="text-sm text-white text-right">{value}</span>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading } = useCustomer(id);

  if (isLoading) {
    return (
      <div>
        <TopHeader title="Customer Detail" />
        <div className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-6">
              <div className="skeleton h-5 w-48 mb-4" />
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="skeleton h-4 w-full" />
              ))}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div>
        <TopHeader title="Customer Not Found" />
        <div className="p-6 text-center py-20 text-slate-400">
          <p className="text-4xl mb-4">🔍</p>
          <p>Customer not found</p>
          <Link href="/dashboard/customers" className="text-blue-400 text-sm hover:underline mt-2 block">
            ← Back to customers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopHeader title={customer.customer_name} subtitle={customer.city ?? 'No city'} />
      <div className="p-6 space-y-5">
        {/* Back */}
        <Link href="/dashboard/customers"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Back to Customers
        </Link>

        {/* Header card */}
        <div className="glass-card p-6 flex flex-col sm:flex-row items-start gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            {customer.customer_name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white">{customer.customer_name}</h2>
              {customer.is_vip && <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full">⭐ VIP</span>}
              {customer.outstanding?.segment && <SegmentBadge segment={customer.outstanding.segment} />}
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {customer.phone && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Phone size={12} /> {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Mail size={12} /> {customer.email}
                </span>
              )}
              {customer.city && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <MapPin size={12} /> {customer.city}
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {(customer.tags ?? []).map((tag: string) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{tag}</span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-1">Total Outstanding</p>
            <p className={`text-2xl font-bold ${(customer.outstanding?.total_due ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {formatINR(customer.outstanding?.total_due ?? 0)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{customer.outstanding?.aging_bucket ?? '—'} days bucket</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Invoices */}
          <div className="lg:col-span-2 glass-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5">
              <FileText size={15} className="text-blue-400" />
              <h3 className="text-sm font-semibold text-white">Invoices</h3>
              <span className="text-xs text-slate-500">({customer.invoices?.length ?? 0})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table w-full">
                <thead>
                  <tr>
                    <th className="text-left">Invoice No.</th>
                    <th className="text-left">Date</th>
                    <th className="text-right">Due Amount</th>
                    <th className="text-left">Days Overdue</th>
                    <th className="text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(customer.invoices ?? []).length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-500 text-sm">No invoices</td></tr>
                  ) : (customer.invoices ?? []).map((inv: any) => (
                    <tr key={inv.id}>
                      <td className="text-sm font-mono text-blue-400">{inv.invoice_number}</td>
                      <td className="text-sm text-slate-400">{formatDate(inv.invoice_date)}</td>
                      <td className="text-right">
                        <span className={`text-sm font-semibold ${inv.due_amount < 0 ? 'text-purple-400' : inv.due_amount === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatINR(inv.due_amount)}
                        </span>
                      </td>
                      <td className="text-sm text-slate-400">{inv.days_overdue}d</td>
                      <td><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side info */}
          <div className="space-y-4">
            {/* Outstanding summary */}
            {customer.outstanding && (
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <IndianRupee size={14} className="text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white">Outstanding</h3>
                </div>
                <InfoRow label="Total Due" value={<span className="font-bold text-red-400">{formatINR(customer.outstanding.total_due)}</span>} />
                <InfoRow label="Segment" value={<SegmentBadge segment={customer.outstanding.segment} />} />
                <InfoRow label="Aging Bucket" value={`${customer.outstanding.aging_bucket} days`} />
                <InfoRow label="Status" value={<StatusBadge status={customer.outstanding.status} />} />
              </div>
            )}

            {/* Promises to Pay */}
            {(customer.promises_to_pay ?? []).length > 0 && (
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-white mb-3">Promises to Pay</h3>
                {customer.promises_to_pay.slice(0, 3).map((ptp: any) => (
                  <div key={ptp.id} className="py-2 border-b border-white/4 last:border-0">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">{formatDate(ptp.promised_date)}</span>
                      <StatusBadge status={ptp.status} />
                    </div>
                    <p className="text-sm font-semibold text-white mt-1">{formatINR(ptp.promised_amount)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recent interactions */}
            {(customer.call_logs ?? []).length > 0 && (
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={14} className="text-purple-400" />
                  <h3 className="text-sm font-semibold text-white">Recent Calls</h3>
                </div>
                {customer.call_logs.slice(0, 3).map((log: any) => (
                  <div key={log.id} className="py-2 border-b border-white/4 last:border-0">
                    <div className="flex justify-between items-center">
                      <StatusBadge status={log.call_status} />
                      <span className="text-xs text-slate-500">{formatDate(log.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
