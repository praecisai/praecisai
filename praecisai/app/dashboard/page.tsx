'use client';

import { useState, useEffect } from 'react';
import { useDashboardStats, useDashboardActivity } from '../../lib/api/hooks';
import { TopHeader } from '../../components/layout/Sidebar';
import { formatINR, formatNumber, formatDate } from '../../lib/utils/format';
import { SegmentBadge } from '../../components/shared/SegmentBadge';
import {
  Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import {
  IndianRupee, Users, FileText, Megaphone,
  TrendingUp, AlertTriangle, Phone, MessageCircle,
} from 'lucide-react';
import Link from 'next/link';

function MetricCard({
  title, value, sub, icon: Icon, color, loading,
}: {
  title: string; value: string; sub?: string;
  icon: React.ElementType; color: string; loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="glass-card p-4 sm:p-5 metric-card">
        <div className="skeleton h-4 w-24 mb-3" />
        <div className="skeleton h-8 w-32 mb-2" />
        <div className="skeleton h-3 w-20" />
      </div>
    );
  }

  return (
    <div className="glass-card p-3.5 sm:p-5 metric-card min-w-0">
      <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
        <p className="text-[10px] sm:text-xs font-semibold text-[var(--walnut)] uppercase tracking-wider min-w-0">{title}</p>
        <div className="p-1.5 sm:p-2 rounded-lg flex-shrink-0" style={{ background: `${color}18` }}>
          <Icon size={16} className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color }} strokeWidth={1.75} />
        </div>
      </div>
      <p className="text-base min-[400px]:text-lg sm:text-2xl font-bold text-[var(--dark-brown)] count-animation">{value}</p>
      {sub && <p className="text-[11px] sm:text-xs text-[var(--walnut)] mt-0.5 sm:mt-1">{sub}</p>}
    </div>
  );
}

const SEGMENT_CARD_COLORS: Record<string, string> = {
  'Soft Reminder': '#4A7C59',
  'Follow-up': '#B8860B',
  'Strong Follow-up': '#E65100',
  'Escalation': '#C62828',
};

