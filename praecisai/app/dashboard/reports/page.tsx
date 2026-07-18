'use client';

import { useState } from 'react';
import { useRecoveryReport, useDownloadRecoveryPdf, useSegmentOverview, useDownloadReportPdf } from '../../../lib/api/hooks';
import { TopHeader } from '../../../components/layout/Sidebar';
import { formatINR } from '../../../lib/utils/format';
import { Download, ThumbsUp, ThumbsDown, PhoneCall, Flame, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

// How each call outcome is decided (mirrors the backend rules): shown to the
// user in plain English so the reports are self-explanatory.
const RULES = [
  { label: 'Willing to Pay', detail: 'Customer acknowledged the amount and is willing to pay → Positive' },
  { label: 'Promised to Pay', detail: 'Gave a payment date. Up to 3 promises → Positive; 4 or more promises without paying → Negative' },
  { label: 'Refused to Pay', detail: 'Any refusal on the latest call → Negative immediately; each row shows the total refusals so far. A later promise or willingness moves them back out' },
  { label: 'Keeps Asking to Call Later', detail: 'More than 6 “call me later” in a row → Negative' },
  { label: 'Not Answering Calls', detail: 'More than 6 unanswered calls in a row → Negative' },
  { label: 'Unclear Response', detail: 'More than 6 unclear calls in a row → Negative' },
  { label: 'Disputed the Bill', detail: 'Every call first checks if the dispute got resolved. Resolved → normal follow-up continues; still disputing after more than 6 calls in a row → Negative' },
];

function formatDate(d: string | Date | null) {
  if (!d) return '-';
  const date = new Date(d);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function ReportTable({ entries, accent, showRefusals }: { entries: any[]; accent: string; showRefusals?: boolean }) {
  if (!entries?.length) {
    return (
      <p className="text-sm text-center py-10" style={{ color: 'var(--walnut)' }}>
        No customers fall into this report yet: it fills up as AI calls complete.
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
            {showRefusals && <th className="text-right">Refusals</th>}
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
              <td className="text-xs" style={{ color: 'var(--walnut)' }}>{e.agent ?? '-'}</td>
              <td className="text-right text-sm font-semibold" style={{ color: accent }}>{formatINR(e.total_due)}</td>
              <td className="text-right text-sm" style={{ color: 'var(--walnut)' }}>{e.total_calls}</td>
              {showRefusals && (
                <td className="text-right text-sm font-semibold" style={{ color: (e.refusal_count ?? 0) > 0 ? accent : 'var(--walnut)' }}>
                  {e.refusal_count ?? 0}
                </td>
              )}
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
  const { data: overview, isLoading: overviewLoading } = useSegmentOverview();
  const download = useDownloadRecoveryPdf();
  const downloadPdf = useDownloadReportPdf();
  const [tab, setTab] = useState<'positive' | 'negative'>('positive');

  const summary = data?.summary;
  const POSITIVE = '#2E7D32';
  const NEGATIVE = '#C62828';
  const ESCALATION = '#E65100';
  const OVERVIEW = '#7F5539';

  const escalationSeg = overview?.segments?.find((s: any) => s.segment === 'Escalation');

  const handleDownload = (type: 'positive' | 'negative') =>
    download.mutate(type, {
      onSuccess: () => toast.success(`${type === 'positive' ? 'Positive' : 'Negative'} report downloaded`),
      onError: (e: any) => toast.error('Download failed', { description: e.message }),
    });

  const handleExtraDownload = (path: string, filename: string, title: string) =>
    downloadPdf.mutate(
      { path, filename },
      {
        onSuccess: () => toast.success(`${title} downloaded`),
        onError: (e: any) => toast.error('Download failed', { description: e.message }),
      },
    );

  return (
    <div>
      <TopHeader title="Recovery Reports" subtitle="How customers are responding to AI calls" />

      <div className="p-4 sm:p-6 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            { type: 'positive' as const, icon: ThumbsUp, color: POSITIVE, title: 'Positive Report', desc: 'Customers responding well: willing to pay or promised a date', count: summary?.positive_count ?? 0, amount: summary?.positive_amount ?? 0 },
            { type: 'negative' as const, icon: ThumbsDown, color: NEGATIVE, title: 'Negative Report', desc: 'Customers the AI cannot recover: need your personal follow-up', count: summary?.negative_count ?? 0, amount: summary?.negative_amount ?? 0 },
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

          {/* Escalation parties report */}
          <div className="glass-card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${ESCALATION}15` }}>
                  <Flame size={17} style={{ color: ESCALATION }} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--dark-brown)' }}>Escalation Report</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--walnut)' }}>Every party in the Escalation range: oldest bills, call history</p>
                  <p className="text-lg font-bold mt-2" style={{ color: ESCALATION }}>
                    {overviewLoading ? '…' : `${escalationSeg?.count ?? 0} parties · ${formatINR(escalationSeg?.amount ?? 0)}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleExtraDownload('/reports/escalation/pdf', 'escalation-parties-report', 'Escalation report')}
                disabled={downloadPdf.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white flex-shrink-0 disabled:opacity-50 hover:opacity-90 transition-all"
                style={{ background: ESCALATION }}
              >
                <Download size={13} />
                PDF
              </button>
            </div>
          </div>

          {/* Segment overview report */}
          <div className="glass-card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${OVERVIEW}15` }}>
                  <LayoutGrid size={17} style={{ color: OVERVIEW }} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--dark-brown)' }}>Segment Overview</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--walnut)' }}>All segments in detail: counts, amounts and every party per segment</p>
                  <p className="text-lg font-bold mt-2" style={{ color: OVERVIEW }}>
                    {overviewLoading ? '…' : `${overview?.total_customers ?? 0} parties · ${formatINR(overview?.total_outstanding ?? 0)}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleExtraDownload('/reports/overview/pdf', 'segment-overview-report', 'Segment overview')}
                disabled={downloadPdf.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white flex-shrink-0 disabled:opacity-50 hover:opacity-90 transition-all"
                style={{ background: OVERVIEW }}
              >
                <Download size={13} />
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* Active report table */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4">
            <PhoneCall size={14} style={{ color: 'var(--walnut)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--dark-brown)' }}>
              {tab === 'positive' ? 'Positive' : 'Negative'} report
              {summary && `: based on ${summary.customers_with_calls} customer(s) with completed AI calls`}
            </p>
          </div>
          {/* Per-rule counts: how many customers each negative rule caught */}
          {tab === 'negative' && (summary?.negative_breakdown?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2 px-4 pt-3">
              {summary.negative_breakdown.map((b: any) => (
                <span
                  key={b.category}
                  className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                  style={{ background: 'rgba(198,40,40,0.08)', color: NEGATIVE, border: '1px solid rgba(198,40,40,0.25)' }}
                >
                  {b.category}: <b>{b.count}</b> · {formatINR(b.amount)}
                </span>
              ))}
            </div>
          )}
          <div className="p-2">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-6 w-full rounded" />)}
              </div>
            ) : (
              <ReportTable
                entries={tab === 'positive' ? data?.positive ?? [] : data?.negative ?? []}
                accent={tab === 'positive' ? POSITIVE : NEGATIVE}
                showRefusals={tab === 'negative'}
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
