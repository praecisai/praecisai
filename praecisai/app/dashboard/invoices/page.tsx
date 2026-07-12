'use client';

import { useState, useEffect } from 'react';
import { useInvoices } from '../../../lib/api/hooks';
import { TopHeader } from '../../../components/layout/Sidebar';
import { Select } from '../../../components/ui/Select';
import { StatusBadge } from '../../../components/shared/SegmentBadge';
import { formatINR, formatDate } from '../../../lib/utils/format';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { InvoiceFilters } from '../../../types';
import { useDebounce } from '../../../lib/hooks/useDebounce';

const STATUSES = ['PENDING', 'OVERDUE', 'PAID', 'PARTIAL', 'DISPUTED'];

export default function InvoicesPage() {
  const [filters, setFilters] = useState<InvoiceFilters>({ page: 1, limit: 20 });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const { data, isLoading } = useInvoices(filters);

  // Auto-update filters when debounced search changes
  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch || undefined, page: 1 }));
  }, [debouncedSearch]);

  const invoices = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / (filters.limit ?? 20));

  return (
    <div>
      <TopHeader title="Invoices" subtitle={`${total} total invoices`} />
      <div className="p-4 sm:p-6 space-y-4">
        {/* Filters */}
        <div className="glass-card p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 flex-1 min-w-48 input-dark" style={{ padding: '8px 12px' }}>
              <Search size={14} className="flex-shrink-0" style={{ color: 'var(--walnut)' }} />
              <input
                type="text"
                placeholder="Search invoice number or customer…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full"
                style={{ color: 'var(--dark-brown)' }}
              />
            </div>
            <Select
              className="flex-1 min-w-[124px] sm:flex-none sm:w-40"
              value={filters.status ?? ''}
              onChange={(v) => setFilters((f) => ({ ...f, status: (v as any) || undefined, page: 1 }))}
              options={[{ value: '', label: 'All Statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
            />
            <div className="flex items-center gap-2 flex-1 min-w-[230px] sm:flex-none sm:w-auto">
              <input
                type="date" className="input-dark text-sm flex-1 min-w-0 sm:flex-none" style={{ width: 'auto' }}
                onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value || undefined, page: 1 }))}
              />
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--walnut)' }}>to</span>
              <input
                type="date" className="input-dark text-sm flex-1 min-w-0 sm:flex-none" style={{ width: 'auto' }}
                onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value || undefined, page: 1 }))}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[720px]">
            <thead>
              <tr>
                <th className="text-left">Invoice No.</th>
                <th className="text-left">Customer</th>
                <th className="text-left">Date</th>
                <th className="text-left">Agent</th>
                <th className="text-right">Due Amount</th>
                <th className="text-center">Days Overdue</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                  <td key={j}><div className="skeleton h-4 w-full rounded" /></td>
                ))}</tr>
              ))}
              {!isLoading && invoices.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12" style={{ color: 'var(--walnut)' }}>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">📄</span>
                    <p>No invoices yet.</p>
                    <Link href="/dashboard/import" className="text-sm hover:underline" style={{ color: 'var(--rust)' }}>Import data →</Link>
                  </div>
                </td></tr>
              )}
              {!isLoading && invoices.map((inv: any) => (
                <tr key={inv.id}>
                  <td className="font-mono text-xs font-medium" style={{ color: 'var(--rust)' }}>{inv.invoice_number}</td>
                  <td>
                    <Link
                      href={`/dashboard/customers/${inv.customer?.id}`}
                      className="text-sm font-medium transition-colors"
                      style={{ color: 'var(--dark-brown)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--mahogany)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--dark-brown)')}
                    >
                      {inv.customer?.customer_name ?? '—'}
                    </Link>
                    {inv.customer?.city && <p className="text-xs mt-0.5" style={{ color: 'var(--walnut)' }}>{inv.customer.city}</p>}
                  </td>
                  <td className="text-sm" style={{ color: 'var(--walnut)' }}>{formatDate(inv.invoice_date)}</td>
                  <td className="text-sm" style={{ color: 'var(--walnut)' }}>{inv.sales_agent ?? '—'}</td>
                  <td className="text-right">
                    <span className={`text-sm font-semibold ${
                      inv.due_amount < 0 ? 'text-purple-600' :
                      inv.due_amount === 0 ? '' : 'text-red-600'
                    }`} style={inv.due_amount === 0 ? { color: 'var(--recovery-green)' } : {}}>
                      {formatINR(inv.due_amount)}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className="text-sm font-medium tabular-nums" style={{ color: 'var(--walnut)' }}>
                      {inv.days_overdue ?? 0}d
                    </span>
                  </td>
                  <td className="text-center"><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'rgba(221,184,146,0.35)' }}>
              <p className="text-xs" style={{ color: 'var(--walnut)' }}>Showing {((filters.page! - 1) * filters.limit!) + 1}–{Math.min(filters.page! * filters.limit!, total)} of {total}</p>
              <div className="flex items-center gap-2">
                <button disabled={filters.page === 1} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                  className="p-1.5 rounded-lg disabled:opacity-30 transition-all hover:bg-[rgba(127,85,57,0.08)]"
                  style={{ color: 'var(--walnut)' }}><ChevronLeft size={16} /></button>
                <span className="text-xs" style={{ color: 'var(--walnut)' }}>Page {filters.page} of {totalPages}</span>
                <button disabled={filters.page === totalPages} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                  className="p-1.5 rounded-lg disabled:opacity-30 transition-all hover:bg-[rgba(127,85,57,0.08)]"
                  style={{ color: 'var(--walnut)' }}><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
