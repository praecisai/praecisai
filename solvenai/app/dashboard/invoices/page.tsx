'use client';

import { useState } from 'react';
import { useInvoices } from '../../../lib/api/hooks';
import { TopHeader } from '../../../components/layout/Sidebar';
import { StatusBadge } from '../../../components/shared/SegmentBadge';
import { formatINR, formatDate } from '../../../lib/utils/format';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { InvoiceFilters } from '../../../types';

const STATUSES = ['PENDING', 'OVERDUE', 'PAID', 'PARTIAL', 'DISPUTED'];

export default function InvoicesPage() {
  const [filters, setFilters] = useState<InvoiceFilters>({ page: 1, limit: 20 });
  const [search, setSearch] = useState('');
  const { data, isLoading } = useInvoices(filters);

  const invoices = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / (filters.limit ?? 20));

  return (
    <div>
      <TopHeader title="Invoices" subtitle={`${total} total invoices`} />
      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="glass-card p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 flex-1 min-w-48 input-dark" style={{ padding: '8px 12px' }}>
              <Search size={14} className="text-slate-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search invoice number or customer…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setFilters((f) => ({ ...f, search: search || undefined, page: 1 }))}
                className="bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-500 w-full"
              />
            </div>
            <select
              className="input-dark text-sm" style={{ width: 'auto' }}
              value={filters.status ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value as any) || undefined, page: 1 }))}
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              type="date" className="input-dark text-sm" style={{ width: 'auto' }}
              onChange={(e) => setFilters((f) => ({ ...f, date_from: e.target.value || undefined, page: 1 }))}
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date" className="input-dark text-sm" style={{ width: 'auto' }}
              onChange={(e) => setFilters((f) => ({ ...f, date_to: e.target.value || undefined, page: 1 }))}
            />
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">Invoice No.</th>
                <th className="text-left">Customer</th>
                <th className="text-left">Date</th>
                <th className="text-left">Agent</th>
                <th className="text-right">Due Amount</th>
                <th className="text-left">Days Overdue</th>
                <th className="text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                  <td key={j}><div className="skeleton h-4 w-full rounded" /></td>
                ))}</tr>
              ))}
              {!isLoading && invoices.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">📄</span>
                    <p>No invoices yet.</p>
                    <Link href="/dashboard/import" className="text-blue-400 text-sm hover:underline">Import data →</Link>
                  </div>
                </td></tr>
              )}
              {!isLoading && invoices.map((inv: any) => (
                <tr key={inv.id}>
                  <td className="font-mono text-xs text-blue-400">{inv.invoice_number}</td>
                  <td>
                    <Link href={`/dashboard/customers/${inv.customer?.id}`} className="text-sm text-white hover:text-blue-400 transition-colors">
                      {inv.customer?.customer_name ?? '—'}
                    </Link>
                    {inv.customer?.city && <p className="text-xs text-slate-500">{inv.customer.city}</p>}
                  </td>
                  <td className="text-sm text-slate-400">{formatDate(inv.invoice_date)}</td>
                  <td className="text-sm text-slate-400">{inv.sales_agent ?? '—'}</td>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <p className="text-xs text-slate-500">Showing {((filters.page! - 1) * filters.limit!) + 1}–{Math.min(filters.page! * filters.limit!, total)} of {total}</p>
              <div className="flex items-center gap-2">
                <button disabled={filters.page === 1} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 hover:bg-white/5 transition-all"><ChevronLeft size={16} /></button>
                <span className="text-xs text-slate-400">Page {filters.page} of {totalPages}</span>
                <button disabled={filters.page === totalPages} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 hover:bg-white/5 transition-all"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
