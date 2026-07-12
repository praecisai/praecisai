'use client';

import { useState, useEffect } from 'react';
import { useDashboardStats } from '../../lib/api/hooks';
import { TopHeader } from '../../components/layout/Sidebar';
import { formatINR, formatNumber, getAgingColor } from '../../lib/utils/format';
import { SegmentBadge } from '../../components/shared/SegmentBadge';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import {
  IndianRupee, Users, FileText, Megaphone,
  TrendingUp, AlertTriangle,
} from 'lucide-react';

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

const AGING_COLORS = ['#7F5539', '#9C6644', '#B08968', '#7F1D1D'];

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
  const isMobile = useIsMobile();

  const agingData = stats?.aging_buckets?.map((b, i) => ({
    name: b.range,
    amount: b.amount,
    count: b.count,
    color: AGING_COLORS[i],
  })) ?? [];

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

          {/* Aging Bucket Cards */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-3">
            {(stats?.aging_buckets ?? []).map((bucket, i) => (
              <div key={bucket.range} className="glass-card p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: AGING_COLORS[i] }} />
                  <span className="text-[11px] sm:text-xs text-[var(--walnut)] font-medium">{bucket.range} days</span>
                </div>
                <p className="text-base sm:text-lg font-bold text-[var(--dark-brown)]">{formatINR(bucket.amount)}</p>
                <p className="text-[11px] sm:text-xs text-[var(--walnut)]">{bucket.count} customers</p>
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
          {/* Aging Bar Chart */}
          <div className="glass-card p-4 sm:p-5">
            <p className="text-[10px] sm:text-xs font-semibold text-[var(--walnut)] uppercase tracking-wider mb-4">
              Aging Breakdown
            </p>
            {isLoading ? (
              <div className="skeleton h-40 w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={agingData} barSize={32}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#B08968' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#B08968' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-warm)', border: '1px solid var(--caramel)', borderRadius: '8px', fontSize: '12px', color: 'var(--dark-brown)' }}
                    formatter={(v: any) => [formatINR(v as number), 'Amount']}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {agingData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
