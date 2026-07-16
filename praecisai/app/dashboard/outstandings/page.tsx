'use client';

import { useState, useEffect } from 'react';
import {
  useOutstandings,
  useSegmentBreakdown,
  useCallCustomer,
  useSendWhatsAppStatement,
  useUpdateCustomerPhone,
  useCallSegment,
  useSendSegmentStatements,
} from '../../../lib/api/hooks';
import { TopHeader } from '../../../components/layout/Sidebar';
import { Select } from '../../../components/ui/Select';
import { SegmentBadge, StatusBadge } from '../../../components/shared/SegmentBadge';
import { formatINR, formatNumber } from '../../../lib/utils/format';
import { ChevronLeft, ChevronRight, Phone, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { ConfirmModal } from '../../../components/shared/ConfirmModal';
import { toast } from 'sonner';

const SEGMENTS = ['Soft Reminder', 'Follow-up', 'Strong Follow-up', 'Escalation', 'Cleared'];

const SEGMENT_COLORS: Record<string, string> = {
  'Soft Reminder': '#4A7C59',
  'Follow-up': '#B8860B',
  'Strong Follow-up': '#E65100',
  'Escalation': '#C62828',
};

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
      className="w-32 bg-transparent text-sm rounded border border-transparent px-2 py-1 hover:border-[rgba(176,137,104,0.4)] focus:border-[var(--mahogany)] focus:outline-none"
      style={{ color: 'var(--dark-brown)' }}
    />
  );
}

