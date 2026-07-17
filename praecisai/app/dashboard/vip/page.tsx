'use client';

import { useRef, useState, useEffect } from 'react';
import { useCustomers, useVipImport, useUpdateCustomer } from '../../../lib/api/hooks';
import { TopHeader } from '../../../components/layout/Sidebar';
import { SegmentBadge } from '../../../components/shared/SegmentBadge';
import { formatINR } from '../../../lib/utils/format';
import { Star, Upload, ShieldCheck, ChevronLeft, ChevronRight, X, Search } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useDebounce } from '../../../lib/hooks/useDebounce';

function UnstarButton({ customerId, name }: { customerId: string; name: string }) {
  const update = useUpdateCustomer(customerId);
  return (
    <button
      title="Remove VIP"
      onClick={() =>
        update.mutate(
          { is_vip: false },
          {
            onSuccess: () => toast.success(`${name} removed from VIP`),
            onError: (e: any) => toast.error('Could not update', { description: e.message }),
          },
        )
      }
      className="p-1.5 rounded-lg text-slate-400 hover:text-[#C62828] hover:bg-[#C62828]/10 transition-colors"
    >
      <X size={14} />
    </button>
  );
}

export default function VipPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const { data, isLoading } = useCustomers({ is_vip: true, page, limit: 20, search: debouncedSearch || undefined });
  const vipImport = useVipImport();

  useEffect(() => { setPage(1); }, [debouncedSearch]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const customers = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const res = await vipImport.mutateAsync(file);
      const result = res.data?.data ?? res.data;
      setLastResult(result);
      toast.success(result?.message ?? 'VIP list updated');
    } catch (e: any) {
      toast.error('VIP import failed', { description: e.message });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div>
      <TopHeader title="VIP Customers" subtitle={`${total} VIP customers: protected from automated calls & messages`} />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Explainer + upload */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(74,124,89,0.12)' }}>
                <ShieldCheck size={17} style={{ color: 'var(--recovery-green, #4A7C59)' }} strokeWidth={1.75} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--dark-brown)' }}>VIPs are never called or messaged automatically</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--walnut)' }}>
                  Starred customers are excluded from every bulk call, bulk WhatsApp and auto-callback.
                  To reach them, go to <Link href="/dashboard/outstandings" className="underline hover:text-[var(--mahogany)]">Outstandings</Link>,
                  pick the <b>⭐ VIP</b> segment (or tick “VIP only”), and trigger the calls/messages yourself.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-48">
                <p className="font-semibold text-sm" style={{ color: 'var(--dark-brown)' }}>Upload VIP list (Excel)</p>
                <p className="text-xs mt-1" style={{ color: 'var(--walnut)' }}>
                  Needs a <b>PARTY</b> (or Customer Name) column and a <b>VIP</b> column with Yes/No.
                  “Yes” stars the customer, “No” removes the star, blank leaves it unchanged.
                  Manual starring from the Customers page keeps working too.
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={vipImport.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-[var(--cream)] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, var(--walnut), var(--mahogany))' }}
              >
                <Upload size={14} />
                {vipImport.isPending ? 'Processing…' : 'Upload Excel'}
              </button>
            </div>
            {lastResult && (
              <div className="mt-3 pt-3 border-t text-xs space-y-1" style={{ borderColor: 'rgba(221,184,146,0.35)', color: 'var(--walnut)' }}>
                <p>
                  ⭐ {lastResult.starred} marked VIP · {lastResult.unstarred} removed
                  {lastResult.unmatched_count > 0 && ` · ${lastResult.unmatched_count} name(s) not found`}
                </p>
                {lastResult.unmatched_count > 0 && (
                  <p className="truncate" title={(lastResult.unmatched ?? []).join(', ')}>
                    Not found: {(lastResult.unmatched ?? []).slice(0, 5).join(', ')}{lastResult.unmatched_count > 5 ? '…' : ''}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 input-dark max-w-md" style={{ padding: '8px 12px' }}>
            <Search size={14} className="flex-shrink-0" style={{ color: 'var(--walnut)' }} />
            <input
              type="text"
              placeholder="Search VIP customers…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full"
              style={{ color: 'var(--dark-brown)' }}
            />
          </div>
        </div>

        {/* VIP table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[720px]">
            <thead>
              <tr>
                <th className="text-left">Customer</th>
                <th className="text-left">City</th>
                <th className="text-left">Phone</th>
                <th className="text-left">Agent</th>
                <th className="text-left">Segment</th>
                <th className="text-right">Total Due</th>
                <th className="text-left"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                  <td key={j}><div className="skeleton h-4 w-full rounded" /></td>
                ))}</tr>
              ))}

              {!isLoading && customers.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <span className="text-4xl block mb-2">⭐</span>
                    No VIP customers yet. Upload an Excel above, or star customers from the{' '}
                    <Link href="/dashboard/customers" className="text-[var(--mahogany)] hover:underline">Customers page</Link>.
                  </td>
                </tr>
              )}

              {!isLoading && customers.map((c: any) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/dashboard/customers/${c.id}`} className="flex items-center gap-2">
                      <Star size={13} className="text-yellow-400 flex-shrink-0" fill="currentColor" />
                      <span className="text-sm font-medium text-[var(--dark-brown)] hover:text-[var(--mahogany)] transition-colors">
                        {c.customer_name}
                      </span>
                    </Link>
                  </td>
                  <td className="text-sm" style={{ color: 'var(--walnut)' }}>{c.city ?? '-'}</td>
                  <td className="text-xs font-mono" style={{ color: 'var(--walnut)' }}>{c.phone ?? '-'}</td>
                  <td className="text-xs" style={{ color: 'var(--walnut)' }}>{c.assigned_agent ?? '-'}</td>
                  <td>
                    {c.outstanding?.segment
                      ? <SegmentBadge segment={c.outstanding.segment} />
                      : <span className="text-slate-600 text-xs">-</span>}
                  </td>
                  <td className="text-right">
                    <span className={`text-sm font-semibold ${(c.outstanding?.total_due ?? 0) > 0 ? 'text-red-500' : ''}`}
                      style={(c.outstanding?.total_due ?? 0) <= 0 ? { color: 'var(--recovery-green, #4A7C59)' } : {}}>
                      {formatINR(c.outstanding?.total_due ?? 0)}
                    </span>
                  </td>
                  <td><UnstarButton customerId={c.id} name={c.customer_name} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'rgba(221,184,146,0.35)' }}>
              <p className="text-xs" style={{ color: 'var(--walnut)' }}>{total} VIP customers</p>
              <div className="flex items-center gap-2">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-[rgba(127,85,57,0.08)] transition-all"
                  style={{ color: 'var(--walnut)' }}><ChevronLeft size={16} /></button>
                <span className="text-xs" style={{ color: 'var(--walnut)' }}>{page} / {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-[rgba(127,85,57,0.08)] transition-all"
                  style={{ color: 'var(--walnut)' }}><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
