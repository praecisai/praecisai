'use client';

import { useState } from 'react';
import { useCustomers, useCustomerCities } from '../../../lib/api/hooks';
import { TopHeader } from '../../../components/layout/Sidebar';
import { SegmentBadge } from '../../../components/shared/SegmentBadge';
import { formatINR, formatDate } from '../../../lib/utils/format';
import { Search, Filter, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { CustomerFilters } from '../../../types';

const SEGMENTS = ['Soft Reminder', 'Follow-up', 'Strong Follow-up', 'Escalation', 'Cleared'];

export default function CustomersPage() {
  const [filters, setFilters] = useState<CustomerFilters>({ page: 1, limit: 20 });
  const [search, setSearch] = useState('');
  const { data, isLoading } = useCustomers(filters);
  const { data: cities = [] } = useCustomerCities();

  const customers = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / (filters.limit ?? 20));

  function applySearch() {
    setFilters((f) => ({ ...f, search: search || undefined, page: 1 }));
  }

  return (
    <div>
      <TopHeader title="Customers" subtitle={`${total} total customers`} />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Filters bar */}
        <div className="glass-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 flex-1 min-w-48 input-dark" style={{ padding: '8px 12px' }}>
              <Search size={14} className="text-slate-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search by name, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applySearch()}
                className="bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-500 w-full"
              />
            </div>

            {/* City filter */}
            <select
              className="input-dark text-sm"
              style={{ width: 'auto', paddingRight: '32px' }}
              value={filters.city ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value || undefined, page: 1 }))}
            >
              <option value="">All Cities</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Segment filter */}
            <select
              className="input-dark text-sm"
              style={{ width: 'auto', paddingRight: '32px' }}
              value={filters.segment ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, segment: (e.target.value as any) || undefined, page: 1 }))}
            >
              <option value="">All Segments</option>
              {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* VIP toggle */}
            <button
              onClick={() => setFilters((f) => ({ ...f, is_vip: f.is_vip ? undefined : true, page: 1 }))}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                filters.is_vip
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'text-slate-400 hover:text-white border border-white/10 hover:bg-[var(--surface-warm)]/5'
              }`}
            >
              <Star size={13} /> VIP
            </button>

            <button
              onClick={applySearch}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, var(--walnut), var(--mahogany))' }}
            >
              Search
            </button>

            {(filters.search || filters.city || filters.segment || filters.is_vip) && (
              <button
                onClick={() => { setSearch(''); setFilters({ page: 1, limit: 20 }); }}
                className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white border border-white/10 hover:bg-[var(--surface-warm)]/5 transition-all"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[720px]">
            <thead>
              <tr>
                <th className="text-left">Customer</th>
                <th className="text-left">City</th>
                <th className="text-left">Phone</th>
                <th className="text-left">Segment</th>
                <th className="text-right">Total Due</th>
                <th className="text-left">Tags</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}><div className="skeleton h-4 w-full rounded" /></td>
                  ))}
                </tr>
              ))}

              {!isLoading && customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">🔍</span>
                      <p>No customers found. Try importing your first file.</p>
                      <Link href="/dashboard/import" className="text-blue-400 text-sm hover:underline">
                        Go to Import Center →
                      </Link>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && customers.map((customer: any) => (
                <tr key={customer.id} className="cursor-pointer hover:bg-[var(--surface-warm)]/2 transition-colors">
                  <td>
                    <Link href={`/dashboard/customers/${customer.id}`} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                        style={{ background: 'linear-gradient(135deg, var(--walnut), var(--mahogany))' }}>
                        {customer.customer_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white hover:text-blue-400 transition-colors">
                          {customer.customer_name}
                        </p>
                        {customer.is_vip && (
                          <span className="text-[10px] text-yellow-400">⭐ VIP</span>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="text-sm text-slate-400">{customer.city ?? '—'}</td>
                  <td className="text-sm text-slate-400 font-mono text-xs">{customer.phone ?? '—'}</td>
                  <td>
                    {customer.outstanding?.segment
                      ? <SegmentBadge segment={customer.outstanding.segment} />
                      : <span className="text-slate-600 text-xs">—</span>}
                  </td>
                  <td className="text-right">
                    <span className={`text-sm font-semibold ${(customer.outstanding?.total_due ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {formatINR(customer.outstanding?.total_due ?? 0)}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {(customer.tags ?? []).slice(0, 2).map((tag: string) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-warm)]/5 text-slate-400">{tag}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <p className="text-xs text-slate-500">
                Showing {((filters.page! - 1) * filters.limit!) + 1}–{Math.min(filters.page! * filters.limit!, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={filters.page === 1}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 hover:bg-[var(--surface-warm)]/5 transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-slate-400">Page {filters.page} of {totalPages}</span>
                <button
                  disabled={filters.page === totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 hover:bg-[var(--surface-warm)]/5 transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
