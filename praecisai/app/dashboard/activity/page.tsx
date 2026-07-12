'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useDashboardActivity } from '../../../lib/api/hooks';
import { TopHeader } from '../../../components/layout/Sidebar';
import { StatusBadge } from '../../../components/shared/SegmentBadge';
import { formatDate } from '../../../lib/utils/format';
import { Phone, MessageCircle, FileText, Search, X } from 'lucide-react';

type Kind = 'call' | 'whatsapp' | 'import';

const FILTERS: { id: 'all' | Kind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'call', label: 'AI Calls' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'import', label: 'Imports' },
];

export default function ActivityPage() {
  const { data: activity, isLoading } = useDashboardActivity(50);
  const [filter, setFilter] = useState<'all' | Kind>('all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [
      ...(activity?.recent_calls ?? []).map((c: any) => ({ ...c, kind: 'call' as Kind })),
      ...(activity?.recent_whatsapp ?? []).map((w: any) => ({ ...w, kind: 'whatsapp' as Kind })),
      ...(activity?.recent_imports ?? []).map((i: any) => ({ ...i, kind: 'import' as Kind })),
    ]
      .filter((x) => filter === 'all' || x.kind === filter)
      .filter((x) => {
        if (dateFilter) {
          try {
            const xDate = new Date(x.created_at).toISOString().split('T')[0];
            if (xDate !== dateFilter) return false;
          } catch (e) {
            // invalid date
          }
        }
        if (!q) return true;
        const name = (x.customer?.customer_name ?? x.file_name ?? '').toLowerCase();
        const detail = (x.call_summary ?? x.message ?? x.disposition ?? x.status ?? '').toLowerCase();
        return name.includes(q) || detail.includes(q);
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [activity, filter, search, dateFilter]);

  return (
    <div>
      <TopHeader title="Activity" subtitle="Every AI call, WhatsApp message and import" />
      <div className="p-4 sm:p-6 space-y-5">
        {/* Search + filter tabs */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--walnut)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer, summary, status…"
              className="input-dark w-full pr-8 text-[13px] sm:text-sm"
              style={{ paddingLeft: '32px' }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--walnut)' }}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border transition-all"
                style={
                  filter === f.id
                    ? { background: 'var(--sand)', color: 'var(--mahogany)', borderColor: 'var(--mahogany)' }
                    : { color: 'var(--walnut)', borderColor: 'rgba(176,137,104,0.35)' }
                }
              >
                {f.label}
              </button>
            ))}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-2 py-1 h-[30px] rounded-lg text-xs sm:text-sm font-medium border transition-all"
                style={{ color: 'var(--walnut)', borderColor: 'rgba(176,137,104,0.35)', background: 'transparent' }}
              />
              {dateFilter && (
                <button onClick={() => setDateFilter('')} className="text-[11px] sm:text-xs hover:underline" style={{ color: 'var(--walnut)' }}>
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="glass-card p-2 sm:p-4">
          {isLoading ? (
            <div className="space-y-3 p-3">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-14 w-full rounded-lg" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: 'var(--walnut)' }}>
              <Phone size={28} className="mb-3" strokeWidth={1.5} />
              <p className="text-sm text-center">
                {search ? `No activity matches “${search}”.` : <>No activity yet.<br />Start a call or send a statement from the Outstandings page.</>}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(221,184,146,0.35)' }}>
              {items.map((a: any) => (
                <ActivityRow key={`${a.kind}-${a.id}`} a={a} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ a }: { a: any }) {
  const icon =
    a.kind === 'call' ? <Phone size={14} style={{ color: 'var(--mahogany)' }} />
    : a.kind === 'whatsapp' ? <MessageCircle size={14} style={{ color: 'var(--recovery-green)' }} />
    : <FileText size={14} style={{ color: 'var(--walnut)' }} />;

  const iconBg =
    a.kind === 'call' ? 'rgba(127,85,57,0.12)'
    : a.kind === 'whatsapp' ? 'rgba(74,124,89,0.12)'
    : 'rgba(176,137,104,0.15)';

  const title =
    a.kind === 'import' ? a.file_name : (a.customer?.customer_name ?? '—');

  const body =
    a.kind === 'call'
      ? `${a.call_status}${a.disposition ? ` · ${a.disposition}` : ''}${a.call_summary ? ` — ${a.call_summary}` : ''}`
      : a.kind === 'whatsapp'
      ? `${a.delivery_status} · ${a.message}`
      : `${a.status} · ${a.records_imported ?? 0} records imported`;

  const inner = (
    <div className="flex items-start gap-3 py-3 px-2">
      <div className="p-2 rounded-lg flex-shrink-0 mt-0.5" style={{ background: iconBg }}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] sm:text-sm font-medium truncate" style={{ color: 'var(--dark-brown)' }}>{title}</span>
          <span className="text-[10px] sm:text-[11px] flex-shrink-0" style={{ color: 'var(--walnut)' }}>
            {formatDate(a.created_at)}
            {a.kind === 'call' && a.duration_seconds ? ` · ${Math.round(a.duration_seconds)}s` : ''}
          </span>
        </div>
        <p className="text-[11px] sm:text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--walnut)' }}>{body}</p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {a.kind === 'call' && a.promise_date && (
            <span className="text-[11px] font-medium" style={{ color: 'var(--recovery-green)' }}>
              🤝 Promised {formatDate(a.promise_date)}
            </span>
          )}
          {a.kind === 'call' && a.recording_url && (
            <a href={a.recording_url} target="_blank" rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[11px] hover:underline" style={{ color: 'var(--mahogany)' }}>
              ▶ Recording
            </a>
          )}
        </div>
      </div>
    </div>
  );

  // Calls and WhatsApp link to the customer; imports link to Import Center
  if (a.kind === 'import') {
    return <Link href="/dashboard/import" className="block rounded-lg hover:bg-[rgba(127,85,57,0.05)] transition-colors">{inner}</Link>;
  }
  return (
    <Link href={`/dashboard/customers/${a.customer?.id}`} className="block rounded-lg hover:bg-[rgba(127,85,57,0.05)] transition-colors">
      {inner}
    </Link>
  );
}
