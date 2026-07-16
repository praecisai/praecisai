'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCustomers, useCustomerCities, useCustomerAgents } from '../../../lib/api/hooks';
import { TopHeader } from '../../../components/layout/Sidebar';
import { Select } from '../../../components/ui/Select';
import { SegmentBadge } from '../../../components/shared/SegmentBadge';
import { CustomScheduleModal, ScheduleTarget } from '../../../components/shared/CustomScheduleModal';
import { formatINR } from '../../../lib/utils/format';
import { Search, Star, ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import type { CustomerFilters } from '../../../types';
import { useDebounce } from '../../../lib/hooks/useDebounce';
import { useUpdateCustomer } from '../../../lib/api/hooks';
import { toast } from 'sonner';

const SEGMENTS = ['Soft Reminder', 'Follow-up', 'Strong Follow-up', 'Escalation', 'Cleared'];

// Star toggle — click to mark/unmark a customer as VIP
function VipToggle({ customerId, isVip, name }: { customerId: string; isVip: boolean; name: string }) {
  const update = useUpdateCustomer(customerId);
  return (
    <button
      title={isVip ? 'Remove VIP' : 'Mark as VIP'}
      onClick={(e) => {
        e.stopPropagation();
        update.mutate(
          { is_vip: !isVip },
          {
            onSuccess: () =>
              toast.success(isVip ? `${name} removed from VIP` : `${name} marked as VIP ⭐`),
            onError: (err: any) =>
              toast.error('Could not update VIP status', { description: err.message }),
          },
        );
      }}
      className="p-1 rounded transition-colors flex-shrink-0"
    >
      <Star
        size={14}
        className={isVip ? 'text-yellow-400' : 'text-[var(--walnut)] opacity-40 hover:opacity-100'}
        fill={isVip ? 'currentColor' : 'none'}
      />
    </button>
  );
}

export default function CustomersPage() {
  const [filters, setFilters] = useState<CustomerFilters>({ page: 1, limit: 20 });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const { data, isLoading } = useCustomers(filters);
  const { data: cities = [] } = useCustomerCities();
  const { data: agents = [] } = useCustomerAgents();

  // Row selection — enables the per-customer Custom Schedule column
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduleFor, setScheduleFor] = useState<ScheduleTarget | null>(null);

  const customers = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / (filters.limit ?? 20));

  const selectionMode = selected.size > 0;
  const colCount = selectionMode ? 9 : 8;

  const toggleSelected = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pageIds = useMemo(() => customers.map((c: any) => c.id), [customers]);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id: string) => selected.has(id));
  const toggleAllPage = () =>
    setSelected((s) => {
      const next = new Set(s);
      if (allPageSelected) pageIds.forEach((id: string) => next.delete(id));
      else pageIds.forEach((id: string) => next.add(id));
      return next;
    });

  const selectedTargets: ScheduleTarget[] = customers
    .filter((c: any) => selected.has(c.id))
    .map((c: any) => ({ id: c.id, customer_name: c.customer_name, custom_schedule: c.custom_schedule ?? null }));

  // Auto-search as user types
  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch || undefined, page: 1 }));
  }, [debouncedSearch]);

  return (
    <div>
      <TopHeader title="Customers" subtitle={`${total} total customers`} />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Filters bar */}
        <div className="glass-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 flex-1 min-w-48 input-dark" style={{ padding: '8px 12px' }}>
              <Search size={14} className="flex-shrink-0" style={{ color: 'var(--walnut)' }} />
              <input
                type="text"
                placeholder="Search by name, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full"
                style={{ color: 'var(--dark-brown)' }}
              />
            </div>

            {/* City filter */}
            <Select
              className="flex-1 min-w-[110px] sm:flex-none sm:w-36"
              value={filters.city ?? ''}
              onChange={(v) => setFilters((f) => ({ ...f, city: v || undefined, page: 1 }))}
              options={[{ value: '', label: 'All Cities' }, ...cities.map((c) => ({ value: c, label: c }))]}
            />

            {/* Segment filter — includes the VIP pseudo-segment */}
            <Select
              className="flex-1 min-w-[118px] sm:flex-none sm:w-44"
              value={filters.segment ?? ''}
              onChange={(v) => setFilters((f) => ({ ...f, segment: v || undefined, page: 1 }))}
              options={[
                { value: '', label: 'All Segments' },
                ...SEGMENTS.map((s) => ({ value: s, label: s })),
                { value: 'VIP', label: '⭐ VIP' },
              ]}
            />

            {/* Agent filter */}
            <Select
              className="flex-1 min-w-[130px] sm:flex-none sm:w-52"
              value={filters.agent ?? ''}
              onChange={(v) => setFilters((f) => ({ ...f, agent: v || undefined, page: 1 }))}
              options={[{ value: '', label: 'All Agents' }, ...agents.map((a) => ({ value: a, label: a }))]}
            />

            {/* VIP toggle */}
            <button
              onClick={() => setFilters((f) => ({ ...f, is_vip: f.is_vip ? undefined : true, page: 1 }))}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                filters.is_vip
                  ? 'bg-yellow-500/20 text-yellow-600 border border-yellow-500/30'
                  : 'border hover:bg-[rgba(127,85,57,0.06)]'
              }`}
              style={!filters.is_vip ? { color: 'var(--walnut)', borderColor: 'rgba(176,137,104,0.3)' } : {}}
            >
              <Star size={13} /> VIP
            </button>

            {(filters.search || filters.city || filters.segment || filters.agent || filters.is_vip) && (
              <button
                onClick={() => { setSearch(''); setFilters({ page: 1, limit: 20 }); }}
                className="px-3 py-2 rounded-lg text-sm font-medium border transition-all hover:bg-[rgba(127,85,57,0.06)]"
                style={{ color: 'var(--walnut)', borderColor: 'rgba(176,137,104,0.3)' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Selection hint */}
          {selectionMode && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'rgba(221,184,146,0.35)' }}>
              <span className="text-xs font-medium" style={{ color: 'var(--mahogany)' }}>
                {selected.size} selected — use the Custom Schedule column to set per-customer day ranges
              </span>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs px-2 py-1 rounded border transition-all hover:bg-[rgba(127,85,57,0.06)]"
                style={{ color: 'var(--walnut)', borderColor: 'rgba(176,137,104,0.3)' }}
              >
                Clear selection
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="data-table w-full min-w-[860px]">
            <thead>
              <tr>
                <th className="w-8">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAllPage}
                    title="Select all on this page"
                  />
                </th>
                <th className="text-left">Customer</th>
                <th className="text-left">City</th>
                <th className="text-left">Phone</th>
                <th className="text-left">Agent</th>
                <th className="text-left">Segment</th>
                {selectionMode && <th className="text-left">Custom Schedule</th>}
                <th className="text-right">Total Due</th>
                <th className="text-left">Tags</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: colCount }).map((_, j) => (
                    <td key={j}><div className="skeleton h-4 w-full rounded" /></td>
                  ))}
                </tr>
              ))}

              {!isLoading && customers.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="text-center py-12 text-slate-500">
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

              {!isLoading && customers.map((customer: any) => {
                const isSelected = selected.has(customer.id);
                const hasCustom = Array.isArray(customer.custom_schedule) && customer.custom_schedule.length > 0;
                return (
                <tr key={customer.id} className="cursor-pointer hover:bg-[var(--surface-warm)]/2 transition-colors">
                  <td>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelected(customer.id)}
                    />
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <VipToggle customerId={customer.id} isVip={!!customer.is_vip} name={customer.customer_name} />
                      <Link href={`/dashboard/customers/${customer.id}`} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                          style={{ background: 'linear-gradient(135deg, var(--walnut), var(--mahogany))' }}>
                          {customer.customer_name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white hover:text-[var(--mahogany)] transition-colors">
                            {customer.customer_name}
                          </p>
                          <div className="flex items-center gap-1.5">
                            {customer.is_vip && (
                              <span className="text-[10px] text-yellow-400">⭐ VIP</span>
                            )}
                            {hasCustom && (
                              <span className="text-[10px] inline-flex items-center gap-0.5" style={{ color: 'var(--mahogany)' }}>
                                <CalendarClock size={9} /> Custom schedule
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  </td>
                  <td className="text-sm text-slate-400">{customer.city ?? '—'}</td>
                  <td className="text-sm text-slate-400 font-mono text-xs">
                    {customer.phone ?? '—'}
                    {(customer.alt_phones?.length ?? 0) > 0 && (
                      <span
                        className="ml-1 text-[10px] px-1 py-0.5 rounded bg-[var(--sand)]"
                        style={{ color: 'var(--walnut)' }}
                        title={`Backup numbers (tried when the first is not picked up): ${customer.alt_phones.join(', ')}`}
                      >
                        +{customer.alt_phones.length}
                      </span>
                    )}
                  </td>
                  <td className="text-sm text-slate-400 text-xs">{customer.assigned_agent ?? '—'}</td>
                  <td>
                    {customer.outstanding?.segment
                      ? <SegmentBadge segment={customer.outstanding.segment} />
                      : <span className="text-slate-600 text-xs">—</span>}
                  </td>
                  {selectionMode && (
                    <td>
                      {isSelected ? (
                        <button
                          onClick={() =>
                            setScheduleFor({
                              id: customer.id,
                              customer_name: customer.customer_name,
                              custom_schedule: customer.custom_schedule ?? null,
                            })
                          }
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all hover:bg-[rgba(127,85,57,0.08)]"
                          style={{ color: 'var(--mahogany)', borderColor: 'rgba(176,137,104,0.4)' }}
                        >
                          <CalendarClock size={12} />
                          {hasCustom ? 'Edit schedule' : 'Set schedule'}
                        </button>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                  )}
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
                );
              })}
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

      {scheduleFor && (
        <CustomScheduleModal
          target={scheduleFor}
          others={selectedTargets.filter((t) => t.id !== scheduleFor.id)}
          onClose={() => setScheduleFor(null)}
        />
      )}
    </div>
  );
}