// Below 640px the pie legend moves under the chart so the pie isn't squeezed.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: activity } = useDashboardActivity();
  const isMobile = useIsMobile();

  // Merged recent calls + WhatsApp sends, newest first
  const recentActions = [
    ...(activity?.recent_calls ?? []).map((c: any) => ({ ...c, kind: 'call' })),
    ...(activity?.recent_whatsapp ?? []).map((w: any) => ({ ...w, kind: 'whatsapp' })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const segmentData = stats?.segment_distribution?.filter((s) => s.count > 0).map((s) => ({
    name: s.segment,
    value: s.count,
  })) ?? [];

  const SEGMENT_COLORS = ['#7F5539', '#B08968', '#9C6644', '#7F1D1D', '#4A7C59', '#DDB892'];

  return (
    <div>
      <TopHeader title="Dashboard" subtitle="Your accounts receivable overview" />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            title="Total Outstanding"
            value={isLoading ? '...' : formatINR(stats?.total_outstanding ?? 0)}
            sub="Active receivables"
            icon={IndianRupee}
            color="#7F5539"
            loading={isLoading}
          />
          <MetricCard
            title="Total Customers"
            value={isLoading ? '...' : formatNumber(stats?.total_customers ?? 0)}
            sub="Across all segments"
            icon={Users}
            color="#9C6644"
            loading={isLoading}
          />
          <MetricCard
            title="Total Invoices"
            value={isLoading ? '...' : formatNumber(stats?.total_invoices ?? 0)}
            sub="All time"
            icon={FileText}
            color="#4A7C59"
            loading={isLoading}
          />
          <MetricCard
            title="Active Campaigns"
            value={isLoading ? '...' : String(stats?.active_campaigns ?? 0)}
            sub="Running + scheduled"
            icon={Megaphone}
            color="#DDB892"
            loading={isLoading}
          />
        </div>

        {/* Recovery Rate + Aging Buckets Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recovery Rate */}
          <div className="glass-card p-4 sm:p-5">
            <p className="text-[10px] sm:text-xs font-semibold text-[var(--walnut)] uppercase tracking-wider mb-3 sm:mb-4">Recovery Rate</p>
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                <svg viewBox="0 0 36 36" className="w-16 h-16 sm:w-20 sm:h-20 -rotate-90">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="rgba(221,184,146,0.4)" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="#4A7C59" strokeWidth="3"
                    strokeDasharray={`${stats?.recovery_rate ?? 0}, 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-base sm:text-lg font-bold text-[var(--dark-brown)]">{stats?.recovery_rate ?? 0}%</span>
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-[var(--dark-brown)]">{stats?.recovery_rate ?? 0}%</p>
                <p className="text-[11px] sm:text-xs text-[var(--walnut)]">Collections rate</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp size={12} className="text-[var(--recovery-green)]" strokeWidth={1.75} />
                  <span className="text-xs text-[var(--recovery-green)]">Tracking enabled</span>
                </div>
              </div>
            </div>
          </div>

          {/* Segment Cards */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-3">
            {(stats?.segment_distribution ?? []).filter((sd) => Object.hasOwn(SEGMENT_CARD_COLORS, sd.segment)).map((sd) => (
              <div key={sd.segment} className="glass-card p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: SEGMENT_CARD_COLORS[sd.segment] }} />
                  <span className="text-[11px] sm:text-xs text-[var(--walnut)] font-medium">{sd.segment}</span>
                </div>
                <p className="text-base sm:text-lg font-bold text-[var(--dark-brown)]">{formatINR(sd.amount)}</p>
                <p className="text-[11px] sm:text-xs text-[var(--walnut)]">{sd.count} customers</p>
              </div>
            ))}
            {isLoading && [1,2,3,4].map(i => (
              <div key={i} className="glass-card p-4">
                <div className="skeleton h-3 w-16 mb-2" />
                <div className="skeleton h-6 w-24 mb-1" />
                <div className="skeleton h-3 w-14" />
              </div>
            ))}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Activity — AI calls + WhatsApp sends */}
          <div className="glass-card p-4 sm:p-5">
            <p className="text-[10px] sm:text-xs font-semibold text-[var(--walnut)] uppercase tracking-wider mb-4">
              Recent Activity
            </p>
            {recentActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-[var(--walnut)]">
                <Phone size={22} className="mb-2" strokeWidth={1.75} />
                <p className="text-sm text-center">No calls or WhatsApp messages yet.<br />Start from the Outstandings page.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {recentActions.map((a: any) => (
                  <div key={`${a.kind}-${a.id}`} className="flex items-start gap-2.5 pb-2.5 border-b last:border-0" style={{ borderColor: 'rgba(221,184,146,0.35)' }}>
                    <div className="p-1.5 rounded-lg flex-shrink-0 mt-0.5" style={{ background: a.kind === 'call' ? 'rgba(127,85,57,0.12)' : 'rgba(74,124,89,0.12)' }}>
                      {a.kind === 'call'
                        ? <Phone size={12} style={{ color: 'var(--mahogany)' }} />
                        : <MessageCircle size={12} style={{ color: 'var(--recovery-green)' }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <Link href={`/dashboard/customers/${a.customer?.id}`} className="text-sm font-medium text-[var(--dark-brown)] hover:text-[var(--mahogany)] truncate">
                          {a.customer?.customer_name ?? '—'}
                        </Link>
                        <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--walnut)' }}>{formatDate(a.created_at)}</span>
                      </div>
                      <p className="text-xs truncate" style={{ color: 'var(--walnut)' }}>
                        {a.kind === 'call'
                          ? `${a.call_status}${a.disposition ? ` · ${a.disposition}` : ''}${a.call_summary ? ` — ${a.call_summary}` : ''}`
                          : `${a.delivery_status} · ${a.message}`}
                      </p>
                      {a.kind === 'call' && a.promise_date && (
                        <p className="text-[11px] font-medium" style={{ color: 'var(--recovery-green)' }}>Promised {formatDate(a.promise_date)}</p>
                      )}
                      {a.kind === 'call' && a.next_call_at && (
                        <p className="text-[11px] font-medium" style={{ color: '#B8860B' }}>
                          Next call {new Date(a.next_call_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Segment Pie Chart */}
          <div className="glass-card p-4 sm:p-5">
            <p className="text-[10px] sm:text-xs font-semibold text-[var(--walnut)] uppercase tracking-wider mb-4">
              Segment Distribution
            </p>
            {isLoading ? (
              <div className="skeleton h-40 w-full rounded-lg" />
            ) : segmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={isMobile ? 220 : 180}>
                <PieChart>
                  <Pie data={segmentData} cx={isMobile ? '50%' : '40%'} cy={isMobile ? '42%' : '50%'} outerRadius={isMobile ? 60 : 70} dataKey="value" paddingAngle={2}>
                    {segmentData.map((_, i) => (
                      <Cell key={i} fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    layout={isMobile ? 'horizontal' : 'vertical'}
                    align={isMobile ? 'center' : 'right'}
                    verticalAlign={isMobile ? 'bottom' : 'middle'}
                    formatter={(v) => <span style={{ fontSize: '11px', color: 'var(--walnut)' }}>{v}</span>}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-warm)', border: '1px solid var(--caramel)', borderRadius: '8px', fontSize: '12px', color: 'var(--dark-brown)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-[var(--walnut)]">
                <AlertTriangle size={24} className="mb-2" strokeWidth={1.75} />
                <p className="text-sm">No data yet. Import your first file</p>
              </div>
            )}
          </div>
        </div>

        {/* Segment summary list */}
        {!isLoading && (stats?.segment_distribution?.length ?? 0) > 0 && (
          <div className="glass-card p-4 sm:p-5">
            <p className="text-[10px] sm:text-xs font-semibold text-[var(--walnut)] uppercase tracking-wider mb-4">
              All Segments
            </p>
            <div className="space-y-2">
              {stats?.segment_distribution?.filter(s => s.count > 0).map((s) => (
                <div key={s.segment} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'rgba(221,184,146,0.35)' }}>
                  <div className="flex items-center gap-3">
                    <SegmentBadge segment={s.segment} />
                    <span className="text-sm text-[var(--dark-brown)]">{s.count} customers</span>
                  </div>
                  <span className="text-sm font-semibold text-[var(--dark-brown)]">{formatINR(s.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