export default function OutstandingsPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20 } as any);
  const { data, isLoading } = useOutstandings(filters);
  const { data: segmentTotals = [] } = useSegmentBreakdown();
  const callCustomer = useCallCustomer();
  const sendWhatsApp = useSendWhatsAppStatement();
  const callSegment = useCallSegment();
  const sendSegment = useSendSegmentStatements();
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [vipOnly, setVipOnly] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; title: string; message: string; confirmLabel?: string; onConfirm: () => void } | null>(null);

  const showConfirm = (title: string, message: string, confirmLabel: string, action: () => void) =>
    setConfirm({ open: true, title, message, confirmLabel, onConfirm: action });
  const closeConfirm = () => setConfirm(null);


  const toastBulkResult = (d: any, verb: string) => {
    let description = '';
    if (d?.skipped?.length) {
      description = `Skipped: ${d.skipped.slice(0, 5).map((s: any) => `${s.customer} (${s.reason})`).join('; ')}`;
      if (d.skipped.length > 5) description += ` …and ${d.skipped.length - 5} more`;
    }
    toast.success(d?.message ?? `${verb} done`, description ? { description, duration: 9000 } : undefined);
  };

  const handleBulkCall = () => {
    if (!filters.segment) return;
    const who = vipOnly ? `VIP "${filters.segment}"` : `ALL "${filters.segment}"`;
    showConfirm(
      'Send Bulk AI Call',
      `Start AI recovery calls to ${who} customers that have a phone number?`,
      'Start Calls',
      async () => {
        closeConfirm();
        try {
          const res = await callSegment.mutateAsync({ segment: filters.segment, vipOnly });
          toastBulkResult(res.data?.data ?? res.data, 'Bulk calling');
        } catch (e: any) {
          toast.error('Bulk calling failed', { description: e.message });
        }
      }
    );
  };

  const handleBulkWhatsApp = () => {
    if (!filters.segment) return;
    const who = vipOnly ? `VIP "${filters.segment}"` : `ALL "${filters.segment}"`;
    showConfirm(
      'Send Bulk WhatsApp Message',
      `Send statement PDFs on WhatsApp to ${who} customers that have a phone number?`,
      'Send Statements',
      async () => {
        closeConfirm();
        try {
          const res = await sendSegment.mutateAsync({ segment: filters.segment, vipOnly });
          toastBulkResult(res.data?.data ?? res.data, 'Bulk WhatsApp');
        } catch (e: any) {
          toast.error('Bulk WhatsApp failed', { description: e.message });
        }
      }
    );
  };

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const handleCall = (row: any) => {
    const name = row.customer?.customer_name ?? 'this customer';
    if (!row.customer?.phone) return toast.warning('Add a phone number first');
    showConfirm(
      'Send AI Recovery Call',
      `Start an AI recovery call to ${name} (${row.customer.phone})?`,
      'Start Call',
      async () => {
        closeConfirm();
        setActingOn(row.id + ':call');
        try {
          const res = await callCustomer.mutateAsync(row.customer.id);
          toast.success(res.data?.data?.message ?? res.data?.message ?? 'Call queued');
        } catch (e: any) {
          toast.error('Call failed', { description: e.message });
        } finally {
          setActingOn(null);
        }
      }
    );
  };

  const handleWhatsApp = (row: any) => {
    const name = row.customer?.customer_name ?? 'this customer';
    if (!row.customer?.phone) return toast.warning('Add a phone number first');
    showConfirm(
      'Send WhatsApp Message',
      `Send the outstanding statement PDF to ${name} (${row.customer.phone}) on WhatsApp?`,
      'Send WhatsApp',
      async () => {
        closeConfirm();
        setActingOn(row.id + ':wa');
        try {
          const res = await sendWhatsApp.mutateAsync(row.customer.id);
          toast.success(res.data?.data?.message ?? res.data?.message ?? 'WhatsApp statement sent');
        } catch (e: any) {
          toast.error('WhatsApp send failed', { description: e.message });
        } finally {
          setActingOn(null);
        }
      }
    );
  };

  return (
    <div>
      <TopHeader title="Outstandings" subtitle="Segment-wise recovery workspace" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Segment summary cards — click to filter */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {segmentTotals.map((b: any) => (
            <button
              key={b.segment}
              onClick={() => setFilters((f: any) => ({ ...f, segment: f.segment === b.segment ? undefined : b.segment, page: 1 }))}
              className={`glass-card p-3 sm:p-4 text-left metric-card transition-all ${filters.segment === b.segment ? 'ring-1 ring-[var(--mahogany)]' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: SEGMENT_COLORS[b.segment] ?? 'var(--walnut)' }} />
                <span className="text-[11px] sm:text-xs font-medium whitespace-nowrap" style={{ color: 'var(--walnut)' }}>{b.segment}</span>
              </div>
              <p className="text-base sm:text-lg font-bold" style={{ color: 'var(--dark-brown)' }}>{formatINR(b.amount)}</p>
              <p className="text-[11px] sm:text-xs" style={{ color: 'var(--walnut)' }}>{b.count} customers</p>
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
              options={[
                { value: '', label: 'All Segments' },
                ...SEGMENTS.map((s) => ({ value: s, label: s })),
                { value: 'VIP', label: '⭐ VIP' },
              ]}
            />
            {filters.segment && (
              <button onClick={() => setFilters({ page: 1, limit: 20 })}
                className="px-3 py-2 rounded-lg text-sm border transition-all hover:bg-[rgba(127,85,57,0.06)]"
                style={{ color: 'var(--walnut)', borderColor: 'rgba(176,137,104,0.3)' }}>
                Clear
              </button>
            )}

            {/* Bulk actions — enabled when one segment is selected.
                VIPs never receive automated sends; bulk actions here are the
                ONLY way to reach them ("VIP" segment or the VIP-only toggle). */}
            {filters.segment && filters.segment !== 'Cleared' && (
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto">
                {filters.segment !== 'VIP' && (
                <label
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer select-none border transition-all"
                  style={
                    vipOnly
                      ? { background: 'var(--sand)', color: 'var(--mahogany)', borderColor: 'var(--mahogany)' }
                      : { color: 'var(--walnut)', borderColor: 'rgba(176,137,104,0.35)' }
                  }
                  title="Limit bulk actions to VIP customers only"
                >
                  <input
                    type="checkbox"
                    checked={vipOnly}
                    onChange={(e) => setVipOnly(e.target.checked)}
                    className="hidden"
                  />
                  ⭐ VIP only
                </label>
                )}
                <button
                  onClick={handleBulkWhatsApp}
                  disabled={sendSegment.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[var(--cream)] disabled:opacity-50"
                  style={{ background: 'var(--recovery-green)' }}>
                  <MessageCircle size={14} />
                  {sendSegment.isPending ? 'Sending…' : `WhatsApp ${vipOnly ? 'VIP' : 'all'} ${filters.segment}`}
                </button>
                <button
                  onClick={handleBulkCall}
                  disabled={callSegment.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[var(--cream)] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, var(--walnut), var(--mahogany))' }}>
                  <Phone size={14} />
                  {callSegment.isPending ? 'Queuing…' : `Call ${vipOnly ? 'VIP' : 'all'} ${filters.segment}`}
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
                <th className="text-right">Total Due</th>
                <th className="text-left">Status</th>
                <th className="text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                  <td key={j}><div className="skeleton h-4 w-full rounded" /></td>
                ))}</tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">
                  <span className="text-4xl block mb-2">📊</span>
                  No outstanding records. <Link href="/dashboard/import" className="text-[var(--mahogany)] hover:underline">Import data →</Link>
                </td></tr>
              )}
              {!isLoading && rows.map((row: any) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/dashboard/customers/${row.customer?.id}`} className="text-sm font-medium text-[var(--dark-brown)] hover:text-[var(--mahogany)] transition-colors">
                      {row.customer?.is_vip && <span title="VIP — automated calls/messages are blocked" className="mr-1">⭐</span>}
                      {row.customer?.customer_name ?? '—'}
                    </Link>
                  </td>
                  <td className="text-sm" style={{ color: 'var(--walnut)' }}>{row.customer?.city ?? '—'}</td>
                  <td>
                    {row.customer?.id
                      ? <PhoneCell customerId={row.customer.id} phone={row.customer.phone ?? null} />
                      : <span style={{ color: 'var(--walnut)' }}>—</span>}
                  </td>
                  <td><SegmentBadge segment={row.segment} /></td>
                  <td className="text-right">
                    <span className={`text-sm font-bold ${row.total_due > 0 ? 'text-red-600' : ''}`}
                      style={row.total_due <= 0 ? { color: 'var(--recovery-green)' } : {}}>
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
            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'rgba(221,184,146,0.35)' }}>
              <p className="text-xs" style={{ color: 'var(--walnut)' }}>{total} records</p>
              <div className="flex items-center gap-2">
                <button disabled={filters.page === 1} onClick={() => setFilters((f: any) => ({ ...f, page: f.page - 1 }))}
                  className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-[rgba(127,85,57,0.08)] transition-all"
                  style={{ color: 'var(--walnut)' }}><ChevronLeft size={16} /></button>
                <span className="text-xs" style={{ color: 'var(--walnut)' }}>{filters.page} / {totalPages}</span>
                <button disabled={filters.page === totalPages} onClick={() => setFilters((f: any) => ({ ...f, page: f.page + 1 }))}
                  className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-[rgba(127,85,57,0.08)] transition-all"
                  style={{ color: 'var(--walnut)' }}><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          open={confirm.open}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel ?? "Yes, proceed"}
          variant="warning"
          onConfirm={confirm.onConfirm}
          onCancel={closeConfirm}
        />
      )}
    </div>
  );
}
