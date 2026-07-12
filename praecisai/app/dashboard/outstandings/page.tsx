'use client';

import { useState, useEffect } from 'react';
import {
  useOutstandings,
  useAgingBreakdown,
  useCallCustomer,
  useSendWhatsAppStatement,
  useUpdateCustomerPhone,
  useCallSegment,
  useSendSegmentStatements,
} from '../../../lib/api/hooks';
import { TopHeader } from '../../../components/layout/Sidebar';
import { Select } from '../../../components/ui/Select';
import { SegmentBadge, StatusBadge } from '../../../components/shared/SegmentBadge';
import { formatINR, formatNumber, getAgingColor } from '../../../lib/utils/format';
import { ChevronLeft, ChevronRight, Phone, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

const SEGMENTS = ['Soft Reminder', 'Follow-up', 'Strong Follow-up', 'Escalation', 'Cleared'];
const BUCKETS = ['0-60', '61-120', '121-180', '181+'];

// Inline phone editor — most Tally imports carry no phone numbers, so they
// get filled in right here before the first call/message.
function PhoneCell({ customerId, phone }: { customerId: string; phone: string | null }) {
  const [local, setLocal] = useState(phone ?? '');
  const updatePhone = useUpdateCustomerPhone();
  useEffect(() => { setLocal(phone ?? ''); }, [phone]);

  const commit = () => {
    const trimmed = local.trim();
    if (trimmed === (phone ?? '')) return;
    updatePhone.mutate(
      { customerId, phone: trimmed },
      {
        onSuccess: () => toast.success('Phone number saved'),
        onError: (e: any) => toast.error('Could not save phone number', { description: e.message }),
      },
    );
  };

  return (
    <input
      type="text"
      value={local}
      placeholder="+91…"
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      className="w-32 bg-transparent text-sm text-slate-300 rounded border border-transparent px-2 py-1 hover:border-white/10 focus:border-[var(--mahogany)] focus:outline-none"
    />
  );
}

export default function OutstandingsPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20 } as any);
  const { data, isLoading } = useOutstandings(filters);
  const { data: aging = [] } = useAgingBreakdown();
  const callCustomer = useCallCustomer();
  const sendWhatsApp = useSendWhatsAppStatement();
  const callSegment = useCallSegment();
  const sendSegment = useSendSegmentStatements();
  const [actingOn, setActingOn] = useState<string | null>(null);

  const toastBulkResult = (d: any, verb: string) => {
    let description = '';
    if (d?.skipped?.length) {
      description = `Skipped: ${d.skipped.slice(0, 5).map((s: any) => `${s.customer} (${s.reason})`).join('; ')}`;
      if (d.skipped.length > 5) description += ` …and ${d.skipped.length - 5} more`;
    }
    toast.success(d?.message ?? `${verb} done`, description ? { description, duration: 9000 } : undefined);
  };

  const handleBulkCall = async () => {
    if (!filters.segment) return;
    if (!confirm(`Start AI recovery calls to ALL "${filters.segment}" customers that have a phone number?`)) return;
    try {
      const res = await callSegment.mutateAsync(filters.segment);
      toastBulkResult(res.data?.data ?? res.data, 'Bulk calling');
    } catch (e: any) {
      toast.error('Bulk calling failed', { description: e.message });
    }
  };

  const handleBulkWhatsApp = async () => {
    if (!filters.segment) return;
    if (!confirm(`Send statement PDFs on WhatsApp to ALL "${filters.segment}" customers that have a phone number?`)) return;
    try {
      const res = await sendSegment.mutateAsync(filters.segment);
      toastBulkResult(res.data?.data ?? res.data, 'Bulk WhatsApp');
    } catch (e: any) {
      toast.error('Bulk WhatsApp failed', { description: e.message });
    }
  };

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const handleCall = async (row: any) => {
    const name = row.customer?.customer_name ?? 'this customer';
    if (!row.customer?.phone) return toast.warning('Add a phone number first');
    if (!confirm(`Start an AI recovery call to ${name} (${row.customer.phone})?`)) return;
    setActingOn(row.id + ':call');
    try {
      const res = await callCustomer.mutateAsync(row.customer.id);
      toast.success(res.data?.data?.message ?? res.data?.message ?? 'Call queued');
    } catch (e: any) {
      toast.error('Call failed', { description: e.message });
    } finally {
      setActingOn(null);
    }
  };

  const handleWhatsApp = async (row: any) => {
    const name = row.customer?.customer_name ?? 'this customer';
    if (!row.customer?.phone) return toast.warning('Add a phone number first');
    if (!confirm(`Send the outstanding statement PDF to ${name} (${row.customer.phone}) on WhatsApp?`)) return;
    setActingOn(row.id + ':wa');
    try {
      const res = await sendWhatsApp.mutateAsync(row.customer.id);
      toast.success(res.data?.data?.message ?? res.data?.message ?? 'WhatsApp statement sent');
    } catch (e: any) {
      toast.error('WhatsApp send failed', { description: e.message });
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div>
      <TopHeader title="Outstandings" subtitle="Aging & segment breakdown" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Aging bucket summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {aging.map((b: any) => (
            <button
              key={b.bucket}
              onClick={() => setFilters((f: any) => ({ ...f, aging_bucket: f.aging_bucket === b.bucket ? undefined : b.bucket, page: 1 }))}
              className={`glass-card p-3 sm:p-4 text-left metric-card transition-all ${filters.aging_bucket === b.bucket ? 'ring-1 ring-[var(--mahogany)]' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: getAgingColor(b.bucket) }} />
                <span className="text-[11px] sm:text-xs text-slate-400 font-medium">{b.bucket} days</span>
              </div>
              <p className="text-base sm:text-lg font-bold text-white">{formatINR(b.amount)}</p>
              <p className="text-[11px] sm:text-xs text-slate-500">{b.count} customers</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="glass-card p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Select
              className="flex-1 min-w-[118px] sm:flex-none sm:w-44"
              value={filters.segment ?? ''}
              onChange={(v) => setFilters((f: any) => ({ ...f, segment: v || undefined, page: 1 }))}
              options={[{ value: '', label: 'All Segments' }, ...SEGMENTS.map((s) => ({ value: s, label: s }))]}
            />
            <Select
              className="flex-1 min-w-[110px] sm:flex-none sm:w-36"
              value={filters.aging_bucket ?? ''}
              onChange={(v) => setFilters((f: any) => ({ ...f, aging_bucket: v || undefined, page: 1 }))}
              options={[{ value: '', label: 'All Buckets' }, ...BUCKETS.map((b) => ({ value: b, label: `${b} days` }))]}
            />
            {(filters.segment || filters.aging_bucket) && (
              <button onClick={() => setFilters({ page: 1, limit: 20 })}
                className="px-3 py-2 rounded-lg text-sm text-slate-400 border border-white/10 hover:bg-[var(--surface-warm)]/5 transition-all">
                Clear
              </button>
            )}

            {/* Bulk actions — enabled when one segment is selected */}
            {filters.segment && filters.segment !== 'Cleared' && (
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto">
                <button
                  onClick={handleBulkWhatsApp}
                  disabled={sendSegment.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[var(--cream)] disabled:opacity-50"
                  style={{ background: 'var(--recovery-green)' }}>
                  <MessageCircle size={14} />
                  {sendSegment.isPending ? 'Sending…' : `WhatsApp all ${filters.segment}`}
                </button>
                <button
                  onClick={handleBulkCall}
                  disabled={callSegment.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[var(--cream)] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, var(--walnut), var(--mahogany))' }}>
                  <Phone size={14} />
                  {callSegment.isPending ? 'Queuing…' : `Call all ${filters.segment}`}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[900px]">
            <thead>
              <tr>
                <th className="text-left">Customer</th>
                <th className="text-left">City</th>
                <th className="text-left">Phone</th>
                <th className="text-left">Segment</th>
                <th className="text-left">Aging Bucket</th>
                <th className="text-right">Total Due</th>
                <th className="text-left">Status</th>
                <th className="text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                  <td key={j}><div className="skeleton h-4 w-full rounded" /></td>
                ))}</tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-slate-500">
                  <span className="text-4xl block mb-2">📊</span>
                  No outstanding records. <Link href="/dashboard/import" className="text-[var(--mahogany)] hover:underline">Import data →</Link>
                </td></tr>
              )}
              {!isLoading && rows.map((row: any) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/dashboard/customers/${row.customer?.id}`} className="text-sm font-medium text-[var(--dark-brown)] hover:text-[var(--mahogany)] transition-colors">
                      {row.customer?.customer_name ?? '—'}
                    </Link>
                  </td>
                  <td className="text-sm text-slate-400">{row.customer?.city ?? '—'}</td>
                  <td>
                    {row.customer?.id
                      ? <PhoneCell customerId={row.customer.id} phone={row.customer.phone ?? null} />
                      : <span className="text-slate-500">—</span>}
                  </td>
                  <td><SegmentBadge segment={row.segment} /></td>
                  <td>
                    <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: `${getAgingColor(row.aging_bucket)}20`, color: getAgingColor(row.aging_bucket) }}>
                      {row.aging_bucket} days
                    </span>
                  </td>
                  <td className="text-right">
                    <span className={`text-sm font-bold ${row.total_due > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatINR(row.total_due)}
                    </span>
                  </td>
                  <td><StatusBadge status={row.status} /></td>
                  <td>
                    {row.total_due > 0 && row.customer?.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleWhatsApp(row)}
                          disabled={actingOn === row.id + ':wa'}
                          title="Send WhatsApp statement"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--recovery-green)] hover:bg-[var(--recovery-green)]/10 transition-colors disabled:opacity-40"
                        >
                          <MessageCircle size={16} />
                        </button>
                        <button
                          onClick={() => handleCall(row)}
                          disabled={actingOn === row.id + ':call'}
                          title="Start AI recovery call"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--mahogany)] hover:bg-[var(--mahogany)]/10 transition-colors disabled:opacity-40"
                        >
                          <Phone size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <p className="text-xs text-slate-500">{total} records</p>
              <div className="flex items-center gap-2">
                <button disabled={filters.page === 1} onClick={() => setFilters((f: any) => ({ ...f, page: f.page - 1 }))}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"><ChevronLeft size={16} /></button>
                <span className="text-xs text-slate-400">{filters.page} / {totalPages}</span>
                <button disabled={filters.page === totalPages} onClick={() => setFilters((f: any) => ({ ...f, page: f.page + 1 }))}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
