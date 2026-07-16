'use client';

import { useState } from 'react';
import { useRecoveryReport, useDownloadRecoveryPdf } from '../../../lib/api/hooks';
import { TopHeader } from '../../../components/layout/Sidebar';
import { formatINR } from '../../../lib/utils/format';
import { Download, ThumbsUp, ThumbsDown, PhoneCall } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

// How each call outcome is decided (mirrors the backend rules) — shown to the
// user in plain English so the reports are self-explanatory.
const RULES = [
  { label: 'Willing to Pay', detail: 'Customer acknowledged the amount and is willing to pay → Positive' },
  { label: 'Promised to Pay', detail: 'Gave a payment date. Up to 3 promises → Positive; 4 or more promises without paying → Negative' },
  { label: 'Refused to Pay', detail: 'More than 6 refusals in a row → Negative' },
  { label: 'Keeps Asking to Call Later', detail: 'More than 6 “call me later” in a row → Negative' },
  { label: 'Not Answering Calls', detail: 'More than 6 unanswered calls in a row → Negative' },
  { label: 'Unclear Response', detail: 'More than 6 unclear calls in a row → Negative' },
  { label: 'Disputed the Bill', detail: 'Kept out of both reports for now — handled separately' },
];

function formatDate(d: string | Date | null) {
  if (!d) return '—';
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function ReportTable({ entries, accent }: { entries: any[]; accent: string }) {
  if (!entries?.length) {
    return (
      <p className="text-sm text-center py-10" style={{ color: 'var(--walnut)' }}>
        No customers fall into this report yet — it fills up as AI calls complete.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="data-table w-full min-w-[820px]">
        <thead>
          <tr>
            <th className="text-left">Customer</th>
            <th className="text-left">Agent</th>
            <th className="text-right">Total Due</th>
            <th className="text-right">Calls</th>
            <th className="text-left">Last Call</th>
            <th className="text-left">Status</th>
            <th className="text-left">Why</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e: any) => (
            <tr key={e.customer_id}>
              <td>
                <Link href={`/dashboard/customers/${e.customer_id}`} className="text-sm font-medium text-[var(--dark-brown)] hover:text-[var(--mahogany)] transition-colors">
                  {e.customer_name}
                </Link>
                {e.city && <p className="text-[11px]" style={{ color: 'var(--walnut)' }}>{e.city}</p>}
              </td>
              <td className="text-xs" style={{ color: 'var(--walnut)' }}>{e.agent ?? '—'}</td>
              <td className="text-right text-sm font-semibold" style={{ color: accent }}>{formatINR(e.total_due)}</td>
              <td className="text-right text-sm" style={{ color: 'var(--walnut)' }}>{e.total_calls}</td>
              <td className="text-xs" style={{ color: 'var(--walnut)' }}>{formatDate(e.last_call_at)}</td>
              <td>
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                  style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}40` }}
                >
                  {e.label}
                </span>
              </td>
              <td className="text-xs" style={{ color: 'var(--dark-brown)' }}>{e.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPage() {
  const { data, isLoading } = useRecoveryReport();
  const download = useDownloadRecoveryPdf();
  const [tab, setTab] = useState<'positive' | 'negative'>('positive');

  const summary = data?.summary;
  const POSITIVE = '#2E7D32';
  const NEGATIVE = '#C62828';

  const handleDownload = (type: 'positive' | 'negative') =>
    download.mutate(type, {
      onSuccess: () => toast.success(`${type === 'positive' ? 'Positive' : 'Negative'} report downloaded`),
      onError: (e: any) => toast.error('Download failed', { description: e.message }),
    });

  return (
    <div>
      <TopHeader title="Recovery Reports" subtitle="How customers are responding to AI calls" />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            { type: 'positive' as const, icon: ThumbsUp, color: POSITIVE, title: 'Positive Report', desc: 'Customers responding well — willing to pay or promised a date', count: summary?.positive_count ?? 0, amount: summary?.positive_amount ?? 0 },
            { type: 'negative' as const, icon: ThumbsDown, color: NEGATIVE, title: 'Negative Report', desc: 'Customers the AI cannot recover — need your personal follow-up', count: summary?.negative_count ?? 0, amount: summary?.negative_amount ?? 0 },
          ]).map(({ type, icon: Icon, color, title, desc, count, amount }) => (
            <div
              key={type}
              className={`glass-card p-4 sm:p-5 text-left transition-all cursor-pointer ${tab === type ? 'ring-1' : ''}`}
              style={tab === type ? ({ ['--tw-ring-color' as any]: color } as any) : undefined}
              onClick={() => setTab(type)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                    <Icon size={17} style={{ color }} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm" style={{ color: 'var(--dark-brown)' }}>{title}</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--walnut)' }}>{desc}</p>
                    <p className="text-lg font-bold mt-2" style={{ color }}>
                      {isLoading ? '…' : `${count} customers · ${formatINR(amount)}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(type); }}
                  disabled={download.isPending || isLoading}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white flex-shrink-0 disabled:opacity-50 hover:opacity-90 transition-all"
                  style={{ background: color }}
                >
                  <Download size={13} />
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Active report table */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4">
            <PhoneCall size={14} style={{ color: 'var(--walnut)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--dark-brown)' }}>
              {tab === 'positive' ? 'Positive' : 'Negative'} report
              {summary && ` — based on ${summary.customers_with_calls} customer(s) with completed AI calls`}
            </p>
          </div>
          <div className="p-2">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-6 w-full rounded" />)}
              </div>
            ) : (
              <ReportTable
                entries={tab === 'positive' ? data?.positive ?? [] : data?.negative ?? []}
                accent={tab === 'positive' ? POSITIVE : NEGATIVE}
              />
            )}
          </div>
        </div>

        {/* How it works */}
        <div className="glass-card p-4 sm:p-5">
          <p className="font-semibold text-sm mb-3" style={{ color: 'var(--dark-brown)' }}>How customers are classified</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {RULES.map((r) => (
              <div key={r.label} className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: 'var(--sand)' }}>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--mahogany)' }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--dark-brown)' }}>{r.label}</p>
                  <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--walnut)' }}>{r.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
