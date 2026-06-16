'use client';

import { useState } from 'react';
import { useOutstandings, useAgingBreakdown } from '../../../lib/api/hooks';
import { TopHeader } from '../../../components/layout/Sidebar';
import { SegmentBadge, StatusBadge } from '../../../components/shared/SegmentBadge';
import { formatINR, formatNumber, getAgingColor } from '../../../lib/utils/format';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const SEGMENTS = ['Soft Reminder', 'Follow-up', 'Strong Follow-up', 'Escalation', 'Cleared'];
const BUCKETS = ['0-60', '61-120', '121-180', '181+'];

export default function OutstandingsPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 20 } as any);
  const { data, isLoading } = useOutstandings(filters);
  const { data: aging = [] } = useAgingBreakdown();

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <TopHeader title="Outstandings" subtitle="Aging & segment breakdown" />
      <div className="p-6 space-y-5">
        {/* Aging bucket summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {aging.map((b: any) => (
            <button
              key={b.bucket}
              onClick={() => setFilters((f: any) => ({ ...f, aging_bucket: f.aging_bucket === b.bucket ? undefined : b.bucket, page: 1 }))}
              className={`glass-card p-4 text-left metric-card transition-all ${filters.aging_bucket === b.bucket ? 'ring-1 ring-blue-500' : ''}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: getAgingColor(b.bucket) }} />
                <span className="text-xs text-slate-400 font-medium">{b.bucket} days</span>
              </div>
              <p className="text-lg font-bold text-white">{formatINR(b.amount)}</p>
              <p className="text-xs text-slate-500">{b.count} customers</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="glass-card p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <select className="input-dark text-sm" style={{ width: 'auto' }}
              value={filters.segment ?? ''}
              onChange={(e) => setFilters((f: any) => ({ ...f, segment: e.target.value || undefined, page: 1 }))}>
              <option value="">All Segments</option>
              {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="input-dark text-sm" style={{ width: 'auto' }}
              value={filters.aging_bucket ?? ''}
              onChange={(e) => setFilters((f: any) => ({ ...f, aging_bucket: e.target.value || undefined, page: 1 }))}>
              <option value="">All Buckets</option>
              {BUCKETS.map((b) => <option key={b} value={b}>{b} days</option>)}
            </select>
            {(filters.segment || filters.aging_bucket) && (
              <button onClick={() => setFilters({ page: 1, limit: 20 })}
                className="px-3 py-2 rounded-lg text-sm text-slate-400 border border-white/10 hover:bg-white/5 transition-all">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th className="text-left">Customer</th>
                <th className="text-left">City</th>
                <th className="text-left">Segment</th>
                <th className="text-left">Aging Bucket</th>
                <th className="text-right">Total Due</th>
                <th className="text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                  <td key={j}><div className="skeleton h-4 w-full rounded" /></td>
                ))}</tr>
              ))}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-500">
                  <span className="text-4xl block mb-2">📊</span>
                  No outstanding records. <Link href="/dashboard/import" className="text-blue-400 hover:underline">Import data →</Link>
                </td></tr>
              )}
              {!isLoading && rows.map((row: any) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/dashboard/customers/${row.customer?.id}`} className="text-sm font-medium text-white hover:text-blue-400 transition-colors">
                      {row.customer?.customer_name ?? '—'}
                    </Link>
                  </td>
                  <td className="text-sm text-slate-400">{row.customer?.city ?? '—'}</td>
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
                </tr>
              ))}
            </tbody>
          </table>

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
